import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = process.platform === "win32" ? "wrangler.cmd" : "wrangler";

export function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(WRANGLER, args, {
      cwd: ROOT,
      env: { ...process.env, CLOUDFLARE_ENV: "production" },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`wrangler stopped by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`wrangler exited with code ${code ?? 1}`));
      } else {
        resolve();
      }
    });
  });
}
