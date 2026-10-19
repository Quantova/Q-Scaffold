# Getting Started

Set up the template and make your first read against Quantova.

## Prerequisites

1. Node.js version 18 or newer. This template uses ES modules.
2. QCore.js for signing, published on npm as @quantovainc/qcore.
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
export QUANTOVA_GATEWAY="http://127.0.0.1:8645"
```

Set QUANTOVA_GATEWAY to your gateway endpoint. The gateway URL for the live network Q-test-net-01 is listed in the developer documentation. A local node serves the gateway on port 8645 by default. Optionally set QUANTOVA_ADDRESS to a Q1 address to print its balance, and set QUANTOVA_DEPLOYER_KEY_FILE only when you are ready to deploy, naming a file that holds the deployer key and is readable only by you. Keep that file outside the project directory, for example in `~/.quantova`, so it can never be committed.

## Get TQTOV

Claim free TQTOV from the faucet, which is linked from the developer documentation. TQTOV is the native test asset of the live network Q-test-net-01. It behaves like QTOV for development and has no monetary value.

## Confirm connectivity

```bash
npm run interact
```

You should see node info, the chain head, chain parameters, and supply. If you set QUANTOVA_ADDRESS you also see its QTOV balance.

## Next steps

1. Read `project-structure.md` for what each file does.
2. Read `interacting.md` to read state and send signed transactions.
3. Read `deploying.md` to compile and deploy the example QAsset.
