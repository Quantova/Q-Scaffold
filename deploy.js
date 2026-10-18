// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

import fs from "node:fs";
import { core } from "@quantovainc/qcore";
import { Gateway } from "./client.js";

const COMPILED_PATH = process.env.COMPILED_CONTRACT_PATH || "./build/ExampleQAsset.json";
const CONTRACT_NAME = process.env.QUANTOVA_CONTRACT_NAME || "QAsset";
const INITIAL_SUPPLY = process.env.QUANTOVA_INITIAL_SUPPLY || "1000000000000";
const MAX_FEE_QUON = process.env.QUANTOVA_MAX_FEE_QUON || "20000000";
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CONTEXT_BYTES = 120;
const DEPLOY_BYTE_METER = 100;
const GENESIS_METER = 3_000_000;
const MAX_METER = 12_500_000;
const U64_MAX = (1n << 64n) - 1n;
const U128_MAX = (1n << 128n) - 1n;

function wholeNumber(text, label, max) {
  if (typeof text !== "string" || !/^(0|[1-9][0-9]*)$/.test(text)) throw new Error(`${label} must be a whole number written in decimal digits`);
  const value = BigInt(text);
  if (value > max) throw new Error(`${label} is too large`);
  return value;
}

function readSeed(file) {
  if (!file) throw new Error("Set QUANTOVA_DEPLOYER_KEY_FILE to a file holding a testnet key funded from the faucet.");
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || (stat.mode & 0o077) !== 0) throw new Error("The deployer key file must be a regular file readable only by its owner, chmod 600.");
  const text = fs.readFileSync(file, "utf8").trim();
  if (!/^[0-9a-f]{64}$/.test(text)) throw new Error("The deployer key file holds the 32 byte seed as 64 lowercase hex characters.");
  return Uint8Array.from(Buffer.from(text, "hex"));
}

function loadCompiled(file, name) {
  if (!fs.existsSync(file)) {
    throw new Error(`Compiled contract not found at ${file}. Compile ExampleQAsset.quanta with the Quanta compiler first. See deploying.md.`);
  }
  const emitted = JSON.parse(fs.readFileSync(file, "utf8"));
  const contract = emitted && emitted.ok === true && Array.isArray(emitted.contracts) ? emitted.contracts.find((c) => c.name === name) : null;
  if (!contract) throw new Error(`${file} holds no compiled contract named ${name}`);
  if (typeof contract.container !== "string" || !/^([0-9a-f]{2})+$/.test(contract.container)) throw new Error("the compiled container is not hex");
  if (!Array.isArray(contract.deploy_params)) throw new Error("the compiled contract does not list its deploy parameters");
  return contract;
}

function addressBytes(address) {
  if (!core.valid_address(address)) throw new Error(`${address} is not a Q1 address`);
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
  if (out.length !== 32) throw new Error(`${address} does not carry a 32 byte account id`);
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
  throw new Error(`the deploy parameter ${slot.key} has a width this script does not encode`);
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
    if (!Number.isSafeInteger(slot.offset) || slot.offset < CONTEXT_BYTES) throw new Error(`the deploy parameter ${slot.key} overlaps the call context`);
    if (!Object.hasOwn(values, slot.key)) throw new Error(`the contract asks for ${slot.key}, which this script does not set`);
    encodeParam(slot, values[slot.key]).copy(memory, slot.offset);
  }
  return Buffer.concat([head, container, memory.subarray(CONTEXT_BYTES), Buffer.from("QGENSNTL", "ascii")]).toString("hex");
}

async function main() {
  const gateway = new Gateway(process.env.QUANTOVA_GATEWAY);
  const info = await gateway.nodeInfo();
  console.log(`Deploying to chain ${info.chain_id} at head ${info.head_height}`);
  wholeNumber(MAX_FEE_QUON, "QUANTOVA_MAX_FEE_QUON", U64_MAX);

  const contract = loadCompiled(COMPILED_PATH, CONTRACT_NAME);
  const seed = readSeed(process.env.QUANTOVA_DEPLOYER_KEY_FILE);
  try {
    const owner = gateway.client.address(seed, 0);
    const args = deployArgs(contract, { "deploy_params.owner": owner, "deploy_params.initial_supply": INITIAL_SUPPLY });
    const meter = Math.min(MAX_METER, (contract.container.length / 2) * DEPLOY_BYTE_METER + GENESIS_METER);
    const fee = core.vmCallFee(String(info.fee && info.fee.transfer_quon), meter);
    const account = await gateway.getAccount(owner);

    console.log(`Deployer ${owner}`);
    console.log(`Container ${contract.container.length / 2} bytes, owner ${owner}, initial supply ${INITIAL_SUPPLY} Quon`);
    console.log(`Meter limit ${meter}, fee ${fee} Quon, your fee ceiling ${MAX_FEE_QUON} Quon`);
    if (process.env.QUANTOVA_SUBMIT !== "yes") {
      console.log(`Predicted container address ${core.contractAddress(owner, await gateway.nonce(owner))}`);
      console.log("\nNothing was signed. Set QUANTOVA_SUBMIT=yes to sign and submit this deployment. See deploying.md.");
      return;
    }

    if (account.has_key === false) {
      const { outcome } = await gateway.client.register(seed, 0, MAX_FEE_QUON, await gateway.nonce(owner));
      if (!outcome || outcome.verdict !== "accepted") throw new Error(`registering the deployer key was refused, ${outcome && outcome.reason}`);
      await gateway.waitForTransaction(outcome.tx_id);
    }

    const nonce = await gateway.nonce(owner);
    const predicted = core.contractAddress(owner, nonce);
    const { signed, outcome } = await gateway.client.payableCall(seed, 0, core.vmDeployAddress(), args, "0", meter, MAX_FEE_QUON, nonce);
    if (!outcome || outcome.verdict !== "accepted") throw new Error(`the deployment was refused, ${outcome && outcome.reason}`);
    console.log("submitted", signed.tx_id);
    await gateway.waitForTransaction(outcome.tx_id || signed.tx_id);
    const deployed = await gateway.getContainer(predicted);
    const same = deployed && deployed.container === contract.container;
    console.log("container address", predicted, same ? "holds the compiled container" : "does not hold the compiled container");
    if (!same) throw new Error("the deployed container differs from the compiled one");
    console.log("Confirm QORUS finality before treating the deployment as settled.");
  } finally {
    seed.fill(0);
  }
}

main().catch((err) => {
  console.error("deploy failed", err.message);
  process.exit(1);
});
