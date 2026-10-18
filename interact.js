// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

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
