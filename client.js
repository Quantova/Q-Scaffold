// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Quantova gateway client.
 *
 * A small, dependency light wrapper over the Quantova gateway. Every call is an
 * HTTP POST to /v1/<method> with a flat JSON body, and the response is flat JSON.
 * Account addresses are Q1 bech32m strings written with a capital Q. Balances and
 * amounts are denominated in Quon, the base unit of QTOV, where one QTOV is one
 * million Quon.
 *
 * For signing and key management use the QCore.js SDK, published on npm as
 * @quantovainc/qcore. This file covers the read and submit surface of the gateway.
 * See interacting.md for the full method list.
 */

const DEFAULT_GATEWAY = process.env.QUANTOVA_GATEWAY || "http://127.0.0.1:8080";

/** One QTOV is one million Quon. */
export const QUON_PER_QTOV = 1_000_000n;

export class Gateway {
  constructor(baseUrl = DEFAULT_GATEWAY) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** Low level call. POST /v1/<method> with a flat JSON body. */
  async post(method, body = {}) {
    const res = await fetch(`${this.baseUrl}/v1/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`gateway ${method} returned HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) throw new Error(`gateway ${method} error ${data.error}`);
    return data;
  }

  // read methods

  /** Node identity, software version, and network name. */
  nodeInfo() {
    return this.post("node_info");
  }

  /** The current chain head, height and finalized status. */
  head() {
    return this.post("head");
  }

  /** The active QORUS committee for the current view. */
  validators() {
    return this.post("validators");
  }

  /** Chain parameters, including the chain id used when signing. */
  chainParams() {
    return this.post("chain_params");
  }

  /** Account record for a Q1 address, including balance and nonce. */
  getAccount(address) {
    return this.post("get_account", { address });
  }

  /** A transaction by its hash. */
  getTransaction(hash) {
    return this.post("get_transaction", { hash });
  }

  /** A block by height or by hash. Pass { height } or { hash }. */
  getBlock(ref) {
    return this.post("get_block", ref);
  }

  /** Total and circulating supply, denominated in Quon. */
  supply() {
    return this.post("supply");
  }

  /** The deployed container at a contract address. */
  getContainer(address) {
    return this.post("get_container", { address });
  }

  /** A storage slot of a container. */
  getStorage(address, key) {
    return this.post("get_storage", { address, key });
  }

  /** Emitted events matching a filter. */
  getEvents(filter = {}) {
    return this.post("get_events", filter);
  }

  // submit

  /**
   * Submit an already signed transaction produced by QCore.js. The signed
   * payload carries an ML-DSA-65 signature. Returns the accepted transaction hash.
   */
  submitTransaction(signedTransaction) {
    return this.post("submit_transaction", { transaction: signedTransaction });
  }

  // convenience

  /** Balance of a Q1 address in QTOV, converted from Quon. */
  async balanceQTOV(address) {
    const account = await this.getAccount(address);
    const quon = BigInt(account.balance);
    const whole = quon / QUON_PER_QTOV;
    const frac = quon % QUON_PER_QTOV;
    return Number(whole) + Number(frac) / Number(QUON_PER_QTOV);
  }

  /** Account nonce, the value to set on the next transaction you build. */
  async nonce(address) {
    const account = await this.getAccount(address);
    return Number(account.nonce);
  }

  /**
   * Poll get_transaction until the transaction is recorded, then return it.
   * A recorded transaction is included. Confirm QORUS finality before treating
   * value as settled. See interacting.md.
   */
  async waitForTransaction(hash, { intervalMs = 1000, timeoutMs = 60000 } = {}) {
    const start = Date.now();
    for (;;) {
      const tx = await this.getTransaction(hash).catch(() => null);
      if (tx && tx.hash) return tx;
      if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for the transaction");
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

export default Gateway;
