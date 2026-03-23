import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [react()],
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  server: {
    port: 5432,
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.PUBLIC_API_URL": JSON.stringify(
        process.env.PUBLIC_API_URL || "http://localhost:8799"
      ),
    },
  },
});
