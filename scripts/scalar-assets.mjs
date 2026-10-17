import { cp, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

/** Serve the locked browser build locally; never import its UI into the Worker. */
export function scalarAssets() {
  return {
    name: "gomate-scalar-assets",
    hooks: {
      "astro:config:setup": async ({ config }) => {
        const distribution = path.dirname(
          require.resolve("@scalar/api-reference"),
        );
        const { version } = JSON.parse(
          await readFile(path.join(distribution, "../package.json"), "utf8"),
        );
        if (version !== "1.75.0")
          throw new Error(
            "Update the Scalar asset URL when upgrading the pinned package",
          );
        const target = path.join(
          fileURLToPath(config.publicDir),
          "generated",
          `scalar-${version}`,
        );
        await mkdir(target, { recursive: true });
        await cp(path.join(distribution, "browser"), target, {
          recursive: true,
          filter: (source) => !source.endsWith(".map"),
        });
      },
    },
  };
}
