// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { Gateway, height, printable } from "./client.js";

async function main() {
  const gateway = new Gateway(process.env.QUANTOVA_GATEWAY);

  const info = await gateway.nodeInfo();
  console.log("node", printable(JSON.stringify(info), 600));

  const head = await gateway.head();
  console.log("head", height(head && head.height, "head height"));

  const params = await gateway.chainParams();
  console.log("chain params", printable(JSON.stringify(params), 600));

  const supply = await gateway.supply();
  console.log("supply (Quon)", printable(JSON.stringify(supply), 600));

  const address = process.env.QUANTOVA_ADDRESS;
  if (address) {
    const balance = await gateway.balanceQTOV(address);
    console.log(`balance of ${printable(address)}`, balance, "QTOV");
  }
}

main().catch((err) => {
  console.error("interact failed", printable(err && err.message, 600));
  process.exit(1);
});
