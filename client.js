// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Network, core } from "@quantovainc/qcore";

const NETWORK = Network.testnet();
const DEFAULT_GATEWAY = process.env.QUANTOVA_GATEWAY || NETWORK.rpcUrl;
const DEFAULT_PIN = fileURLToPath(new URL("./finality-pin.json", import.meta.url));
const TIMEOUT_MS = 15000;
const RESPONSE_MAX = 8 * 1024 * 1024;
const SEED_FILE_MAX = 80;
const PIN_FILE_MAX = 4 * 1024 * 1024;
const PRINT_MAX = 96;
const OPEN_FLAGS = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0);
const PRINT_TABLE = [[0x0, 0x8, 2], [0x9, 0xd, 1], [0xe, 0x1b, 2], [0x1c, 0x20, 1], [0x7f, 0x84, 2], [0x85, 0x85, 1], [0x86, 0x9f, 2], [0xa0, 0xa0, 1], [0xad, 0xad, 2], [0x300, 0x34e, 3], [0x34f, 0x34f, 2], [0x350, 0x36f, 3], [0x483, 0x489, 3], [0x600, 0x605, 2], [0x61c, 0x61c, 2], [0x6dd, 0x6dd, 2], [0x70f, 0x70f, 2], [0x890, 0x891, 2], [0x8e2, 0x8e2, 2], [0x115f, 0x1160, 1], [0x1680, 0x1680, 1], [0x17b4, 0x17b5, 2], [0x180b, 0x180d, 2], [0x180e, 0x180e, 1], [0x180f, 0x180f, 2], [0x1ab0, 0x1aff, 3], [0x1dc0, 0x1dff, 3], [0x2000, 0x200a, 1], [0x200b, 0x200f, 2], [0x2028, 0x2029, 1], [0x202a, 0x202e, 2], [0x202f, 0x202f, 1], [0x205f, 0x205f, 1], [0x2060, 0x206f, 2], [0x20d0, 0x20ff, 3], [0x2800, 0x2800, 1], [0x3000, 0x3000, 1], [0x3164, 0x3164, 1], [0xd800, 0xf8ff, 2], [0xfdd0, 0xfdef, 2], [0xfe00, 0xfe0f, 2], [0xfe20, 0xfe2f, 3], [0xfeff, 0xfeff, 2], [0xffa0, 0xffa0, 1], [0xfff0, 0xffff, 2], [0x110bd, 0x110bd, 2], [0x110cd, 0x110cd, 2], [0x13430, 0x1345f, 2], [0x1bca0, 0x1bca3, 2], [0x1d165, 0x1d169, 3], [0x1d16d, 0x1d172, 3], [0x1d173, 0x1d17a, 2], [0x1d17b, 0x1d182, 3], [0x1d185, 0x1d18b, 3], [0x1d1aa, 0x1d1ad, 3], [0x1fffe, 0x1ffff, 2], [0x2fffe, 0x2ffff, 2], [0x3fffe, 0x3ffff, 2], [0x4fffe, 0x4ffff, 2], [0x5fffe, 0x5ffff, 2], [0x6fffe, 0x6ffff, 2], [0x7fffe, 0x7ffff, 2], [0x8fffe, 0x8ffff, 2], [0x9fffe, 0x9ffff, 2], [0xafffe, 0xaffff, 2], [0xbfffe, 0xbffff, 2], [0xcfffe, 0xcffff, 2], [0xdfffe, 0xe0fff, 2], [0xf0000, 0x10ffff, 2]];
const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

export const QUON_PER_QTOV = 1_000_000n;

function printKind(cp) {
  let lo = 0;
  let hi = PRINT_TABLE.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const row = PRINT_TABLE[mid];
    if (cp < row[0]) hi = mid - 1;
    else if (cp > row[1]) lo = mid + 1;
    else return row[2];
  }
  return 0;
}

export function printable(value, limit = PRINT_MAX) {
  let text;
  try {
    text = String(value);
  } catch {
    text = "?";
  }
  const out = [];
  let marks = 0;
  for (const ch of text) {
    const kind = printKind(ch.codePointAt(0));
    if (kind === 1) {
      if (out.length > 0 && out[out.length - 1] !== " ") out.push(" ");
      marks = 0;
      continue;
    }
    if (kind === 2) continue;
    if (kind === 3) {
      marks += 1;
      if (marks > 2) continue;
    } else {
      marks = 0;
    }
    out.push(ch);
  }
  while (out.length > 0 && out[out.length - 1] === " ") out.pop();
  return out.length > limit ? out.slice(0, limit - 3).join("") + "..." : out.join("");
}

export function publicChain(name) {
  return typeof name === "string" && /^Q-(test|main)-net-/.test(name);
}

export function transactionId(txHex) {
  const bytes = crypto.createHash("sha3-256").update(Buffer.from(txHex, "hex")).digest();
  const data = [];
  let acc = 0;
  let bits = 0;
  for (const b of bytes) {
    acc = ((acc << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      data.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) data.push((acc << (5 - bits)) & 31);
  const hrp = "qtx";
  const values = [...hrp].map((c) => c.charCodeAt(0) >> 5).concat([0], [...hrp].map((c) => c.charCodeAt(0) & 31), data, [0, 0, 0, 0, 0, 0]);
  const G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i += 1) if ((top >>> i) & 1) chk ^= G[i];
  }
  chk ^= 0x2bc830a3;
  const check = [0, 1, 2, 3, 4, 5].map((i) => (chk >>> (5 * (5 - i))) & 31);
  return (hrp + "1" + data.concat(check).map((v) => BECH32[v]).join("")).toUpperCase();
}

export function height(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`the gateway reported a ${label} that is not a whole number`);
  return value;
}

function chainOf(options) {
  const named = options.expectedChainId || process.env.QUANTOVA_CHAIN;
  return typeof named === "string" && named.length > 0 ? named : NETWORK.chainId;
}

function wholeNumber(value, label) {
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== "string" || !/^(0|[1-9][0-9]*)$/.test(text)) throw new Error(`the gateway reported a ${label} that is not a whole number`);
  return BigInt(text);
}

function clockSetting(name) {
  const text = process.env[name];
  if (text === undefined || text === "") return undefined;
  if (!/^[1-9][0-9]{0,15}$/.test(text)) throw new Error(`${name} must be a positive whole number`);
  return BigInt(text);
}

function nibble(c) {
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 97 && c <= 102) return c - 87;
  return -1;
}

function decodeSeed(raw, length) {
  let end = length;
  while (end > 64 && (raw[end - 1] === 10 || raw[end - 1] === 13 || raw[end - 1] === 32 || raw[end - 1] === 9)) end -= 1;
  const seed = new Uint8Array(32);
  let ok = end === 64 && length < raw.length;
  for (let i = 0; i < 32; i += 1) {
    const hi = nibble(raw[2 * i]);
    const lo = nibble(raw[2 * i + 1]);
    if (hi < 0 || lo < 0) ok = false;
    seed[i] = ((hi & 15) << 4) | (lo & 15);
  }
  if (!ok) {
    seed.fill(0);
    throw new Error("The deployer key file holds the 32 byte seed as 64 lowercase hex characters.");
  }
  return seed;
}

function openPlain(file, refusal) {
  try {
    return fs.openSync(file, OPEN_FLAGS);
  } catch (err) {
    if (err && err.code === "ENOENT") throw err;
    throw new Error(refusal);
  }
}

function ownedByUser(st) {
  return typeof process.getuid !== "function" || st.uid === process.getuid();
}

function readInto(fd, buffer) {
  let length = 0;
  for (;;) {
    const n = fs.readSync(fd, buffer, length, buffer.length - length, length);
    if (n === 0) break;
    length += n;
    if (length === buffer.length) break;
  }
  return length;
}

export function readSeedFile(file) {
  const loose = "The deployer key file must be a regular file readable only by its owner, chmod 600.";
  const raw = new Uint8Array(SEED_FILE_MAX);
  try {
    const fd = openPlain(file, loose);
    let length;
    try {
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || (opened.mode & 0o077) !== 0 || !ownedByUser(opened)) throw new Error(loose);
      length = readInto(fd, raw);
    } finally {
      fs.closeSync(fd);
    }
    return decodeSeed(raw, length);
  } finally {
    raw.fill(0);
  }
}

export function readGuardedFile(file, label, max) {
  const shown = printable(file);
  const fd = openPlain(file, `the ${label} ${shown} must be a regular file, not a link, writable only by its owner`);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) throw new Error(`the ${label} ${shown} is not a regular file`);
    if ((st.mode & 0o022) !== 0) throw new Error(`the ${label} ${shown} is writable by other users, run chmod go-w on it`);
    if (!ownedByUser(st)) throw new Error(`the ${label} ${shown} belongs to another user, it must be owned by the user running this script`);
    const buffer = Buffer.alloc(max + 1);
    const length = readInto(fd, buffer);
    if (length > max) throw new Error(`the ${label} ${shown} is too large`);
    return buffer.subarray(0, length).toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function rosterSlots(members, where) {
  if (!Array.isArray(members) || members.length === 0) throw new Error(`${where} needs a non empty list of validators`);
  let slots = null;
  for (const m of members) {
    if (!m || typeof m !== "object" || Array.isArray(m)) throw new Error(`${where} holds an entry that is not a validator`);
    const raw = typeof m.root_slots === "number" && Number.isSafeInteger(m.root_slots) ? String(m.root_slots) : m.root_slots;
    if (typeof raw !== "string" || !/^[1-9][0-9]{0,9}$/.test(raw)) throw new Error(`${where} gives a validator no whole number of root slots`);
    if (slots !== null && slots !== BigInt(raw)) throw new Error(`${where} gives its validators different root slot counts`);
    slots = BigInt(raw);
  }
  return slots;
}

export function parsePin(text, file, chain, named) {
  const shown = printable(file);
  let pin;
  try {
    pin = JSON.parse(text);
  } catch {
    throw new Error(`the finality pin ${shown} could not be read as JSON`);
  }
  if (!pin || typeof pin !== "object" || Array.isArray(pin)) throw new Error(`the finality pin ${shown} is not a JSON object`);
  const roster = pin.roster === undefined ? [] : pin.roster;
  const listed = pin.epochs === undefined ? [] : pin.epochs;
  if (!Array.isArray(roster)) throw new Error(`the finality pin ${shown} needs a validator roster list, empty while no roster is published`);
  if (!Array.isArray(listed)) throw new Error(`the finality pin ${shown} needs its epochs as a list of epoch and roster pairs`);
  if (!pin.genesis_hash && roster.length === 0 && listed.length === 0) {
    if (named) throw new Error(`the finality pin ${shown} names no genesis hash and no validator roster`);
    return null;
  }
  if (pin.chain_id !== chain) throw new Error(`the finality pin ${shown} is for chain ${printable(pin.chain_id)}, not ${printable(chain)}`);
  if (typeof pin.genesis_hash !== "string" || !/^[0-9a-f]{64}$/i.test(pin.genesis_hash)) throw new Error(`the finality pin ${shown} needs a genesis hash of 64 hex characters`);
  let epochLength = roster.length > 0 ? rosterSlots(roster, `the roster of ${shown}`) : null;
  const epochs = new Map();
  for (const entry of listed) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`the finality pin ${shown} lists an epoch that is not an epoch and roster pair`);
    const epoch = typeof entry.epoch === "string" && /^(0|[1-9][0-9]{0,15})$/.test(entry.epoch) ? Number(entry.epoch) : entry.epoch;
    if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error(`the finality pin ${shown} names an epoch that is not a whole number`);
    if (epochs.has(epoch)) throw new Error(`the finality pin ${shown} names epoch ${epoch} twice`);
    const slots = rosterSlots(entry.roster, `the roster of epoch ${epoch} in ${shown}`);
    if (epochLength !== null && slots !== epochLength) throw new Error(`the finality pin ${shown} gives its rosters different root slot counts`);
    epochLength = slots;
    epochs.set(epoch, entry.roster);
  }
  return { file: shown, genesisHash: pin.genesis_hash.toLowerCase(), roster: roster.length > 0 ? roster : null, epochs, epochLength };
}

export function loadPin(file, chain) {
  const named = Boolean(file);
  const target = file || DEFAULT_PIN;
  let text;
  try {
    text = readGuardedFile(target, "finality pin", PIN_FILE_MAX);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      if (named) throw new Error(`the finality pin ${printable(target)} does not exist`);
      return null;
    }
    throw err;
  }
  return parsePin(text, target, chain, named);
}

export function hasRoster(pin) {
  return Boolean(pin && (pin.roster || pin.epochs.size > 0));
}

export function rosterFor(pin, blockHeight) {
  const epoch = BigInt(blockHeight) / pin.epochLength;
  const members = pin.epochs.get(Number(epoch)) || pin.roster;
  if (!members) throw new Error(`the finality pin ${pin.file} holds no validator roster for epoch ${epoch}, the epoch of block ${blockHeight}`);
  return members;
}

export function rosterKnown(pin, blockHeight) {
  const epoch = BigInt(blockHeight) / pin.epochLength;
  return pin.epochs.has(Number(epoch)) || Boolean(pin.roster);
}

export function requireRosters(pin, head) {
  if (!hasRoster(pin)) return;
  const last = BigInt(head) + BigInt(core.validityBlocks());
  for (let at = BigInt(head); ; at += pin.epochLength) {
    rosterFor(pin, at > last ? last : at);
    if (at >= last) break;
  }
}

async function readBounded(res) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > RESPONSE_MAX) {
      await reader.cancel();
      throw new Error("the gateway sent more than 8 MiB");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function notFound(text) {
  try {
    core.checkGatewayJson(text);
    const answer = JSON.parse(text);
    return Boolean(answer) && typeof answer === "object" && !Array.isArray(answer) && answer.error === "not_found";
  } catch {
    return false;
  }
}

export class Gateway {
  constructor(baseUrl, options = {}) {
    const target = (baseUrl || DEFAULT_GATEWAY).replace(/\/+$/, "");
    this.fetch = options.fetch || ((url, init) => fetch(url, init));
    this.onSubmit = options.onSubmit || null;
    this.chainId = chainOf(options);
    this.pinFile = options.finalityFile || process.env.QUANTOVA_FINALITY_FILE || null;
    this.pin = loadPin(this.pinFile, this.chainId);
    const pinned = this.pin ? this.pin.genesisHash : null;
    const builtIn = this.chainId === NETWORK.chainId && typeof NETWORK.genesisHash === "string" ? NETWORK.genesisHash.toLowerCase() : null;
    if (pinned && builtIn && pinned !== builtIn) {
      throw new Error(`the finality pin names genesis ${pinned} but QCore.js carries genesis ${builtIn} for ${printable(this.chainId)}, refusing to sign for either`);
    }
    const genesis = pinned || builtIn;
    const network = new Network({
      name: target === NETWORK.rpcUrl && this.chainId === NETWORK.chainId ? NETWORK.name : "custom",
      chainId: this.chainId,
      rpcUrl: target,
      explorerUrl: NETWORK.explorerUrl,
      isMainnet: false,
      genesisHash: genesis || undefined,
      genesisSecs: this.chainId === NETWORK.chainId ? NETWORK.genesisSecs : clockSetting("QUANTOVA_GENESIS_SECS"),
      blocksPerSec: this.chainId === NETWORK.chainId ? NETWORK.blocksPerSec : clockSetting("QUANTOVA_BLOCKS_PER_SEC"),
    });
    this.client = new Client(target, { network, expectedChainId: this.chainId, fetch: this.fetch, addressBook: options.addressBook });
    const submit = this.client.submit.bind(this.client);
    this.client.submit = (txHex) => {
      if (this.onSubmit) this.onSubmit(txHex);
      return submit(txHex);
    };
    this.baseUrl = this.client.base;
    this.genesis = genesis;
    this.genesisEnforced = Boolean(genesis) && this.client.network && this.client.network.genesisHash === genesis && this.client._pinnedGenesis === genesis;
    if (pinned && !this.genesisEnforced) {
      throw new Error("the finality pin names a genesis hash but the installed QCore.js does not sign over a pinned genesis, refusing to sign. Install QCore.js 0.9.0 or later, or leave genesis_hash empty");
    }
  }

  requireSigning() {
    if (publicChain(this.chainId) && !this.genesisEnforced) {
      throw new Error(`signing for ${printable(this.chainId)} needs QCore.js 0.9.0 or later and the genesis hash of the network pinned in finality-pin.json, refusing to sign`);
    }
  }

  async post(method, body) {
    const res = await this.fetch(`${this.baseUrl}/v1/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    return { status: res.status, text: await readBounded(res) };
  }

  async read(method, body = {}) {
    const { status, text } = await this.post(method, body);
    if (status !== 200) throw new Error(`gateway ${method} returned HTTP ${status}`);
    core.checkGatewayJson(text);
    return JSON.parse(text);
  }

  async containerAt(address) {
    const { status, text } = await this.post("get_container", { address });
    if (status === 404) {
      if (notFound(text)) return "";
      throw new Error(`gateway get_container returned HTTP 404 for ${printable(address)} without a not_found answer`);
    }
    if (status !== 200) throw new Error(`gateway get_container returned HTTP ${status}`);
    core.checkGatewayJson(text);
    const found = JSON.parse(text);
    if (!found || typeof found !== "object" || typeof found.container !== "string" || !/^([0-9a-f]{2})*$/.test(found.container)) {
      throw new Error(`the gateway answered get_container for ${printable(address)} without a hex container`);
    }
    return found.container;
  }

  async nodeInfo() {
    const info = await this.client.nodeInfo();
    if (!info || info.chain_id !== this.chainId) {
      throw new Error(`the gateway names chain ${printable(info && info.chain_id)} but this project is configured for ${printable(this.chainId)}, refusing to go on`);
    }
    if (this.genesis && info.genesis_hash !== this.genesis) {
      throw new Error(`the gateway names genesis ${printable(info.genesis_hash)} but ${printable(this.chainId)} is pinned to genesis ${this.genesis}, refusing to go on`);
    }
    return info;
  }

  head() {
    return this.client.head();
  }

  validators() {
    return this.read("validators");
  }

  chainParams() {
    return this.read("chain_params");
  }

  supply() {
    return this.read("supply");
  }

  getAccount(address) {
    return this.client.account(address);
  }

  getTransaction(txId) {
    return this.client.transaction(txId);
  }

  getBlock(blockHeight) {
    return this.client.block(blockHeight);
  }

  getContainer(address) {
    return this.client.container(address);
  }

  getStorage(address) {
    return this.client.storage(address);
  }

  getEvents(blockHeight) {
    return this.client.events(blockHeight);
  }

  getEventProof(blockHeight, index) {
    return this.read("get_event_proof", { height: blockHeight, index });
  }

  submitTransaction(txHex) {
    return this.client.submit(txHex);
  }

  async balanceQTOV(address) {
    const account = await this.getAccount(address);
    const quon = wholeNumber(account.balance, "balance");
    const whole = quon / QUON_PER_QTOV;
    const frac = (quon % QUON_PER_QTOV).toString().padStart(6, "0").replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : `${whole}`;
  }

  accountNonce(account) {
    return wholeNumber(account && account.nonce, "nonce");
  }

  async nonce(address) {
    return this.accountNonce(await this.getAccount(address));
  }

  async waitForTransaction(txId, { intervalMs = 1000, timeoutMs = 60000 } = {}) {
    const start = Date.now();
    for (;;) {
      const tx = await this.getTransaction(txId);
      if (tx && tx.tx_id === txId && (tx.status === "finalised" || (tx.status === "unverified" && tx.reportedStatus === "finalised")) && Number.isSafeInteger(tx.height) && tx.height >= 0) return tx;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`timed out waiting for ${printable(txId)} to be finalised, the gateway last reported ${printable(tx && tx.status)}`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  finalityPin() {
    return this.pin;
  }

  async confirm(txId, blockHeight) {
    const pin = this.pin;
    if (!hasRoster(pin)) return null;
    const members = rosterFor(pin, height(blockHeight, "transaction height"));
    const proof = await this.client.confirmTransaction(txId, pin.genesisHash, members);
    if (BigInt(proof.height) !== BigInt(blockHeight)) {
      throw new Error(`the gateway placed ${printable(txId)} at height ${blockHeight} but proved it at height ${proof.height}`);
    }
    return proof;
  }
}

export function stateDir(...parts) {
  const root = process.env.QUANTOVA_STATE_DIR || path.join(os.homedir(), ".quantova");
  let dir = root;
  for (const part of ["", ...parts]) {
    if (part) dir = path.join(dir, part);
    try {
      fs.mkdirSync(dir, { mode: 0o700 });
    } catch (err) {
      if (!err || err.code !== "EEXIST") throw err;
    }
    const st = fs.lstatSync(dir);
    if (!st.isDirectory() || (st.mode & 0o077) !== 0 || !ownedByUser(st)) {
      throw new Error(`the state directory ${printable(dir)} must be a directory, not a link, owned by you and closed to other users, chmod 700`);
    }
  }
  return dir;
}

export function safeName(text) {
  return /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/.test(text) ? text : crypto.createHash("sha3-256").update(String(text)).digest("hex");
}

export function sessionPath(chain, owner, containerHash) {
  if (process.env.QUANTOVA_DEPLOY_SESSION) return process.env.QUANTOVA_DEPLOY_SESSION;
  return path.join(stateDir("deploy-sessions", safeName(chain)), `${safeName(owner)}-${containerHash}.json`);
}

export default Gateway;
