// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * deploy.js deploys the example QAsset container to the active Quantova network.
 *
 * Run with npm run deploy:testnet.
 *
 * This script shows the shape of a Quantova deployment. The contract in
 * ExampleQAsset.quanta is written in Quanta, the Quantova contract language, and
 * is compiled to a QVM container by the Quanta compiler. The QVM is a register
 * machine that runs compiled containers. It is not a general purpose bytecode
 * virtual machine. Point COMPILED_CONTAINER_PATH at the compiled container,
 * then sign and submit through the gateway.
 *
 * Signing and key management are done with QCore.js, the Quantova SDK published
 * on npm as @quantovainc/qcore. Signatures are ML-DSA-65. The deployer key is
 * read from QUANTOVA_DEPLOYER_KEY in the environment. Never commit a real key.
 * Use a testnet key funded from the faucet. See deploying.md.
 */

import fs from "node:fs";
import { Gateway } from "./client.js";

// QCore.js provides the keyring and ML-DSA-65 signing. Install it with
// `npm install @quantovainc/qcore` and uncomment the import below.
// import { Client, core } from "@quantovainc/qcore";

const CONTAINER_PATH = process.env.COMPILED_CONTAINER_PATH || "./build/ExampleQAsset.qvm";

async function main() {
  const gateway = new Gateway(process.env.QUANTOVA_GATEWAY);
  const params = await gateway.chainParams();
  console.log(`Deploying to chain ${params.chain_id}`);

  const deployerKey = process.env.QUANTOVA_DEPLOYER_KEY;
  if (!deployerKey) {
    throw new Error("Set QUANTOVA_DEPLOYER_KEY to a testnet key funded from the faucet.");
  }

  if (!fs.existsSync(CONTAINER_PATH)) {
    throw new Error(
      `Compiled container not found at ${CONTAINER_PATH}. ` +
        "Compile ExampleQAsset.quanta with the Quanta compiler first. See deploying.md."
    );
  }
  const container = fs.readFileSync(CONTAINER_PATH);

  // Build the deploy transaction. A deploy carries the compiled container and the
  // constructor arguments for the QAsset init.
  const deployerAddress = process.env.QUANTOVA_ADDRESS;
  const tx = {
    kind: "deploy",
    from: deployerAddress,
    nonce: deployerAddress ? await gateway.nonce(deployerAddress) : 0,
    chain_id: params.chain_id,
    container: container.toString("base64"),
    args: { name: "Example", symbol: "EXA", initial_supply: "1000000000000" },
  };

  // Sign locally with the ML-DSA-65 deployer key using the QCore.js keyring.
  //   const keyring = new Keyring();
  //   const account = keyring.addFromSecret(deployerKey);
  //   const signed = await account.signTransaction(tx);
  //
  // For the template we stop before submitting so a misconfigured key cannot
  // spend by accident. Replace the value below with the real signed payload.
  const signed = process.env.SIGNED_TX;
  if (!signed) {
    console.log("\nPrepared deploy transaction");
    console.log(JSON.stringify(tx, null, 2));
    console.log(
      "\nNext, sign this with the QCore.js keyring and submit it with " +
        "gateway.submitTransaction(signed). See deploying.md."
    );
    return;
  }

  // Submit through the gateway and wait for the transaction to be recorded.
  const { hash } = await gateway.submitTransaction(signed);
  console.log("submitted", hash);
  const recorded = await gateway.waitForTransaction(hash);
  console.log("container address", recorded.contract);
  console.log("Confirm QORUS finality before treating the deployment as settled.");
}

main().catch((err) => {
  console.error("deploy failed", err.message);
  process.exit(1);
});
