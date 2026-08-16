#!/usr/bin/env node
/** Remove only the generated Worker dry-run directory before measuring it. */

import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist-worker");
rmSync(output, { recursive: true, force: true });
console.log("Prepared a clean dist-worker dry-run target.");
