#!/usr/bin/env node
import { chmodSync, writeFileSync } from "node:fs";

const email = process.env.CANARY_EMAIL?.trim();
const output = process.env.CANARY_CLEANUP_SQL?.trim();
if (!/^stage-c-canary-[0-9]+@example\.invalid$/u.test(email ?? "")) {
  throw new Error("CANARY_EMAIL does not match the controlled Stage C pattern");
}
if (!output) throw new Error("CANARY_CLEANUP_SQL is required");
writeFileSync(
  output,
  `DELETE FROM users WHERE email = '${email}' AND name = 'Stage C Canary';\n`,
  { flag: "wx", mode: 0o600 },
);
chmodSync(output, 0o600);
console.log("Created exact Stage C canary cleanup SQL.");
