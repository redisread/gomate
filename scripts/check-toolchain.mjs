#!/usr/bin/env node
import { checkToolchain } from "./toolchain.mjs";

try {
  console.log(checkToolchain({ strict: true }));
} catch (error) {
  console.error(`[toolchain] ${error.message}`);
  process.exitCode = 1;
}
