# Deploying

Compile and deploy the example QAsset in `ExampleQAsset.quanta` to the QVM.

## Compile

The contract is written in Quanta, the Quantova contract language. The Quanta compiler lowers it to a QVM container, which the register machine runs. Compile the source and write the container to the build directory.

```bash
quanta build ExampleQAsset.quanta -o build/ExampleQAsset.qvm
```

Point COMPILED_CONTAINER_PATH at the resulting container. The default is `./build/ExampleQAsset.qvm`.

## Fund a deployer

Set QUANTOVA_DEPLOYER_KEY to a testnet key funded from the faucet. Never commit a real key. Keep it out of the repository.

## Deploy

```bash
npm run deploy:testnet
```

`deploy.js` does the following.

1. Reads the chain id from `chain_params` and the account nonce from `get_account`.
2. Builds a deploy transaction that carries the compiled container and the QAsset constructor arguments.
3. Signs it locally with the ML-DSA-65 deployer key using the QCore.js keyring.
4. Submits it with `submit_transaction` and waits for the record, which carries the new container address.

For safety the template stops before submitting until you wire in the real signed payload, so a misconfigured key cannot spend by accident. The script prints the prepared transaction and the next step.

## Confirm

Treat the deployment as settled only after the block that carries it is finalized by QORUS. Read the deployed container back with `get_container` and check it against your compiled artifact.

## Notes on the chain today

Quantova is at the testnet stage. Contract pricing and the set of enabled container features move as the testnet matures, so read the developer documentation for what is enabled on the network you target.
