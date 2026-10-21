import http from "node:http";
import fs from "node:fs";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { createRequire } from "node:module";

const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const EPOCH_LENGTH = config.epochLength || 16;
const SIZE = config.validators || 4;

const sha3 = (b) => createHash("sha3-256").update(b).digest();
const shake = (b, n = 32) => createHash("shake256", { outputLength: n }).update(b).digest();
const le = (n) => {
  const o = Buffer.alloc(8);
  o.writeBigUInt64LE(BigInt(n));
  return o;
};
const field = (b) => Buffer.concat([le(b.length), b]);
const leafHash = (b) => sha3(Buffer.concat([Buffer.from([0]), b]));
const EMPTY_ROOT = sha3(Buffer.alloc(0));

function polymod(values) {
  const G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i += 1) if ((top >>> i) & 1) chk ^= G[i];
  }
  return chk;
}

function bech32m(prefix, bytes) {
  const hrp = prefix.toLowerCase();
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
  const expanded = [...hrp].map((c) => c.charCodeAt(0) >> 5).concat([0], [...hrp].map((c) => c.charCodeAt(0) & 31));
  const pm = polymod(expanded.concat(data, [0, 0, 0, 0, 0, 0])) ^ 0x2bc830a3;
  const check = [0, 1, 2, 3, 4, 5].map((i) => (pm >> (5 * (5 - i))) & 31);
  return (hrp + "1" + data.concat(check).map((v) => CHARSET[v]).join("")).toUpperCase();
}

function makeValidator(id, slots, salt) {
  const { publicKey, privateKey } = generateKeyPairSync("ml-dsa-65");
  const pk = publicKey.export({ format: "der", type: "spki" }).subarray(-1952);
  const seed = sha3(Buffer.from(`validator ${id} ${salt}`));
  let padded = 1;
  while (padded < slots) padded *= 2;
  const pre = (p) => shake(Buffer.concat([seed, Buffer.from("QORUS/onetime/preimage"), le(p)]));
  const leaf = (p, img) => sha3(Buffer.concat([Buffer.from("QORUS/onetime/leaf"), le(p), img]));
  const node = (a, b) => sha3(Buffer.concat([Buffer.from("QORUS/onetime/node"), a, b]));
  const layers = [[]];
  for (let p = 0; p < padded; p += 1) layers[0].push(leaf(p, p < slots ? pre(p) : Buffer.alloc(32)));
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) next.push(node(prev[i], prev[i + 1]));
    layers.push(next);
  }
  const root = sha3(Buffer.concat([Buffer.from("QORUS/onetime/root"), le(id), le(slots), layers[layers.length - 1][0]]));
  const credential = (pos) => {
    const siblings = [];
    let idx = pos;
    for (let d = 0; d < layers.length - 1; d += 1) {
      siblings.push(layers[d][idx ^ 1]);
      idx >>= 1;
    }
    return { position: BigInt(pos), preimage: pre(pos), siblings };
  };
  return { id: BigInt(id), stake: 5000n, slots: BigInt(slots), pk, privateKey, root, credential, bond: bech32m("Q", sha3(Buffer.from(`bond ${id} ${salt}`))) };
}

const rosterJson = (vals) => vals.map((v) => ({ id: Number(v.id), stake: String(v.stake), attest_pk: v.pk.toString("hex"), root: v.root.toString("hex"), root_slots: String(v.slots), bond_address: v.bond }));

function committeeDigest(slot, active) {
  const total = active.reduce((a, v) => a + v.stake, 0n);
  const parts = [Buffer.from("QORUS-ATTEST-COMMITTEE"), le(slot), le(500), le(total), le(active.length)];
  for (const v of active) parts.push(le(v.id), le(v.stake), le(v.stake), v.root, le(v.slots), v.pk);
  parts.push(Buffer.from("QORUS-ATTEST-DRAW"), Buffer.from([2]));
  return shake(Buffer.concat(parts));
}

const blockBytes = (b) => Buffer.concat([le(b.height), b.val, Buffer.from([b.tag]), b.parent, le(b.cost)]);
const credentialBytes = (c) => Buffer.concat([le(c.position), field(c.preimage), le(c.siblings.length), ...c.siblings.map(field)]);

function chainIdOf(name) {
  return sha3(Buffer.from(name)).readBigUInt64BE(0);
}

let loadedCore = null;
function chainCore() {
  if (!loadedCore) loadedCore = createRequire(config.qcoreFrom)("@quantovainc/qcore").core;
  return loadedCore;
}

const keysets = new Map();
function keysetFor(epoch, salt) {
  const key = `${salt} ${config.rotate ? epoch : 0}`;
  if (!keysets.has(key)) keysets.set(key, Array.from({ length: SIZE }, (_, i) => makeValidator(i + 1, EPOCH_LENGTH, key)));
  return keysets.get(key);
}

function certified(blockHeight, txRoot, eventRoot) {
  const at = BigInt(blockHeight);
  const slot = at % BigInt(EPOCH_LENGTH);
  const epoch = at / BigInt(EPOCH_LENGTH);
  const vals = keysetFor(epoch, config.wrongRoster ? "other" : "pinned");
  const parentHash = sha3(Buffer.from(`parent ${blockHeight}`));
  const header = Buffer.concat([le(at), parentHash, Buffer.alloc(32, 1), txRoot, eventRoot, sha3(Buffer.from(`beacon ${blockHeight}`)), field(Buffer.from(vals[0].bond)), le(1791100000 + blockHeight), field(Buffer.alloc(0))]);
  const block = { height: at, val: sha3(header), tag: 1, parent: parentHash, cost: 1n };
  const committee = committeeDigest(slot, vals);
  const genesis = Buffer.from(config.genesis, "hex");
  const chainId = chainIdOf(config.chain);
  const parts = [le(at), le(slot), blockBytes(block), field(committee), Buffer.from([1]), le(vals.length)];
  for (const v of vals) {
    const membership = v.credential(Number(slot));
    const message = Buffer.concat([le(chainId), genesis, le(at), le(slot), le(0), committee, blockBytes(block)]);
    const sig = sign(null, message, { key: v.privateKey, context: Buffer.from("QORUS-ATTEST-CERT") });
    parts.push(le(v.id), le(at), le(slot), le(0), field(committee), blockBytes(block), credentialBytes(membership), field(sig));
  }
  parts.push(le(vals.length));
  for (const v of vals) parts.push(le(v.id), credentialBytes(v.credential(Number(slot))));
  return { header_bytes: header.toString("hex"), header_hash: sha3(header).toString("hex"), certificate: Buffer.concat(parts).toString("hex"), epoch: Number(epoch) };
}

let head = config.head || 5000;
const accounts = new Map();
const txs = new Map();
const blocks = new Map();
const containers = new Map();
const methods = [];
let submits = 0;
let deploys = 0;
let staleLeft = 0;
let staleSkip = 0;

function account(address) {
  if (!accounts.has(address)) accounts.set(address, { address, nonce: 0, balance: "500000000000", scheme: 1, has_key: Boolean(config.registered) });
  return accounts.get(address);
}

function senderOf(tx) {
  if (tx.readBigUInt64LE(0) !== 32n) return null;
  return bech32m("Q", tx.subarray(8, 40));
}

function deployOf(tx) {
  const at = tx.indexOf(Buffer.from("QDEPLOY2"));
  if (at < 0) return null;
  const length = tx.readUInt32BE(at + 8);
  const container = tx.subarray(at + 12, at + 12 + length);
  const tail = tx.subarray(at + 12 + length);
  const end = tail.indexOf(Buffer.from("QGENSNTL"));
  return { container: container.toString("hex"), params: end >= 0 ? tail.subarray(0, end) : Buffer.alloc(0) };
}

function eventLeaf(contract, selector, data) {
  return Buffer.concat([field(Buffer.from(contract)), field(Buffer.from(selector, "hex")), field(data)]);
}

function finalised(tx) {
  if (tx.polls < (config.pendingPolls || 0)) {
    tx.polls += 1;
    return false;
  }
  if (config.neverFinal) return false;
  if (tx.deploy && tx.hidden) {
    containers.set(tx.deploy.address, tx.deploy.container);
    tx.hidden = false;
  }
  tx.final = true;
  return true;
}

function submit(body) {
  submits += 1;
  if (config.rejectSubmit && submits === config.rejectSubmit) return { verdict: "rejected", reason: config.rejectReason || "refused at this point" };
  if (config.rejectReason && !config.rejectSubmit) return { verdict: "rejected", reason: config.rejectReason };
  const bytes = Buffer.from(String(body.tx), "hex");
  const id = bech32m("QTX", sha3(bytes));
  const from = senderOf(bytes);
  if (!from) return { verdict: "rejected", reason: "malformed" };
  const acct = account(from);
  head += 1;
  const tx = { id, bytes, height: head, polls: 0, final: false, hidden: false, deploy: null, event: null };
  const deployed = deployOf(bytes);
  if (deployed) {
    deploys += 1;
    const address = chainCore().contractAddress(from, BigInt(acct.nonce));
    tx.deploy = { address, container: deployed.container };
    tx.hidden = true;
    if (config.event !== "none" && config.deployedSelector) {
      const data = Buffer.from(deployed.params);
      if (config.event === "tamper" && data.length > 0) data[data.length - 1] ^= 1;
      const contract = config.event === "other" ? chainCore().contractAddress(from, BigInt(acct.nonce) + 7n) : address;
      tx.event = eventLeaf(contract, config.deployedSelector, data);
    }
  }
  acct.nonce += 1;
  acct.has_key = true;
  staleLeft = config.staleAfterSubmit || 0;
  staleSkip = config.staleSkip || 0;
  txs.set(id, tx);
  blocks.set(tx.height, tx);
  return { verdict: "accepted", state: "pending", tx_id: id };
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const send = (status, value) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(typeof value === "string" ? value : JSON.stringify(value));
    };
    if (req.method === "GET" && req.url === "/state") {
      return send(200, { methods, submits, deploys, containers: Object.fromEntries(containers) });
    }
    const method = req.url.replace(/^\/v1\//, "");
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      return send(400, { error: "bad_request", message: "bad json" });
    }
    methods.push(method);
    const missing = () => send(404, { error: "not_found", message: "not found" });
    switch (method) {
      case "node_info": {
        const shown = config.chainShown === undefined ? config.chain : config.chainShown;
        const genesisShown = config.genesisShown === undefined ? config.genesis : config.genesisShown;
        if (config.headRaw !== undefined) return send(200, `{"chain_id":${JSON.stringify(shown)},"genesis_hash":"${genesisShown}","head_height":${config.headRaw},"denomination":"Quon","version":"check","fee":{"transfer_quon":"1000","deploy_fee_quon":"5000000","rate_micro_usd_per_qtov":"1000000","quon_per_qtov":"1000000"},"protocol":2}`);
        return send(200, { chain_id: shown, genesis_hash: genesisShown, head_height: head, asset: "TQTOV", denomination: "Quon", version: "check", fee: { transfer_quon: "1000", deploy_fee_quon: "5000000", rate_micro_usd_per_qtov: "1000000", quon_per_qtov: "1000000" }, protocol: 2 });
      }
      case "head":
        return send(200, { height: head, block: bech32m("QBK", sha3(Buffer.from(`block ${head}`))), q_root: "00".repeat(32) });
      case "chain_params":
        return send(200, { native_unit: 1000000, min_stake: 2000 });
      case "validators":
        return send(200, { count: SIZE, validators: keysetFor(BigInt(head) / BigInt(EPOCH_LENGTH), "pinned").map((v) => ({ address: v.bond, stake: 5000 })) });
      case "supply":
        return send(200, { total: "1000000000000", circulating: "900000000000" });
      case "get_account": {
        const a = account(body.address);
        if (staleSkip > 0 && staleLeft > 0) {
          staleSkip -= 1;
          return send(200, a);
        }
        if (staleLeft > 0 && a.nonce > 0) {
          staleLeft -= 1;
          return send(200, Object.assign({}, a, { nonce: a.nonce - 1 }));
        }
        return send(200, a);
      }
      case "submit_transaction": {
        const outcome = submit(body);
        if (config.dropSubmit && submits === config.dropSubmit) return req.socket.destroy();
        return send(200, outcome);
      }
      case "get_transaction": {
        const tx = txs.get(body.tx_id);
        if (!tx) return send(200, { tx_id: body.tx_id, status: "unknown" });
        const done = tx.final || finalised(tx);
        return send(200, { tx_id: tx.id, status: done ? "finalised" : "pending", height: tx.height + (config.heightSkew || 0) });
      }
      case "get_container": {
        const c = containers.get(body.address);
        if (c) return send(200, { address: body.address, container: c, size: c.length / 2 });
        if (config.missingContainer === "empty") return send(200, { address: body.address, container: "", size: 0 });
        if (config.missingContainer === "error") return send(500, { error: "internal", message: "storage unavailable" });
        if (config.missingContainer === "unknown") return send(404, { error: "unknown_method", message: "unknown method" });
        return send(404, { error: "not_found", message: "the address holds no contract" });
      }
      case "get_storage":
        return send(200, { address: body.address, count: 0, slots: [] });
      case "get_transaction_proof": {
        const tx = txs.get(body.tx_id);
        if (!tx || !tx.final || config.noProofs) return missing();
        return send(200, { tx_id: tx.id, height: tx.height, index: 0, transaction_root: leafHash(tx.bytes).toString("hex"), leaf: tx.bytes.toString("hex"), steps: [] });
      }
      case "get_finality": {
        const tx = blocks.get(body.height);
        if (!tx || !tx.final || config.noProofs) return missing();
        const certifiedEvent = tx.event && config.event === "unproven" ? Buffer.concat([tx.event, Buffer.from([0])]) : tx.event;
        const proof = certified(tx.height, leafHash(tx.bytes), certifiedEvent ? leafHash(certifiedEvent) : EMPTY_ROOT);
        return send(200, Object.assign({ height: tx.height, chain_id: String(chainIdOf(config.chain)) }, proof));
      }
      case "get_event_proof": {
        const tx = blocks.get(body.height);
        if (!tx || !tx.final || !tx.event || body.index !== 0) return missing();
        return send(200, { height: tx.height, index: 0, event_count: 1, event_root: leafHash(tx.event).toString("hex"), leaf: tx.event.toString("hex"), steps: [] });
      }
      default:
        return send(404, { error: "unknown_method", message: "unknown method" });
    }
  });
});

if (config.rosterOut) {
  const first = BigInt(head) / BigInt(EPOCH_LENGTH);
  const epochs = Array.from({ length: config.rosterEpochs || 3 }, (_, k) => BigInt(k)).map((k) => ({ epoch: Number(first + k), roster: rosterJson(keysetFor(first + k, "pinned")) }));
  fs.writeFileSync(config.rosterOut, JSON.stringify({ epochLength: EPOCH_LENGTH, first: Number(first), epochs }));
}

server.listen(0, "127.0.0.1", () => {
  process.stdout.write(`GATEWAY http://127.0.0.1:${server.address().port}\n`);
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
