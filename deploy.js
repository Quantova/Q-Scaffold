// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { core } from "@quantovainc/qcore";
import { Gateway, hasRoster, height, printable, readGuardedFile, readSeedFile, requireRosters, rosterKnown, sessionPath, transactionId } from "./client.js";

const COMPILED_PATH = process.env.COMPILED_CONTRACT_PATH || "./build/ExampleQAsset.json";
const CONTRACT_NAME = process.env.QUANTOVA_CONTRACT_NAME || "QAsset";
const INITIAL_SUPPLY = process.env.QUANTOVA_INITIAL_SUPPLY || "1000000000000";
const MAX_FEE_QUON = process.env.QUANTOVA_MAX_FEE_QUON || "20000000";
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CONTEXT_BYTES = 120;
const DEPLOY_BYTE_METER = 100;
const GENESIS_METER = 3_000_000;
const MAX_METER = 12_500_000;
const MAX_EVENTS = 4096;
const SESSION_MAX = 1024 * 1024;
const U64_MAX = (1n << 64n) - 1n;
const U128_MAX = (1n << 128n) - 1n;
const DEPLOYED_EVENT = "Deployed(Q_Address,u128)";
const OPTIONS = new Set(["--accept-unconfirmed", "--redeploy"]);
const UNCONFIRMED_EXIT = 3;
const EARLIER_NONCES = 64;

class Unconfirmed extends Error {}

class Unsigned extends Error {}

function wholeNumber(text, label, max) {
  if (typeof text !== "string" || !/^(0|[1-9][0-9]*)$/.test(text)) throw new Error(`${label} must be a whole number written in decimal digits`);
  const value = BigInt(text);
  if (value > max) throw new Error(`${label} is too large`);
  return value;
}

function options() {
  const given = process.argv.slice(2);
  for (const arg of given) if (!OPTIONS.has(arg)) throw new Error(`unknown option ${printable(arg)}, the options are --accept-unconfirmed and --redeploy`);
  return {
    acceptUnconfirmed: given.includes("--accept-unconfirmed") || process.env.QUANTOVA_ACCEPT_UNCONFIRMED === "1",
    redeploy: given.includes("--redeploy"),
  };
}

function readSeed(file) {
  if (!file) throw new Error("Set QUANTOVA_DEPLOYER_KEY_FILE to a file holding the deployer key, funded with TQTOV from the faucet.");
  return readSeedFile(file);
}

function loadCompiled(file, name) {
  if (!fs.existsSync(file)) {
    throw new Error(`Compiled contract not found at ${printable(file)}. Compile ExampleQAsset.quanta with the Quanta compiler first. See deploying.md.`);
  }
  const emitted = JSON.parse(fs.readFileSync(file, "utf8"));
  const contract = emitted && emitted.ok === true && Array.isArray(emitted.contracts) ? emitted.contracts.find((c) => c.name === name) : null;
  if (!contract) throw new Error(`${printable(file)} holds no compiled contract named ${printable(name)}`);
  if (typeof contract.container !== "string" || !/^([0-9a-f]{2})+$/.test(contract.container)) throw new Error("the compiled container is not hex");
  if (!Array.isArray(contract.deploy_params)) throw new Error("the compiled contract does not list its deploy parameters");
  return contract;
}

function addressBytes(address) {
  if (!core.valid_address(address)) throw new Error(`${printable(address)} is not a Q1 address`);
  const text = address.toLowerCase();
  const values = [...text.slice(text.lastIndexOf("1") + 1, -6)].map((c) => CHARSET.indexOf(c));
  const out = [];
  let acc = 0;
  let bits = 0;
  for (const v of values) {
    acc = ((acc << 5) | v) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  if (out.length !== 32) throw new Error(`${printable(address)} does not carry a 32 byte account id`);
  return Buffer.from(out);
}

function word(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64BE(value);
  return out;
}

function encodeParam(slot, raw) {
  if (slot.width === 32) return addressBytes(raw);
  if (slot.width === 16) {
    const value = wholeNumber(raw, slot.key, U128_MAX);
    return Buffer.concat([word(value & U64_MAX), word(value >> 64n)]);
  }
  if (slot.width === 8) return word(wholeNumber(raw, slot.key, U64_MAX));
  throw new Error(`the deploy parameter ${printable(slot.key)} has a width this script does not encode`);
}

function deployArgs(contract, values) {
  const container = Buffer.from(contract.container, "hex");
  const head = Buffer.alloc(12);
  head.write("QDEPLOY2", 0, "ascii");
  head.writeUInt32BE(container.length, 8);
  if (contract.deploy_params.length === 0) return Buffer.concat([head, container]).toString("hex");
  let end = CONTEXT_BYTES;
  for (const slot of contract.deploy_params) end = Math.max(end, slot.offset + slot.width);
  const memory = Buffer.alloc(end);
  for (const slot of contract.deploy_params) {
    if (!Number.isSafeInteger(slot.offset) || slot.offset < CONTEXT_BYTES) throw new Error(`the deploy parameter ${printable(slot.key)} overlaps the call context`);
    if (!Object.hasOwn(values, slot.key)) throw new Error(`the contract asks for ${printable(slot.key)}, which this script does not set`);
    encodeParam(slot, values[slot.key]).copy(memory, slot.offset);
  }
  return Buffer.concat([head, container, memory.subarray(CONTEXT_BYTES), Buffer.from("QGENSNTL", "ascii")]).toString("hex");
}

function deployedEvent(contract, owner) {
  const declared = Array.isArray(contract.events) ? contract.events.find((e) => e && e.signature === DEPLOYED_EVENT) : null;
  if (!declared || typeof declared.selector !== "string" || !/^[0-9a-f]{8}$/.test(declared.selector)) return null;
  const supply = wholeNumber(INITIAL_SUPPLY, "QUANTOVA_INITIAL_SUPPLY", U128_MAX);
  const data = Buffer.concat([addressBytes(owner), word(supply & U64_MAX), word(supply >> 64n)]).toString("hex");
  return { selector: declared.selector, data };
}

function writeDurable(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${crypto.randomBytes(12).toString("hex")}.tmp`;
  const fd = fs.openSync(tmp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
  try {
    try {
      fs.writeSync(fd, text);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  const dir = fs.openSync(path.dirname(file), "r");
  try {
    fs.fsyncSync(dir);
  } finally {
    fs.closeSync(dir);
  }
}

function readSession(file, expected) {
  let text;
  try {
    text = readGuardedFile(file, "deploy session file", SESSION_MAX);
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    throw err;
  }
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    record = null;
  }
  const valid = record && typeof record === "object" && record.version === 2 && ["prepared", "sent", "accepted"].includes(record.state) &&
    typeof record.nonce === "string" && /^(0|[1-9][0-9]{0,19})$/.test(record.nonce) && typeof record.address === "string" &&
    (record.tx === null || (typeof record.tx === "string" && /^QTX1[0-9A-Z]{58}$/.test(record.tx)));
  if (!valid) throw new Error(`the deploy session file ${printable(file)} is damaged, check it before deploying again`);
  for (const key of ["chain", "genesis", "owner", "container"]) {
    if (record[key] !== expected[key]) throw new Error(`the deploy session file ${printable(file)} belongs to another deployment, check it before deploying again`);
  }
  if (record.address !== core.contractAddress(expected.owner, BigInt(record.nonce))) {
    throw new Error(`the deploy session file ${printable(file)} names an address this deployer does not reach at its nonce, check it before deploying again`);
  }
  return record;
}

async function proveEvent(gateway, proof, address, expected) {
  const at = Number(proof.height);
  const root = proof.header && proof.header.event_root;
  if (typeof root !== "string") throw new Error("the finalized header carries no event root");
  let count = null;
  for (let index = 0; count === null || index < count; index += 1) {
    const step = await gateway.getEventProof(at, index);
    if (!step || step.height !== at || step.index !== index) throw new Error(`the gateway answered with another event than event ${index} of block ${at}`);
    if (count === null) {
      if (!Number.isSafeInteger(step.event_count) || step.event_count < 1 || step.event_count > MAX_EVENTS) throw new Error(`the gateway reported an event count for block ${at} that is out of range`);
      count = step.event_count;
    }
    if (typeof step.leaf !== "string" || !Array.isArray(step.steps) || !core.verifyEvent(root, step.leaf, JSON.stringify(step.steps))) {
      throw new Error(`event ${index} of block ${at} is not proven under the certified event root`);
    }
    const event = JSON.parse(core.decodeEvent(step.leaf));
    if (String(event.contract).toUpperCase() !== address.toUpperCase() || event.selector !== expected.selector) continue;
    if (event.data !== expected.data) throw new Error(`the Deployed event of ${address} in block ${at} names another owner or initial supply`);
    return index;
  }
  throw new Error(`no Deployed event of ${address} is proven in block ${at}`);
}

async function settle(gateway, txId, address, contract, expected) {
  const tx = await gateway.waitForTransaction(txId);
  const deployed = await gateway.containerAt(address);
  console.log("container address", address, deployed === contract.container ? "holds the compiled container" : "holds no container yet");
  if (deployed && deployed !== contract.container) throw new Error("the deployed container differs from the compiled one");
  const pin = gateway.finalityPin();
  if (!hasRoster(pin)) throw new Unconfirmed("no validator roster is pinned, so the finality of the deployment could not be proven");
  if (!rosterKnown(pin, tx.height)) throw new Unconfirmed(`the finality pin holds no validator roster for the epoch of block ${tx.height}, so the finality of the deployment could not be proven`);
  const proof = await gateway.confirm(txId, tx.height);
  if (!expected) throw new Unconfirmed(`the deployment is final at height ${proof.height}, but the contract declares no ${DEPLOYED_EVENT} event, so its execution could not be proven`);
  const index = await proveEvent(gateway, proof, address, expected);
  console.log(`The deployment is final at height ${proof.height}, proven against the pinned genesis hash and validator roster, and event ${index} of that block proves the contract at ${address} ran its genesis with the owner and initial supply of this deploy. It is settled.`);
}

async function earlierDeployment(gateway, owner, contract, below) {
  const first = below > BigInt(EARLIER_NONCES) ? below - BigInt(EARLIER_NONCES) : 0n;
  for (let n = below - 1n; n >= first; n -= 1n) {
    const address = core.contractAddress(owner, n);
    if ((await gateway.containerAt(address)) === contract.container) return { address, nonce: n };
  }
  return null;
}

async function main(held, opts) {
  const gateway = new Gateway(process.env.QUANTOVA_GATEWAY);
  wholeNumber(MAX_FEE_QUON, "QUANTOVA_MAX_FEE_QUON", U64_MAX);
  wholeNumber(INITIAL_SUPPLY, "QUANTOVA_INITIAL_SUPPLY", U128_MAX);
  const contract = loadCompiled(COMPILED_PATH, CONTRACT_NAME);
  const seed = readSeed(process.env.QUANTOVA_DEPLOYER_KEY_FILE);
  held.push(seed);
  const info = await gateway.nodeInfo();
  const head = height(info.head_height, "head height");
  const submitting = process.env.QUANTOVA_SUBMIT === "yes";
  const pin = gateway.finalityPin();
  if (submitting) gateway.requireSigning();
  if (!opts.acceptUnconfirmed) requireRosters(pin, head);
  console.log(`Deploying to chain ${printable(gateway.chainId)} at head ${head}`);
  const owner = gateway.client.address(seed, 0);
  const args = deployArgs(contract, { "deploy_params.owner": owner, "deploy_params.initial_supply": INITIAL_SUPPLY });
  const expected = deployedEvent(contract, owner);
  const meter = Math.min(MAX_METER, (contract.container.length / 2) * DEPLOY_BYTE_METER + GENESIS_METER);
  const fee = core.vmCallFee(String(info.fee && info.fee.transfer_quon), meter);
  const containerHash = crypto.createHash("sha3-256").update(Buffer.from(contract.container, "hex")).digest("hex");
  const identity = { chain: gateway.chainId, genesis: /^[0-9a-f]{64}$/.test(info.genesis_hash) ? info.genesis_hash : "unknown", owner, container: containerHash };
  const file = sessionPath(gateway.chainId, owner, containerHash);
  let record = readSession(file, identity);
  if (record && (record.state === "prepared" || opts.redeploy)) record = null;
  const account = await gateway.getAccount(owner);
  const registers = account.has_key === false;

  console.log(`Deployer ${owner}`);
  console.log(`Container ${contract.container.length / 2} bytes, owner ${owner}, initial supply ${INITIAL_SUPPLY} Quon`);
  console.log(`Meter limit ${meter}, fee ${fee} Quon, your fee ceiling ${MAX_FEE_QUON} Quon`);
  if (!submitting) {
    if (record) {
      console.log(`An earlier run sent this deployment at nonce ${record.nonce} to ${record.address}. A submitted run checks that address first and signs again only when nothing landed at that nonce.`);
      console.log("\nNothing was signed. Set QUANTOVA_SUBMIT=yes to continue it, or pass --redeploy to deploy another copy. See deploying.md.");
      return;
    }
    const current = gateway.accountNonce(account);
    const deployNonce = registers ? current + 1n : current;
    if (registers) {
      console.log(`The deployer key is not registered yet, so a registration is signed first at nonce ${current} and the deployment follows at nonce ${deployNonce}.`);
    }
    console.log(`Predicted container address ${core.contractAddress(owner, deployNonce)}`);
    if (!hasRoster(pin)) console.log("No validator roster is pinned, so a submitted run refuses to sign unless you pass --accept-unconfirmed.");
    console.log("\nNothing was signed. Set QUANTOVA_SUBMIT=yes to sign and submit this deployment. See deploying.md.");
    return;
  }
  if (!hasRoster(pin) && !opts.acceptUnconfirmed) {
    throw new Unsigned("no validator roster is pinned, so the finality of this deployment could not be proven and nothing was signed");
  }

  const save = (patch) => {
    record = Object.assign({ version: 2 }, identity, record, patch);
    writeDurable(file, JSON.stringify(record, null, 2) + "\n");
  };

  let deployNonce;
  if (record) {
    if (record.tx) {
      let known = null;
      try {
        known = await gateway.getTransaction(record.tx);
      } catch {
        known = null;
      }
      if (known && known.tx_id === record.tx && (known.status === "pending" || known.status === "finalised")) await gateway.waitForTransaction(record.tx);
    }
    const onChain = await gateway.containerAt(record.address);
    if (onChain === contract.container) {
      console.log(`An earlier run already deployed this container at ${record.address}, nothing was signed. Pass --redeploy to deploy another copy.`);
      if (!record.tx) throw new Unconfirmed("the transaction of that deployment was not saved, so its finality could not be proven");
      await settle(gateway, record.tx, record.address, contract, expected);
      return;
    }
    if (onChain) throw new Error(`the contract at ${record.address} differs from the compiled one`);
    const now = gateway.accountNonce(account);
    if (registers || now !== BigInt(record.nonce)) {
      throw new Error(`an earlier run sent this deployment at nonce ${record.nonce}, the account is now at nonce ${now} and ${record.address} holds no contract. Check that transaction by hand, or pass --redeploy to deploy at the current nonce.`);
    }
    deployNonce = now;
  } else {
    let current = account;
    if (registers) {
      const { signed, outcome } = await gateway.client.register(seed, 0, MAX_FEE_QUON);
      if (!outcome || outcome.verdict !== "accepted") throw new Error(`registering the deployer key was refused, ${printable(outcome && outcome.reason)}`);
      await gateway.waitForTransaction(outcome.tx_id || signed.tx_id);
      current = await gateway.getAccount(owner);
      if (current.has_key !== true) throw new Error("the deployer key is not on chain after registering it");
    }
    deployNonce = gateway.accountNonce(current);
    if (!opts.redeploy) {
      const earlier = await earlierDeployment(gateway, owner, contract, deployNonce);
      if (earlier) {
        throw new Error(`this deployer already deployed this container at ${earlier.address}, at nonce ${earlier.nonce}, nothing was signed. Pass --redeploy to deploy another copy.`);
      }
    }
  }

  const predicted = core.contractAddress(owner, deployNonce);
  console.log(`Predicted container address ${predicted}`);
  if (!record) save({ state: "prepared", nonce: String(deployNonce), address: predicted, tx: null });
  const signer = new Gateway(process.env.QUANTOVA_GATEWAY, { onSubmit: (txHex) => save({ state: "sent", tx: transactionId(txHex) }) });
  const { signed, outcome } = await signer.client.payableCall(seed, 0, core.vmDeployAddress(), args, "0", meter, MAX_FEE_QUON, deployNonce);
  if (!outcome || outcome.verdict !== "accepted") throw new Error(`the deployment was refused, ${printable(outcome && outcome.reason)}`);
  const txId = signed.tx_id;
  if (record.tx !== txId) throw new Error(`the signed deployment ${txId} is not the transaction recorded before it was sent, check ${printable(file)}`);
  if (outcome.tx_id !== undefined && outcome.tx_id !== txId) {
    throw new Error(`the gateway named transaction ${printable(outcome.tx_id)} for the deployment signed as ${txId}, check it before deploying again`);
  }
  save({ state: "accepted" });
  console.log("submitted", txId);
  await settle(gateway, txId, predicted, contract, expected);
}

const held = [];
let opts;
try {
  opts = options();
} catch (err) {
  console.error("deploy failed", printable(err && err.message, 600));
  process.exit(1);
}
main(held, opts)
  .then(() => held.forEach((s) => s.fill(0)))
  .catch((err) => {
    held.forEach((s) => s.fill(0));
    if (err instanceof Unsigned) {
      console.error(`NOT SIGNED. ${printable(err.message, 600)}. Pin a validator roster, or pass --accept-unconfirmed to sign anyway.`);
      process.exit(UNCONFIRMED_EXIT);
    }
    if (err instanceof Unconfirmed) {
      if (opts.acceptUnconfirmed) {
        console.log(`NOT CONFIRMED, accepted because --accept-unconfirmed was given. ${printable(err.message, 600)}`);
        return;
      }
      console.error(`NOT CONFIRMED. ${printable(err.message, 600)}. Pass --accept-unconfirmed to accept an unconfirmed deployment.`);
      process.exit(UNCONFIRMED_EXIT);
    }
    console.error("deploy failed", printable(err && err.message, 600));
    process.exit(1);
  });
