// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * interact.js reads chain state from the Quantova gateway.
 *
 * Run with npm run interact. It prints node info, the chain head, chain
 * parameters, and supply. If QUANTOVA_ADDRESS is set to a Q1 address it also
 * prints that account balance in QTOV.
 *
 * Set QUANTOVA_GATEWAY to your gateway endpoint. The gateway speaks HTTP POST
 * to /v1/<method> with a flat JSON body.
 */

import { Gateway } from "./client.js";

async function main() {
  const gateway = new Gateway(process.env.QUANTOVA_GATEWAY);

  const info = await gateway.nodeInfo();
  console.log("node", JSON.stringify(info));

  const head = await gateway.head();
  console.log("head", JSON.stringify(head));

  const params = await gateway.chainParams();
  console.log("chain params", JSON.stringify(params));

  const supply = await gateway.supply();
  console.log("supply (Quon)", JSON.stringify(supply));

  const address = process.env.QUANTOVA_ADDRESS;
  if (address) {
    const balance = await gateway.balanceQTOV(address);
    console.log(`balance of ${address}`, balance, "QTOV");
  }
}

main().catch((err) => {
  console.error("interact failed", err.message);
  process.exit(1);
});
