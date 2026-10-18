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
2. It signs with the account ML-DSA-65 key, bounds the validity of the transaction by the chain head and refuses a fee above the ceiling you pass.
3. It submits the signed transaction with `submit_transaction`, and you poll for the record.

```js
const nonce = await gateway.nonce(myAddress);
const { signed, outcome } = await gateway.client.transfer(seed, 0, to, "1000000", "2000", nonce);
const recorded = await gateway.waitForTransaction(signed.tx_id);
```

The amount and the fee ceiling are whole numbers of Quon written as strings. The last argument is the nonce you expect, which must be the nonce the gateway reports.

## Finality

A recorded transaction is included. QORUS gives deterministic finality, and a finalized block does not reorg. Treat value as settled only after the block that carries the transaction is finalized. For anything that moves funds, wait for finality before showing success.

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
