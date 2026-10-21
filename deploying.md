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

Set QUANTOVA_DEPLOYER_KEY_FILE to a file that holds the deployer key, funded with TQTOV from the faucet, written as 64 lowercase hex characters, and make it readable only by you with chmod 600. The key is never read from the environment, so child processes, crash reports and CI logs cannot capture it. The file is opened without following a symbolic link and without waiting on a pipe, and it must be a regular file that nobody else can read. Keep the key file outside the project directory, for example in `~/.quantova/deployer.key`, so it can never be committed. The template `.gitignore` also ignores key and seed files in any letter case and a `keys` directory, and CI fails if a key, seed, wallet or env file is ever tracked or if any tracked file holds a line of 64 hex characters. Never commit a real key.

## Deploy

```bash
npm run deploy:testnet
```

`deploy.js` does the following.

1. Reads the chain id, the genesis hash and the head from `node_info` and refuses to go on when the chain is not the configured one, when the genesis is not the pinned one or when the head height is not a whole number.
2. Registers the deployer key first when it is not on chain yet, and waits until the gateway reports the registration finalised.
3. Reads the account nonce once and derives the predicted container address from that nonce.
4. Records the attempt in a session file before it signs. See Reruns below.
5. Builds a deploy transaction that carries the compiled container and the QAsset constructor arguments, the deployer as owner and QUANTOVA_INITIAL_SUPPLY in Quon as the initial supply.
6. Signs it locally with the ML-DSA-65 deployer key in one call on a fresh QCore.js Client, at exactly the nonce it read, so the signed nonce and the predicted address always match. The Client binds the transaction to the configured chain, bounds its validity by the chain head and refuses a fee above QUANTOVA_MAX_FEE_QUON, a ceiling you choose yourself. When the gateway reports another nonce at that moment, nothing is signed.
7. Submits it with `submit_transaction`, waits until the gateway reports the transaction finalised and reads the container back at the predicted address.
8. Proves the deployment. See Confirm below.

For safety the template stops before signing unless QUANTOVA_SUBMIT is set to yes, so a misconfigured key cannot spend by accident. Without it the script prints the chain it is configured for, the deployer, the fee and the predicted container address, and says when a registration comes first.

```bash
QUANTOVA_SUBMIT=yes npm run deploy:testnet
```

The template signs for the live network Q-test-net-01 by default. A gateway that reports any other chain, such as a local node, is signed for only when QUANTOVA_CHAIN names that chain.

## Reruns

Before it signs, `deploy.js` writes the chain, the genesis hash, the deployer, the nonce, the predicted address and a hash of the container to a session file of your own user, `~/.quantova/deploy-sessions/<chain>/<deployer>-<container hash>.json`, so every build directory and every copy of the project shares it. The directories are created closed to other users with mode 700 and the file with mode 600, and a directory or file that is a link or belongs to another user, a directory open to other users and a file other users can write are all refused. QUANTOVA_STATE_DIR moves the `~/.quantova` directory, and QUANTOVA_DEPLOY_SESSION names one file instead. The file is written to a temporary file, flushed to disk and renamed into place, so a crash leaves either the old record or the new one. Just before the signed transaction leaves for the gateway, the record is marked as sent together with its transaction id, which the client computes when it signs, so a run that loses the answer of the gateway still knows which transaction to look for.

A later run with the same deployer on the same chain checks the recorded address first. When the compiled container is already there it signs nothing and proves the earlier transaction instead. When nothing is there and the account is still at the recorded nonce, it signs again at that same nonce, so at most one of the two transactions can land and the deployment is paid for once. When the account has moved past the recorded nonce without leaving the container, it stops and asks you to check by hand. A record that was prepared but never sent is discarded.

Without a session file, for example on another machine, `deploy.js` still looks on chain before it signs. It checks the addresses this deployer reached at its last 64 nonces and refuses to sign when one of them already holds the compiled container.

Pass `--redeploy` to deploy another copy on purpose at the current nonce.

```bash
QUANTOVA_SUBMIT=yes npm run deploy:testnet -- --redeploy
```

## Confirm

`deploy.js` treats a deployment as settled only after it proves two things itself. First it calls the QCore.js Client `confirmTransaction` with the transaction id it signed and with the genesis hash and validator roster you pin. The Client checks the QORUS finality certificate of the block that carries the deployment against that genesis hash and roster, then checks that the transaction is inside that block. Then `deploy.js` reads the events of that block with `get_event_proof`, checks each one against the event root of the certified header with `verifyEvent` and decodes it with `decodeEvent`, and requires the `Deployed` event that the contract at the predicted address emits from its genesis, carrying the owner and initial supply of this deploy. The chain records that event only when the genesis of the new contract ran to completion, so it proves that the contract exists at that address with the constructor arguments you chose. The genesis hash and roster are never taken from `node_info` or from any other gateway answer.

The pin lives in `finality-pin.json` at the root of the project. To keep your own pin elsewhere, name the file with QUANTOVA_FINALITY_FILE. A pin file must be a regular file owned by the user who runs the script that nobody else can write, and it is never read through a symbolic link.

```json
{
  "chain_id": "Q-test-net-01",
  "genesis_hash": "64 hex characters",
  "roster": [],
  "epochs": [
    {
      "epoch": 80,
      "roster": [
        { "id": 0, "stake": "1000", "attest_pk": "hex", "root": "hex", "root_slots": "65536" }
      ]
    }
  ]
}
```

Take the genesis hash and the rosters from a source you trust, such as the chain parameters Quantova publishes or a node you run yourself, never from the gateway you deploy through. Each roster lists exactly the validators of one epoch, each with its id, its stake, its attestation key, its sortition root and the number of slots that root covers, as `get_validator_set` serves them. The number of slots is the epoch length, so the epoch of a block is its height divided by it. Sortition roots change every epoch, so list one roster per epoch under `epochs`. A roster under `roster` is used for any epoch that `epochs` does not name. Before it signs, `deploy.js` checks that the pin holds a roster for every epoch the transaction can land in, from the epoch of the head to the epoch of the last block in its validity window, and refuses to sign when one is missing.

The repository ships `finality-pin.json` with an empty genesis hash and roster until the values for Q-test-net-01 are published. An empty default pin is ignored, while a filled default pin that names another chain than the configured one stops the script. Signing for Q-test-net-01 or any mainnet chain needs QCore.js 0.9.0 or later and the genesis hash of that network pinned in `finality-pin.json`, because the chain only accepts transactions signed over its genesis. Without both, `deploy.js` refuses to sign. Reading the chain works with any release.

1. QCore.js 0.9.0 and later sign every transaction over the genesis hash and refuse a gateway that names another genesis. The client is built so that the pinned genesis is the one it signs over, and a genesis built into the core that differs from the pin stops the script.
2. QCore.js 0.8.0 and earlier cannot sign over a genesis, so the scripts refuse to sign for the public network with them and ask you to install QCore.js 0.10.0, which this template pins. They still sign for a local chain that QUANTOVA_CHAIN names.

When no validator roster is pinned, the finality of a deployment cannot be proven, so `deploy.js` prints NOT SIGNED and exits with status 3 before it signs anything. When a roster is pinned but misses an epoch the transaction can land in, it stops with exit status 1, also before signing. Pass `--accept-unconfirmed`, or set QUANTOVA_ACCEPT_UNCONFIRMED=1, to sign anyway and accept an unconfirmed deployment. The script then signs, and when the deployment cannot be proven, because no roster covers the epoch of its block or the contract declares no `Deployed(Q_Address,u128)` event, it prints NOT CONFIRMED, says that you accepted that, and exits with status 0. A proof that fails, such as a certificate that does not verify against the pinned roster or an event that names another owner, always ends with an error and exit status 1, with or without the flag.

```bash
QUANTOVA_SUBMIT=yes npm run deploy:testnet -- --accept-unconfirmed
```

Read the deployed container back with `get_container` and check it against your compiled artifact.

## Notes on the chain today

The Quantova network Q-test-net-01 is live, and its native asset TQTOV is a test asset. Contract pricing and the set of enabled container features can change over time, so read the developer documentation for what is enabled on the network you target.
