# Deploying

Compile and deploy the example QAsset in `ExampleQAsset.quanta` to the QVM.

## Compile

The contract is written in Quanta, the Quantova contract language. The Quanta compiler lowers it to a QVM container, which the register machine runs. Compile the source and write the compiled contract, with its container and its deploy parameters, to the build directory.

```bash
mkdir -p build
quanta-cli emit ExampleQAsset.quanta > build/ExampleQAsset.json
```

Point COMPILED_CONTRACT_PATH at the resulting file. The default is `./build/ExampleQAsset.json`.

## Fund a deployer

Set QUANTOVA_DEPLOYER_KEY_FILE to a file that holds a testnet key funded from the faucet, written as 64 lowercase hex characters, and make it readable only by you with chmod 600. The key is never read from the environment, so child processes, crash reports and CI logs cannot capture it. Never commit a real key. Keep it out of the repository.

## Deploy

```bash
npm run deploy:testnet
```

`deploy.js` does the following.

1. Reads the chain id and the head from `node_info` and the account nonce from `get_account`.
2. Builds a deploy transaction that carries the compiled container and the QAsset constructor arguments, the deployer as owner and QUANTOVA_INITIAL_SUPPLY in Quon as the initial supply.
3. Signs it locally with the ML-DSA-65 deployer key using the QCore.js Client, which binds it to the chain the gateway reports, bounds its validity by the chain head, signs at the nonce the gateway reports and refuses a fee above QUANTOVA_MAX_FEE_QUON, a ceiling you choose yourself.
4. Submits it with `submit_transaction`, waits for the record and reads the container back at the predicted address.

For safety the template stops before signing unless QUANTOVA_SUBMIT is set to yes, so a misconfigured key cannot spend by accident. Without it the script prints the deployer, the fee and the predicted container address.

```bash
QUANTOVA_SUBMIT=yes npm run deploy:testnet
```

The template signs for the testnet Q-test-net-01 by default. A gateway that reports any other chain, such as a local node, is signed for only when QUANTOVA_CHAIN names that chain.

## Confirm

Treat the deployment as settled only after the block that carries it is finalized by QORUS. Read the deployed container back with `get_container` and check it against your compiled artifact.

## Notes on the chain today

Quantova is at the testnet stage. Contract pricing and the set of enabled container features move as the testnet matures, so read the developer documentation for what is enabled on the network you target.
