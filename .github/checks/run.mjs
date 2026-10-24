import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-checks-"));
const MODULES = process.env.CHECK_QCORE ? linkCore(process.env.CHECK_QCORE) : path.join(ROOT, "node_modules");
const VERSION = JSON.parse(fs.readFileSync(path.join(MODULES, "@quantovainc", "qcore", "package.json"), "utf8")).version;
const SIGNS_GENESIS = VERSION.split(".").map(Number).reduce((a, n) => a * 1000 + n, 0) >= 9000;
const VERIFIES_HEAD = VERSION.split(".").map(Number).reduce((a, n) => a * 1000 + n, 0) >= 11000;
const BUILT_IN_GENESIS = spawnSync(process.execPath, ["-e", "const n = require(process.argv[1]).Network.testnet(); process.stdout.write(n.genesisHash || '')", path.join(MODULES, "@quantovainc", "qcore")], { encoding: "utf8" }).stdout.trim();
const TESTNET_GENESIS = /^[0-9a-f]{64}$/.test(BUILT_IN_GENESIS) ? BUILT_IN_GENESIS : "c3".repeat(32);
const STATE = path.join(WORK, "state");
const SELECTOR = "a19a5937";
const UNSAFE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u00ad\u034f\u115f\u1160\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\u{e0000}-\u{e0fff}]|[\u0300-\u036f]{3}/u;
let failures = 0;
let passes = 0;

function linkCore(dir) {
  const modules = path.join(WORK, "proof-core", "node_modules");
  fs.mkdirSync(path.join(modules, "@quantovainc"), { recursive: true });
  fs.symlinkSync(path.resolve(dir), path.join(modules, "@quantovainc", "qcore"));
  return modules;
}

function check(name, ok, detail) {
  if (ok) {
    passes += 1;
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? "\n     " + JSON.stringify(String(detail)).slice(0, 600) : ""}`);
  }
}

function project(pinText) {
  const dir = fs.mkdtempSync(path.join(WORK, "project-"));
  for (const f of ["client.js", "deploy.js", "interact.js", "package.json", "finality-pin.json"]) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.symlinkSync(MODULES, path.join(dir, "node_modules"));
  if (pinText !== undefined) fs.writeFileSync(path.join(dir, "finality-pin.json"), pinText);
  fs.chmodSync(path.join(dir, "finality-pin.json"), 0o644);
  return dir;
}

const SHIPPED = project();
const BASE = project(JSON.stringify({ chain_id: "Q-test-net-01", genesis_hash: "", roster: [] }));

function file(name, data, mode = 0o600) {
  const f = path.join(WORK, name);
  fs.writeFileSync(f, data, { mode });
  fs.chmodSync(f, mode);
  return f;
}

function newKey(name) {
  return file(name, crypto.randomBytes(32).toString("hex") + "\n");
}

function compiled(name, events = true, container = crypto.randomBytes(64).toString("hex")) {
  const contract = {
    name: "QAsset",
    container,
    deploy_params: [
      { key: "deploy_params.owner", offset: 152, width: 32 },
      { key: "deploy_params.initial_supply", offset: 184, width: 16 },
    ],
    events: events ? [{ name: "Deployed", signature: "Deployed(Q_Address,u128)", selector: SELECTOR }] : [],
  };
  const dir = fs.mkdtempSync(path.join(WORK, "build-"));
  const f = path.join(dir, name);
  fs.writeFileSync(f, JSON.stringify({ ok: true, contracts: [contract] }));
  return f;
}

const SEAM = path.join(WORK, "foreign-owner.cjs");
fs.writeFileSync(SEAM, `const fs = require("fs");
const foreign = process.env.CHECK_FOREIGN || "";
const open = fs.openSync;
const fstat = fs.fstatSync;
const marked = new Set();
fs.openSync = function (file, ...rest) {
  const fd = open.call(this, file, ...rest);
  if (foreign && String(file).includes(foreign)) marked.add(fd);
  else marked.delete(fd);
  return fd;
};
fs.fstatSync = function (fd, ...rest) {
  const st = fstat.call(this, fd, ...rest);
  if (marked.has(fd)) st.uid += 1;
  return st;
};
`);

function run(dir, script, env, args = [], timeout = 120000, node = []) {
  const r = spawnSync(process.execPath, [...node, script, ...args], {
    cwd: dir,
    encoding: "utf8",
    timeout,
    env: Object.assign({ PATH: process.env.PATH, HOME: process.env.HOME, QUANTOVA_STATE_DIR: STATE, QUANTOVA_GATEWAY: "http://127.0.0.1:9", QUANTOVA_GENESIS_SECS: "1700000000", QUANTOVA_BLOCKS_PER_SEC: "5" }, env),
  });
  const out = (r.stdout || "") + (r.stderr || "");
  check(`${script} ${args.join(" ")} prints no control, bidi or filler character`, !UNSAFE.test(out), out);
  return { status: r.error ? "timeout" : r.status, out, stdout: r.stdout || "" };
}

async function gateway(settings) {
  const cfg = Object.assign({ chain: "Q-local-1", genesis: "ab".repeat(32), qcoreFrom: path.join(path.dirname(MODULES), "package.json"), head: 5000 }, settings);
  const f = path.join(WORK, `gateway-${crypto.randomBytes(4).toString("hex")}.json`);
  fs.writeFileSync(f, JSON.stringify(cfg));
  const child = spawn(process.execPath, [path.join(HERE, "gateway.mjs"), f], { stdio: ["ignore", "pipe", "inherit"] });
  const url = await new Promise((resolve, reject) => {
    child.stdout.on("data", (d) => {
      const m = String(d).match(/GATEWAY (\S+)/);
      if (m) resolve(m[1]);
    });
    child.on("exit", () => reject(new Error("the check gateway did not start")));
  });
  return {
    url,
    state: async () => (await fetch(url + "/state")).json(),
    stop: () => new Promise((r) => {
      child.removeAllListeners("exit");
      child.on("exit", r);
      child.kill("SIGTERM");
    }),
  };
}

function pinFile(name, text, mode = 0o600) {
  return file(name, text, mode);
}

function rosters(f) {
  return JSON.parse(fs.readFileSync(f, "utf8"));
}

function predicted(out) {
  const all = [...out.matchAll(/Predicted container address (\S+)/g)].map((m) => m[1]);
  return all[all.length - 1];
}

async function offline() {
  const c = compiled("c.json");
  const owner = newKey("owner.key");
  const loose = newKey("loose.key");
  fs.chmodSync(loose, 0o644);
  const link = path.join(WORK, "link.key");
  fs.symlinkSync(owner, link);
  const fifo = path.join(WORK, "seed.fifo");
  execFileSync("mkfifo", ["-m", "600", fifo]);
  for (const [label, key] of [["group readable", loose], ["symbolic link", link], ["fifo", fifo], ["directory", WORK]]) {
    const r = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: key }, [], 20000);
    check(`a ${label} key file is refused`, r.status === 1 && r.out.includes("chmod 600"), r.out);
  }
  const sample = crypto.randomBytes(32).toString("hex");
  for (const [label, text] of [["upper case", sample.toUpperCase()], ["non hex", "zz" + sample.slice(2)], ["short", sample.slice(1)], ["long", sample + "0"], ["prefixed", "0x" + sample]]) {
    const r = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: file(`seed-${label.replace(/ /g, "-")}.key`, text + "\n") }, [], 20000);
    check(`a ${label} key is refused`, r.status === 1 && r.out.includes("64 lowercase hex characters"), r.out);
  }
  const good = JSON.stringify({ chain_id: "Q-test-net-01", genesis_hash: "ab".repeat(32), roster: [] });
  const world = pinFile("world.json", good, 0o666);
  const group = pinFile("group.json", good, 0o620);
  const target = pinFile("target.json", good);
  const plink = path.join(WORK, "pin-link.json");
  fs.symlinkSync(target, plink);
  const pfifo = path.join(WORK, "pin.fifo");
  execFileSync("mkfifo", ["-m", "600", pfifo]);
  const pdir = fs.mkdtempSync(path.join(WORK, "pin-dir-"));
  const cases = [["world writable", world, "writable by other users"], ["group writable", group, "writable by other users"], ["symbolic link", plink, "not a link"], ["fifo", pfifo, "not a regular file"], ["directory", pdir, "not a regular file"]];
  const foreign = ["/etc/hosts", "/etc/passwd"].find((f) => fs.existsSync(f) && fs.statSync(f).uid !== process.getuid() && (fs.statSync(f).mode & 0o022) === 0);
  if (foreign) cases.push(["foreign owned", foreign, "belongs to another user"]);
  for (const [label, pin, want] of cases) {
    const r = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_FINALITY_FILE: pin }, [], 20000);
    check(`a ${label} pin is refused`, r.status === 1 && r.out.includes(want), r.out);
    const i = run(BASE, "interact.js", { QUANTOVA_FINALITY_FILE: pin }, [], 20000);
    check(`interact.js refuses a ${label} pin`, i.status === 1 && i.out.includes(want), i.out);
  }
  const other = pinFile("other.json", JSON.stringify({ chain_id: "Q-other-9", genesis_hash: "ab".repeat(32), roster: [] }));
  const r1 = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_FINALITY_FILE: other });
  check("a named pin for another chain is refused", r1.status === 1 && r1.out.includes("is for chain Q-other-9"), r1.out);
  const filled = project(JSON.stringify({ chain_id: "Q-test-net-01", genesis_hash: "ab".repeat(32), roster: [] }));
  const r2 = run(filled, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1" });
  check("a filled default pin for another chain is refused", r2.status === 1 && r2.out.includes("is for chain Q-test-net-01"), r2.out);
  const empty = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1" });
  check("an empty pin is ignored for another chain", empty.status === 1 && !empty.out.includes("is for chain"), empty.out);
  const shipped = run(SHIPPED, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1" });
  check("the shipped testnet pin is refused for another chain", shipped.status === 1 && shipped.out.includes("is for chain Q-test-net-01"), shipped.out);
  const pin = JSON.parse(fs.readFileSync(path.join(ROOT, "finality-pin.json"), "utf8"));
  const commitment = spawnSync(process.execPath, ["-e", "const q = require(process.argv[1]); const n = q.Network.testnet(); const e = JSON.parse(process.argv[2]); process.stdout.write(JSON.stringify([n.genesisHash, n.rosterCommitment, q.core.rosterCommitment(BigInt(e.epoch), JSON.stringify(e.roster))]))", path.join(MODULES, "@quantovainc", "qcore"), JSON.stringify(pin.epochs[0])], { encoding: "utf8" }).stdout;
  const [builtGenesis, builtRoster, shippedRoster] = JSON.parse(commitment || "[]");
  check("the shipped pin names the genesis and roster QCore.js carries", pin.genesis_hash === builtGenesis && shippedRoster === builtRoster, commitment);
  const r3 = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_FINALITY_FILE: target });
  if (SIGNS_GENESIS) check("a genesis pin is accepted by a core that signs over it", !r3.out.includes("does not sign over a pinned genesis"), r3.out);
  else check("a genesis pin is refused by a core that cannot sign over it", r3.status === 1 && r3.out.includes("does not sign over a pinned genesis"), r3.out);
  const odd = "\u{3164}".repeat(40) + " ".repeat(40) + "\u{fe0f}\u{e0100}\u{180b}" + "Q" + "\u{338}".repeat(90) + "a".repeat(400);
  const r4 = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: path.join(WORK, odd + ".json"), QUANTOVA_DEPLOYER_KEY_FILE: owner });
  check("an odd path is cleaned and capped in the error", r4.status === 1 && r4.out.includes("Compiled contract not found") && !r4.out.includes("a".repeat(97)) && !/ {2}/.test(r4.out) && !/\u{338}{3}/u.test(r4.out), r4.out);
  const bad = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner }, ["--unknown"]);
  check("an unknown option is refused", bad.status === 1 && bad.out.includes("unknown option"), bad.out);
  const probe = `import(${JSON.stringify(path.join(BASE, "client.js"))}).then(({ readSeedFile }) => { const s = readSeedFile(process.argv[1]); s.fill(0); require("v8").writeHeapSnapshot(process.argv[2]); });`;
  const hex = fs.readFileSync(owner, "utf8").trim();
  const snap = path.join(WORK, "seed.heapsnapshot");
  spawnSync(process.execPath, ["-e", probe, owner, snap], { encoding: "utf8" });
  check("the seed leaves no hex copy in the heap", fs.existsSync(snap) && !fs.readFileSync(snap, "latin1").includes(hex));
  fs.rmSync(snap, { force: true });
}

async function gatewayText() {
  const c = compiled("c.json");
  const owner = newKey("text.key");
  let g = await gateway({ chain: "Q-local-1", chainShown: "Q-local-1\u001b[2K\u{202e}" + "\u{3164}".repeat(40) + " ".repeat(120) + "Predicted container address Q1SPOOF" });
  let r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1" });
  let s = await g.state();
  await g.stop();
  check("a gateway chain id with escapes and padding is refused and capped", r.status === 1 && r.out.includes("names chain") && !/^Predicted/m.test(r.out) && !/ {2}/.test(r.out) && s.submits === 0, r.out);
  const i = await gateway({ chain: "Q-other-9" });
  r = run(BASE, "interact.js", { QUANTOVA_GATEWAY: i.url, QUANTOVA_CHAIN: "Q-local-1" });
  await i.stop();
  check("interact.js checks the chain before printing node info", r.status === 1 && !/^node /m.test(r.stdout) && r.out.includes("names chain Q-other-9"), r.out);
  g = await gateway({ chain: "Q-local-1", headRaw: JSON.stringify("5001" + " ".repeat(150) + "Predicted container address Q1SPOOF") });
  r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1" });
  await g.stop();
  check("a head height that is not a number is refused before anything is printed", r.status === 1 && r.stdout === "" && r.out.includes("head height"), r.out);
  g = await gateway({ chain: "Q-local-1", registered: true, rejectReason: "\u001b]0;x\u0007\u{3164}\u{fe0f}" + " ".repeat(50) + "x".repeat(400) });
  r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" }, ["--accept-unconfirmed"]);
  await g.stop();
  check("a refusal reason from the gateway is capped", r.status === 1 && r.out.includes("refused") && !r.out.includes("x".repeat(97)), r.out);
  g = await gateway({ chain: "Q-other-9" });
  r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" }, ["--accept-unconfirmed"]);
  s = await g.state();
  await g.stop();
  check("a gateway for another chain gets nothing signed", r.status === 1 && s.submits === 0, r.out);
}

const ACCEPT = ["--accept-unconfirmed"];

async function containerAnswers() {
  for (const [mode, label] of [["not_found", "answers 404 not_found as the live gateway does"], ["empty", "answers an empty container"]]) {
    for (const registered of [false, true]) {
      const c = compiled("c.json");
      const owner = newKey(`container-${crypto.randomBytes(3).toString("hex")}.key`);
      const g = await gateway({ chain: "Q-local-1", registered, missingContainer: mode });
      const r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" }, ACCEPT);
      const s = await g.state();
      await g.stop();
      check(`a gateway that ${label} for an empty address lets a ${registered ? "registered" : "new"} deployer deploy once`, r.status === 0 && s.deploys === 1 && r.out.includes("holds the compiled container"), r.out);
    }
  }
  for (const [mode, label] of [["error", "fails the container read"], ["unknown", "answers 404 without not_found"]]) {
    const c = compiled("c.json");
    const owner = newKey(`container-${crypto.randomBytes(3).toString("hex")}.key`);
    const g = await gateway({ chain: "Q-local-1", missingContainer: mode });
    const r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" }, ACCEPT);
    const s = await g.state();
    await g.stop();
    check(`a gateway that ${label} gets no deployment signed`, r.status === 1 && s.deploys === 0 && r.out.includes("get_container"), r.out);
  }
}

async function openState() {
  const c = compiled("c.json");
  const owner = newKey("open-state.key");
  const open = fs.mkdtempSync(path.join(WORK, "open-state-"));
  fs.chmodSync(open, 0o755);
  const closed = fs.mkdtempSync(path.join(WORK, "closed-state-"));
  fs.mkdirSync(path.join(closed, "deploy-sessions"), { mode: 0o755 });
  fs.chmodSync(path.join(closed, "deploy-sessions"), 0o755);
  for (const [label, dir] of [["a state directory", open], ["a session directory", closed]]) {
    const g = await gateway({ chain: "Q-local-1", registered: true });
    const r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes", QUANTOVA_STATE_DIR: dir }, ACCEPT);
    const s = await g.state();
    await g.stop();
    check(`${label} with mode 0755 is refused and nothing is signed`, r.status === 1 && r.out.includes("chmod 700") && s.submits === 0, r.out);
  }
}

async function earlierFar() {
  const container = crypto.randomBytes(64).toString("hex");
  const owner = newKey("far.key");
  const env = (url, c, state) => ({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes", QUANTOVA_STATE_DIR: state });
  const g = await gateway({ chain: "Q-local-1", registered: true });
  const first = run(BASE, "deploy.js", env(g.url, compiled("far-a.json", true, container), STATE), ACCEPT);
  const others = [0, 1, 2].map((i) => run(BASE, "deploy.js", env(g.url, compiled(`far-${i}.json`), STATE), ACCEPT));
  const again = run(BASE, "deploy.js", env(g.url, compiled("far-b.json", true, container), path.join(WORK, `state-${crypto.randomBytes(3).toString("hex")}`)), ACCEPT);
  const s = await g.state();
  await g.stop();
  check("a deployment four nonces back is found without the session file and nothing is signed", first.status === 0 && others.every((o) => o.status === 0) && again.status === 1 && again.out.includes("at nonce 0") && s.deploys === 4, JSON.stringify([again.out, s.deploys]));
}

async function foreignSeed() {
  const c = compiled("c.json");
  const owner = newKey("foreign-owner.key");
  const r = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, CHECK_FOREIGN: owner }, [], 120000, ["--require", SEAM]);
  check("a key file owned by another user is refused", r.status === 1 && r.out.includes("chmod 600"), r.out);
  const control = run(BASE, "deploy.js", { COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, CHECK_FOREIGN: path.join(WORK, "nothing-here") }, [], 120000, ["--require", SEAM]);
  check("the same key file owned by the user passes the owner check", control.status === 1 && !control.out.includes("chmod 600") && control.out.includes("deploy failed"), control.out);
}

async function unconfirmed() {
  const c = compiled("c.json");
  const owner = newKey("u.key");
  const env = (url, more = {}) => Object.assign({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" }, more);
  const g = await gateway({ chain: "Q-local-1" });
  const plan = run(BASE, "deploy.js", env(g.url, { QUANTOVA_SUBMIT: "" }));
  const planned = predicted(plan.out);
  let r = run(BASE, "deploy.js", env(g.url));
  let s = await g.state();
  check("with no roster pinned nothing is signed unless unconfirmed results are accepted", r.status === 3 && r.out.includes("NOT SIGNED") && s.submits === 0, r.out);
  r = run(BASE, "deploy.js", env(g.url), ACCEPT);
  s = await g.state();
  check("an accepted unconfirmed deployment exits 0 and says it is not confirmed", r.status === 0 && r.out.includes("NOT CONFIRMED, accepted") && s.deploys === 1, r.out);
  check("the deployment lands at the planned address", planned && s.containers[planned] && predicted(r.out) === planned, JSON.stringify([planned, s.containers, r.out]));
  r = run(BASE, "deploy.js", env(g.url), ACCEPT);
  s = await g.state();
  check("a rerun after a deployment signs nothing", s.deploys === 1 && r.out.includes("already deployed") && r.status === 0, r.out);
  r = run(BASE, "deploy.js", env(g.url, { QUANTOVA_ACCEPT_UNCONFIRMED: "1" }), ["--redeploy"]);
  s = await g.state();
  check("--redeploy deploys again and the accept variable is honoured", s.deploys === 2 && r.status === 0 && r.out.includes("NOT CONFIRMED, accepted"), r.out);
  await g.stop();
}

async function scope() {
  const container = crypto.randomBytes(64).toString("hex");
  const owner = newKey("scope.key");
  const env = (url, c, more = {}) => Object.assign({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" }, more);
  const g = await gateway({ chain: "Q-local-1", registered: true });
  const first = run(BASE, "deploy.js", env(g.url, compiled("a.json", true, container)), ACCEPT);
  const second = run(BASE, "deploy.js", env(g.url, compiled("b.json", true, container)), ACCEPT);
  const otherState = path.join(WORK, `state-${crypto.randomBytes(3).toString("hex")}`);
  const third = run(BASE, "deploy.js", env(g.url, compiled("c.json", true, container), { QUANTOVA_STATE_DIR: otherState }), ACCEPT);
  const s = await g.state();
  await g.stop();
  check("the same container from another build directory is not deployed twice", first.status === 0 && s.deploys === 1 && second.out.includes("already deployed"), JSON.stringify([second.out, s.deploys]));
  check("an earlier deployment on chain is found without the session file", third.status === 1 && third.out.includes("already deployed this container"), third.out);
}

async function txlost() {
  const c = compiled("c.json");
  const owner = newKey("lost.key");
  const env = (url) => ({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" });
  const g = await gateway({ chain: "Q-local-1", registered: true, dropSubmit: 1 });
  const first = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const dir = path.join(STATE, "deploy-sessions", "Q-local-1");
  const saved = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))).find((rec) => rec.address === predicted(first.out));
  const again = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const s = await g.state();
  await g.stop();
  check("the transaction id is recorded before the deployment is sent", first.status === 1 && saved && saved.state === "sent" && /^QTX1/.test(saved.tx || ""), JSON.stringify([first.out, saved]));
  check("a rerun after a lost submit answer finds the deployment and signs nothing", again.status === 0 && s.deploys === 1 && again.out.includes("already deployed"), again.out);
}

async function pending() {
  const c = compiled("c.json");
  const owner = newKey("pending.key");
  const g = await gateway({ chain: "Q-local-1", registered: true, pendingPolls: 2 });
  const r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" }, ACCEPT);
  await g.stop();
  check("a deployment first reported pending is read back only once finalised", r.status === 0 && r.out.includes("holds the compiled container"), r.out);
}

async function crash() {
  const c = compiled("c.json");
  const owner = newKey("crash.key");
  const env = (url) => ({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" });
  const g = await gateway({ chain: "Q-local-1", rejectSubmit: 2 });
  const first = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const second = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const third = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const s = await g.state();
  await g.stop();
  const at = predicted(first.out);
  check("a deployment refused after registration resumes at the same nonce and lands once", first.status === 1 && second.status === 0 && third.status === 0 && s.deploys === 1 && at && s.containers[at] && predicted(second.out) === at, JSON.stringify([first.out, second.out, third.out, s]));
}

function sessionRecords() {
  const dir = path.join(STATE, "deploy-sessions", "Q-local-1");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
}

async function resend() {
  const c = compiled("c.json");
  const owner = newKey("resend.key");
  const env = (url) => ({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" });
  const g = await gateway({ chain: "Q-local-1", registered: true, rejectSubmit: 1 });
  const first = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const at = predicted(first.out);
  const record = sessionRecords().find((rec) => rec.address === at);
  check("a refused deployment stays recorded as sent with its transaction id", first.status === 1 && record && record.state === "sent" && /^QTX1/.test(record.tx || ""), JSON.stringify([first.out, record]));
  const again = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const after = sessionRecords().find((rec) => rec.address === at);
  const s = await g.state();
  await g.stop();
  check("a resent deployment keeps its record and lands once", again.status === 0 && after && after.state === "accepted" && after.nonce === record.nonce && s.deploys === 1, JSON.stringify([again.out, after, s]));
}

async function staleLater() {
  const c = compiled("c.json");
  const owner = newKey("stale2.key");
  const env = (url) => ({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" });
  const g = await gateway({ chain: "Q-local-1", staleAfterSubmit: 1, staleSkip: 1 });
  const first = run(BASE, "deploy.js", env(g.url), ACCEPT);
  const s = await g.state();
  await g.stop();
  const at = predicted(first.out);
  check("a stale read after the nonce was taken never deploys away from the predicted address", s.deploys === 0 ? first.status === 1 : Boolean(s.containers[at]), JSON.stringify([first.out, s]));
}

async function stale() {
  const c = compiled("c.json");
  const owner = newKey("stale.key");
  const env = (url) => ({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SUBMIT: "yes" });
  const g = await gateway({ chain: "Q-local-1", staleAfterSubmit: 1 });
  const first = run(BASE, "deploy.js", env(g.url), ACCEPT);
  let s = await g.state();
  const firstAt = predicted(first.out);
  const firstOk = s.deploys === 0 ? first.status === 1 : Boolean(s.containers[firstAt]);
  check("a stale nonce read never deploys away from the predicted address", firstOk, JSON.stringify([first.out, s]));
  const again = run(BASE, "deploy.js", env(g.url), ACCEPT);
  s = await g.state();
  await g.stop();
  const at = predicted(again.out) || firstAt;
  check("a rerun after a stale read lands exactly once at the predicted address", s.deploys === 1 && Boolean(s.containers[at]), JSON.stringify([again.out, s]));
}

async function genesis() {
  const c = compiled("c.json");
  const owner = newKey("g.key");
  const G = TESTNET_GENESIS;
  const env = (url, pin, more = {}) => Object.assign({ QUANTOVA_GATEWAY: url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_SUBMIT: "yes", QUANTOVA_FINALITY_FILE: pin }, more);
  const pinG = pinFile("pin-g.json", JSON.stringify({ chain_id: "Q-test-net-01", genesis_hash: G, roster: [] }));
  let g = await gateway({ chain: "Q-test-net-01", genesis: "ab".repeat(32) });
  let r = run(BASE, "deploy.js", env(g.url, pinG), ACCEPT);
  let s = await g.state();
  await g.stop();
  check("a gateway with another genesis than the pin gets nothing signed", r.status === 1 && s.submits === 0, r.out);
  g = await gateway({ chain: "Q-test-net-01", genesis: "ab".repeat(32) });
  r = run(BASE, "interact.js", { QUANTOVA_GATEWAY: g.url, QUANTOVA_FINALITY_FILE: pinG });
  await g.stop();
  check("interact.js refuses a gateway with another genesis than the pin", r.status === 1 && !/^node /m.test(r.stdout), r.out);
  g = await gateway({ chain: "Q-test-net-01", genesis: G });
  r = run(BASE, "deploy.js", env(g.url, pinG));
  s = await g.state();
  if (SIGNS_GENESIS) check("a genesis pin without a roster signs nothing unless unconfirmed results are accepted", r.status === 3 && r.out.includes("NOT SIGNED") && s.submits === 0, r.out);
  else check("a genesis pin on a core that cannot sign over it signs nothing", r.status === 1 && s.submits === 0 && r.out.includes("does not sign over a pinned genesis"), r.out);
  r = run(BASE, "deploy.js", env(g.url, pinG), ACCEPT);
  s = await g.state();
  await g.stop();
  if (VERIFIES_HEAD) check("a genesis pin without a roster gets nothing signed on the public chain", r.status === 1 && s.submits === 0 && r.out.includes("must be verified against a trusted validator roster"), r.out);
  else if (SIGNS_GENESIS) check("a matching genesis pin signs when unconfirmed results are accepted", r.status === 0 && s.deploys === 1, r.out);
  else check("a genesis pin on a core that cannot sign over it signs nothing even when unconfirmed results are accepted", r.status === 1 && s.submits === 0, r.out);
  g = await gateway({ chain: "Q-test-net-01", genesis: G });
  r = run(BASE, "deploy.js", { QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_SUBMIT: "yes" }, ACCEPT);
  s = await g.state();
  await g.stop();
  if (TESTNET_GENESIS === BUILT_IN_GENESIS) check("the public chain with only the genesis QCore.js carries gets nothing signed without a verified head", r.status === 1 && s.submits === 0 && r.out.includes("must be verified against a trusted validator roster"), r.out);
  else check("the public chain with no pinned genesis gets nothing signed", r.status === 1 && s.submits === 0 && r.out.includes("needs QCore.js 0.9.0 or later and the genesis hash"), r.out);
}

async function proven() {
  if (!SIGNS_GENESIS) {
    console.log(`skip proven deployments, QCore.js ${VERSION} cannot sign over a pinned genesis`);
    return;
  }
  const G = TESTNET_GENESIS;
  const scenario = async (label, settings, pinFrom, want, more = {}, args = []) => {
    const c = compiled("c.json", settings.events !== false);
    const owner = newKey(`p-${crypto.randomBytes(3).toString("hex")}.key`);
    const out = path.join(WORK, `rosters-${crypto.randomBytes(3).toString("hex")}.json`);
    const g = await gateway(Object.assign({ chain: "Q-test-net-01", genesis: G, deployedSelector: SELECTOR, rosterOut: out }, settings));
    const pin = pinFile(`pin-${crypto.randomBytes(3).toString("hex")}.json`, JSON.stringify(Object.assign({ chain_id: "Q-test-net-01", genesis_hash: G }, pinFrom(rosters(out)))));
    const r = run(BASE, "deploy.js", Object.assign({ QUANTOVA_GATEWAY: g.url, COMPILED_CONTRACT_PATH: c, QUANTOVA_DEPLOYER_KEY_FILE: owner, QUANTOVA_SUBMIT: "yes", QUANTOVA_FINALITY_FILE: pin }, more), args);
    const s = await g.state();
    await g.stop();
    check(label, want(r, s), JSON.stringify([r.out, s.methods.join(",")]));
  };
  const plain = (x) => ({ roster: x.epochs[0].roster });
  await scenario("a deployment proven by certificate and event is settled", {}, plain, (r) => r.status === 0 && r.out.includes("It is settled"));
  await scenario("a deployment the gateway first reports pending waits for finality", { pendingPolls: 2 }, plain, (r) => r.status === 0 && r.out.includes("It is settled"));
  await scenario("a Deployed event with other data fails", { event: "tamper" }, plain, (r) => r.status === 1 && r.out.includes("another owner"));
  await scenario("a Deployed event outside the certified event root fails", { event: "unproven" }, plain, (r) => r.status === 1 && r.out.includes("not proven under the certified event root"));
  await scenario("a Deployed event of another contract fails", { event: "other" }, plain, (r) => r.status === 1 && r.out.includes("no Deployed event"));
  await scenario("a block with no Deployed event fails", { event: "none" }, plain, (r) => r.status === 1 && !r.out.includes("It is settled"));
  await scenario("a contract without a Deployed event ends unconfirmed", { events: false }, plain, (r) => r.status === 3 && r.out.includes("declares no"));
  await scenario("a certificate from validators outside the pin fails", { wrongRoster: true }, plain, (r) => r.status === 1 && !r.out.includes("It is settled"));
  await scenario("a gateway without proofs fails", { noProofs: true }, plain, (r) => r.status === 1 && !r.out.includes("It is settled"));
  await scenario("a gateway that places the transaction at another height than its proof fails", { heightSkew: 1 }, plain, (r) => r.status === 1 && r.out.includes("but proved it at height"));
  await scenario("per epoch rosters prove a block across an epoch change", { rotate: true, head: 16 * 313 - 1, rosterEpochs: 24 }, (x) => ({ roster: [], epochs: x.epochs }), (r) => r.status === 0 && r.out.includes("It is settled"));
  await scenario("a roster pinned for the epoch wins over the roster for other epochs", { rotate: true, head: 16 * 313 - 1, rosterEpochs: 24 }, (x) => ({ roster: x.epochs[0].roster, epochs: x.epochs.slice(1) }), (r) => r.status === 0 && r.out.includes("It is settled"));
  await scenario("a pin without the roster of the coming epoch signs nothing", { rotate: true }, (x) => ({ roster: [], epochs: [x.epochs[2]] }), (r, s) => r.status === 1 && s.submits === 0 && r.out.includes("holds no validator roster for epoch"));
  await scenario("the accept flag does not hide a failed proof", { wrongRoster: true }, plain, (r) => r.status === 1, { QUANTOVA_ACCEPT_UNCONFIRMED: "1" });
}

try {
  console.log(`QCore.js ${VERSION}`);
  await offline();
  await gatewayText();
  await unconfirmed();
  await containerAnswers();
  await openState();
  await earlierFar();
  await foreignSeed();
  await scope();
  await txlost();
  await pending();
  await crash();
  await resend();
  await stale();
  await staleLater();
  await genesis();
  await proven();
} finally {
  fs.rmSync(WORK, { recursive: true, force: true });
}
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
