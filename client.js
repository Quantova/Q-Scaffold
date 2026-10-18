// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { Client, Network, core } from "@quantovainc/qcore";

const TESTNET = Network.testnet();
const DEFAULT_GATEWAY = process.env.QUANTOVA_GATEWAY || TESTNET.rpcUrl;
const TIMEOUT_MS = 15000;
const RESPONSE_MAX = 8 * 1024 * 1024;

export const QUON_PER_QTOV = 1_000_000n;

function chainOf(options) {
  const named = options.expectedChainId || process.env.QUANTOVA_CHAIN;
  return typeof named === "string" && named.length > 0 ? named : TESTNET.chainId;
}

function wholeNumber(value, label) {
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== "string" || !/^(0|[1-9][0-9]*)$/.test(text)) throw new Error(`the gateway reported a ${label} that is not a whole number`);
  return BigInt(text);
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

export class Gateway {
  constructor(baseUrl, options = {}) {
    const target = (baseUrl || DEFAULT_GATEWAY).replace(/\/+$/, "");
    const network = target === TESTNET.rpcUrl ? TESTNET : undefined;
    this.fetch = options.fetch || ((url, init) => fetch(url, init));
    this.client = new Client(target, { network, expectedChainId: chainOf(options), fetch: this.fetch, addressBook: options.addressBook });
    this.baseUrl = this.client.base;
  }

  async read(method) {
    const res = await this.fetch(`${this.baseUrl}/v1/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    const text = await readBounded(res);
    if (res.status !== 200) throw new Error(`gateway ${method} returned HTTP ${res.status}`);
    core.checkGatewayJson(text);
    return JSON.parse(text);
  }

  nodeInfo() {
    return this.client.nodeInfo();
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

  getBlock(height) {
    return this.client.block(height);
  }

  getContainer(address) {
    return this.client.container(address);
  }

  getStorage(address) {
    return this.client.storage(address);
  }

  getEvents(height) {
    return this.client.events(height);
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

  async nonce(address) {
    const account = await this.getAccount(address);
    return wholeNumber(account.nonce, "nonce");
  }

  async waitForTransaction(txId, { intervalMs = 1000, timeoutMs = 60000 } = {}) {
    const start = Date.now();
    for (;;) {
      const tx = await this.getTransaction(txId).catch(() => null);
      if (tx && tx.tx_id === txId && Number.isSafeInteger(tx.height)) return tx;
      if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for the transaction");
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

export default Gateway;
