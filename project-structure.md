# Project Structure

What every file in the template is for.

```
.
├── README.md                 Project entry point and quickstart
├── package.json              Scripts and the QCore.js dependency
├── client.js                 Gateway client over HTTP POST to /v1/<method>
├── interact.js               Read node info, head, params, supply, balance
├── deploy.js                 Build, sign, and submit a QVM container deploy
├── ExampleQAsset.quanta      Example QAsset fungible token in Quanta
├── getting-started.md        Toolchain, install, configure, first read
├── interacting.md            Read state and send signed transactions
├── deploying.md              Compile and deploy the example QAsset
└── project-structure.md      This guide
```

## How the pieces fit

1. `client.js` is a thin client over the gateway. Both scripts import it. Set QUANTOVA_GATEWAY to your gateway endpoint.
2. `interact.js` is a read only smoke test that prints chain state.
3. `deploy.js` shows the deploy shape and signs with the QCore.js keyring using an ML-DSA-65 key.
4. `ExampleQAsset.quanta` is the contract you compile to a QVM container and deploy.

## Where the SDK comes in

The QCore family is the client SDK. QCore.js is published on npm as @quantovainc/qcore, QCore.rs is the Rust core, and QCore.py is the Python binding. This template uses QCore.js for key management and for signing transactions with ML-DSA-65. The gateway client in `client.js` covers the read and submit surface.
