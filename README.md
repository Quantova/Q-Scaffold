# Quantova Dev Base Template

A minimal starter template for building on Quantova, a post quantum Layer 1 blockchain. Use this template to scaffold a project that reads chain state, deploys a contract to the Quantova Virtual Machine, and sends signed transactions through the gateway. It targets the testnet today.

Quantova's cryptography, virtual machine, contract language, and consensus are built on the NIST post quantum standards, so the keys, signatures, finality, and randomness that secure the network are designed to withstand both classical and quantum attack. Signatures use ML-DSA-65 and key exchange uses ML-KEM-768. Quantova is at the testnet stage and has not yet completed external audit.

## What this template shows

1. Reading chain state from the gateway with a small client.
2. A QAsset fungible token written in Quanta and compiled to a QVM container.
3. The shape of a deploy transaction, signed with QCore.js and submitted to the gateway.

## The stack in one paragraph

The virtual machine is the QVM, which executes compiled containers on a deterministic register machine, with post quantum signature verification, hashing, and Merkle proof checking as native instructions. Consensus is QORUS. A committee is sampled by sortition each round to attest to a proposed block, and finality is recorded as a single aggregated certificate under ML-DSA-65 keys. The committee is bounded, so the work to finalize a block does not grow with the validator set. Cryptography is Q-Crypto, Quantova's implementation of the NIST post quantum standards, with ML-DSA-65 for signatures, ML-KEM-768 for key exchange, SLH-DSA, SHA-3 with SHAKE, and ChaCha20-Poly1305 for the transport channel. Addresses are Q1 bech32m strings written with a capital Q. The asset is QTOV and its base unit is the Quon, where one QTOV is one million Quon. The testnet asset is TQTOV. The contract language is Quanta, where assets are linear resources and authority is a capability, so whole classes of vulnerability are caught at compile time. The fungible standard is QAsset and the non fungible standard is QCollectible. The name service is QNS, with domains under a capital Q top level like Jeff.Q.

## Quickstart

```bash
git clone https://github.com/Quantova/Q-Scaffold.git my-quantova-app
cd my-quantova-app
npm install
```

Point the client at a gateway.

```bash
export QUANTOVA_GATEWAY="http://127.0.0.1:8645"
npm run interact
```

Set QUANTOVA_GATEWAY to your gateway endpoint. The current testnet gateway URL is listed in the developer documentation. A local node serves the gateway on port 8645 by default.

## What is inside

1. `client.js` is a dependency light client over the gateway. Every call is an HTTP POST to /v1/<method> with a flat JSON body.
2. `interact.js` reads node info, the chain head, chain parameters, supply, and an optional account balance.
3. `ExampleQAsset.quanta` is a QAsset fungible token written in Quanta.
4. `deploy.js` builds a deploy transaction, signs it with QCore.js, and submits it to the gateway.
5. `getting-started.md`, `interacting.md`, `deploying.md`, and `project-structure.md` are the guides.

## The gateway

The gateway is an HTTP POST to /v1/<method> with a flat JSON body. The methods are node_info, head, validators, chain_params, get_account, get_transaction, submit_transaction, get_block, supply, get_container, get_storage, and get_events. The full reference is in the developer documentation.

## The SDK

The client SDK is the QCore family. QCore.rs is the Rust core. QCore.js is published on npm as @quantovainc/qcore. QCore.py is the Python binding. Use QCore.js for key management and for signing transactions with ML-DSA-65.

## Conventions this template follows

1. Addresses are Q1 bech32m strings written with a capital Q. There are no 0x addresses.
2. Amounts are denominated in Quon, and one QTOV is one million Quon. Divide a Quon amount by one million to read QTOV.
3. Reads and submissions go through the gateway over HTTP POST to /v1/<method>.
4. Transactions are signed locally with an ML-DSA-65 key using QCore.js, then submitted with submit_transaction.
5. A recorded transaction is included. Value is settled on QORUS finality, and a finalized block does not reorg.

## Links

1. Website https://quantova.org
2. Developer documentation, listed on the website
3. Developer content, the developer-content repository
4. Consensus specifications, the consensus-specs repository
5. Security policy and how to report, the security documentation repository

## License

Quantova Inc, 2026. See LICENSE.
