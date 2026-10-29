// Targeted release verification: same browser path as a player, with TLS verification.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const base =
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://chalk-and-dynasty.tyhoag.workers.dev";
const root = ".cloudflare/output/v0/workers/default/assets";
const outputDir = process.env.VERIFY_OUTPUT_DIR || "docs/qa/rebuild";
fs.mkdirSync(outputDir, { recursive: true });
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    );
}
const local = Object.fromEntries(
  files(root).map((f) => [
    "/" + path.relative(root, f),
    crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"),
  ]),
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
    viewport: { width: 1365, height: 900 },
    reducedMotion: "reduce",
  }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const response = await page.goto(base);
if (response.status() !== 200)
  throw Error(`Page returned ${response.status()}`);
await page
  .getByRole("button", { name: /^Draft / })
  .first()
  .waitFor();
const remote = await page.evaluate(async (paths) => {
  const out = {};
  for (const p of paths) {
    const r = await fetch(p, { cache: "reload" });
    if (!r.ok) throw Error(`${p} returned ${r.status}`);
    const b = await r.arrayBuffer();
    out[p] = [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  }
  return out;
}, Object.keys(local));
for (const [p, hash] of Object.entries(local))
  if (remote[p] !== hash) throw Error(`Live asset mismatch: ${p}`);
await page.screenshot({ path: `${outputDir}/live-draft.png` });
for (let i = 0; i < 5; i++)
  await page
    .getByRole("button", { name: /^Draft / })
    .first()
    .click();
await page.getByRole("button", { name: "Skip · I’m ready to play" }).click();
await page.locator('[data-player="4"]').press("Enter");
await page
  .getByRole("button", { name: "Start with ball", exact: true })
  .click();
await page.getByRole("button", { name: "Use automatic passing" }).click();
await page.getByRole("button", { name: "Load Pick & roll" }).click();
const before = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("chalk-dynasty-v2")),
);
if (before.play.starter !== 4)
  throw Error("Live automatic passing replaced handler");
await page.screenshot({ path: `${outputDir}/live-arena.png` });
await page.getByRole("button", { name: "PLAY", exact: true }).click();
await page
  .getByRole("button", { name: "Next possession", exact: true })
  .waitFor();
const after = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("chalk-dynasty-v2")),
);
if (after.totalAttempts !== before.totalAttempts + 1)
  throw Error("Live possession failed");
await page.screenshot({ path: `${outputDir}/live-result.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Next possession" }).click();
await page.screenshot({ path: `${outputDir}/live-phone.png` });
if (errors.length) throw Error(errors.join("\n"));
const report = {
  url: base,
  http: response.status(),
  verifiedAt: new Date().toISOString(),
  assetCount: Object.keys(local).length,
  assets: remote,
  errors,
  handler: after.play.starter,
  realPossession: after.results,
};
fs.writeFileSync(
  `${outputDir}/live-verification.json`,
  JSON.stringify(report, null, 2) + "\n",
);
await browser.close();
console.log(
  `Live HTTPS 200; all ${report.assetCount} static files match SHA-256; handler preserved; real possession completed; zero page errors.`,
);
