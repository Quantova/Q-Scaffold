# Interacting

Read state and send transactions with the gateway client in `client.js`.

## Reading state

```js
import { Gateway } from "./client.js";

const gateway = new Gateway(process.env.QUANTOVA_GATEWAY);

const head = await gateway.head();                 // chain head and height
const params = await gateway.chainParams();        // chain id and parameters
const balance = await gateway.balanceQTOV("Q1q9k...a91b"); // QTOV
```

A few things to keep in mind.

1. Account addresses are Q1 bech32m strings written with a capital Q. There are no 0x addresses.
2. Amounts are denominated in Quon, and one QTOV is one million Quon. The `balanceQTOV` helper converts Quon to QTOV for you.
3. Every read is an HTTP POST to /v1/<method> with a flat JSON body, and the response is flat JSON.

## Sending a transaction

The path is sign locally, then submit.

1. Build the payload with the account nonce from `nonce`, the chain id from `chainParams`, and the fee and value in Quon.
2. Sign it with the account ML-DSA-65 key using the QCore.js keyring.
3. Submit the signed payload with `submitTransaction`, then poll for the record.

```js
const nonce = await gateway.nonce(myAddress);
// const signed = await account.signTransaction({ to, value, nonce, chainId });
const { hash } = await gateway.submitTransaction(signed);
const recorded = await gateway.waitForTransaction(hash);
```

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
8. `get_block` returns a block by height or by hash.
9. `supply` returns total and circulating supply in Quon.
10. `get_container` returns the deployed container at a contract address.
11. `get_storage` returns a storage slot of a container.
12. `get_events` returns emitted events matching a filter.

The full reference is in the developer documentation.
