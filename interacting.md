# Interacting

Read state and send transactions with the gateway client in `client.js`.

## Reading state

```js
import { Gateway } from "./client.js";

const gateway = new Gateway(process.env.QUANTOVA_GATEWAY);

const head = await gateway.head();
const params = await gateway.chainParams();
const balance = await gateway.balanceQTOV("Q1q9k...a91b");
```

A few things to keep in mind.

1. Account addresses are Q1 bech32m strings written with a capital Q. There are no 0x addresses.
2. Amounts are denominated in Quon, and one QTOV is one million Quon. The `balanceQTOV` helper converts Quon to QTOV for you.
3. Every read is an HTTP POST to /v1/<method> with a flat JSON body, and the response is flat JSON.

## Sending a transaction

The path is sign locally, then submit. The QCore.js Client behind `gateway.client` does both.

1. It reads the chain id, the head and the fee from `node_info` and the account nonce from `get_account`.
2. It signs with the account ML-DSA-65 key at the next nonce, bounds the validity of the transaction by the chain head and refuses a fee above the ceiling you pass.
3. It submits the signed transaction with `submit_transaction`, and you wait until the gateway reports it finalised.

```js
const { signed, outcome } = await gateway.client.transfer(seed, 0, to, "1000000", "2000");
if (outcome.verdict !== "accepted") throw new Error("the transfer was refused");
const recorded = await gateway.waitForTransaction(outcome.tx_id || signed.tx_id);
const proof = await gateway.confirm(signed.tx_id, recorded.height);
```

The amount and the fee ceiling are whole numbers of Quon written as strings. Pass no nonce for a normal send. The Client then picks the nonce itself and refuses to sign a second transaction for a nonce it already signed in this session, so one nonce never carries two signatures. Never read the nonce from the gateway and pass it back as the expected nonce, because that switches the guard off.

The only time to pass an expected nonce is to replace a transaction that never landed. Record the nonce of each transaction you sign at the moment you sign it, and pass that recorded nonce as the last argument only when you deliberately sign a replacement for that same transaction. `gateway.client.saveSession()` returns the record of the nonces this session signed, and `gateway.client.restoreSession(state)` brings it back after a restart.

`gateway.confirm` proves the transaction final against the genesis hash pinned in `finality-pin.json` and the roster pinned for the epoch of the block at the height you pass, as described in `deploying.md`. It returns null while no roster is pinned, and then the transaction is accepted but its finality is not confirmed. It throws when the pin holds no roster for that epoch or when the proof does not hold.

Print gateway text through `printable` from `client.js`, which drops control, format, private use and default ignorable characters such as variation selectors, turns spaces and invisible filler characters into single spaces, keeps at most two stacked combining marks and caps the result at 96 characters, and check heights with `height`, which accepts only whole numbers. Signing for Q-test-net-01 needs QCore.js 0.9.0 or later and the network genesis pinned in `finality-pin.json`, and `gateway.requireSigning()` throws when they are missing.

## Finality

A recorded transaction is included. QORUS gives deterministic finality, and a finalized block does not reorg. Treat value as settled only after `gateway.confirm` returns a proof that the block carrying the transaction is finalized. For anything that moves funds, wait for that proof before showing success.

## Gateway methods

The gateway is an HTTP POST to /v1/<method> with a flat JSON body.

1. `node_info` returns node identity, version, and network name.
2. `head` returns the current chain head and height.
3. `validators` returns the active QORUS committee.
4. `chain_params` returns the chain id and parameters.
5. `get_account` returns an account record, including balance in Quon and nonce.
6. `get_transaction` returns a transaction by hash.
7. `submit_transaction` submits a signed transaction and returns the accepted hash.
8. `get_block` returns a block by height.
9. `supply` returns total and circulating supply in Quon.
10. `get_container` returns the deployed container at a contract address.
11. `get_storage` returns the storage slots of a container.
12. `get_events` returns the events emitted at a height.

The full reference is in the developer documentation.
