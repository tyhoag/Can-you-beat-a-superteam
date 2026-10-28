import { defineConfig } from "cf/config";

// Assets only: no database, runtime API, paid bindings or server secrets.
export default defineConfig({
  worker: {
    name: "chalk-and-dynasty",
    compatibilityDate: "2026-10-27",
    workersDev: true,
    assets: { notFoundHandling: "single-page-application" },
  },
});
