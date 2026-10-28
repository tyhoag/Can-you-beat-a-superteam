import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare({ assetsOnly: true, types: { generate: false } })],
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "player-data", test: /players\.json$/ }],
        },
      },
    },
  },
});
