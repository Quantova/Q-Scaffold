# Getting Started

Set up the template and make your first read against Quantova.

## Prerequisites

1. Node.js version 18 or newer. This template uses ES modules.
2. QCore.js for signing, published on npm as @qunatovainc/qcore.
3. The Quanta compiler for contract work, which lowers Quanta source to a QVM container.

## Install

```bash
git clone https://github.com/Quantova/Q-Scaffold.git my-quantova-app
cd my-quantova-app
npm install
```

## Configure

Set the gateway endpoint in your shell or in a local env file.

```bash
export QUANTOVA_GATEWAY="http://127.0.0.1:8080"
```

Set QUANTOVA_GATEWAY to your gateway endpoint. The current testnet gateway URL is listed in the developer documentation. A local node serves the gateway on port 8080 by default. Optionally set QUANTOVA_ADDRESS to a Q1 address to print its balance, and set QUANTOVA_DEPLOYER_KEY only when you are ready to deploy, using a testnet key.

## Get testnet funds

Claim free TQTOV from the faucet, which is linked from the developer documentation. TQTOV behaves like QTOV for development and has no monetary value.

## Confirm connectivity

```bash
npm run interact
```

You should see node info, the chain head, chain parameters, and supply. If you set QUANTOVA_ADDRESS you also see its QTOV balance.

## Next steps

1. Read `project-structure.md` for what each file does.
2. Read `interacting.md` to read state and send signed transactions.
3. Read `deploying.md` to compile and deploy the example QAsset.
