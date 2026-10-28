# Verification evidence

**Verified live game: https://chalk-and-dynasty.tyhoag.workers.dev**

## Court-control and sequencing update

- `npm test`: **27 passed**, none failed or skipped. Includes all previous drafting,
  data, geometry, defense, probability, progression and save-state checks, plus separate
  full-reset/clear-all semantics, three route beats, screen hold/roll behavior, actual
  screen contact versus a misplaced screen, scheduled non-overlapping passes, pass-risk
  changes with timing, and migration of existing saved teams and progress.
- `npm run test:browser`: **16 passed** against the local development server.
- `PLAYWRIGHT_BASE_URL=https://chalk-and-dynasty.tyhoag.workers.dev npm run test:browser`:
  **16 passed on the live Cloudflare site**, none failed, flaky or skipped.
- `npm run deploy:check`: complete production build and real Cloudflare CLI dry run pass.
- Actual deployment: Cloudflare version `efcd871b-7283-4e84-a699-86396caaa73f`, from
  application commit `7e1479c84a2d987931031133ebd313a0cbe371ef`.
- Public HTML and all six static files match the prepared local production build by SHA-256.

## Browser interactions verified

Both desktop Chromium (1440 × 1080) and mobile/touch Chromium (390 × 844):

- Five-player team/era draft, five candidates per pick, uniqueness and reload persistence.
- Mouse/touch drag positioning, waypoint/freehand routes, undo, selected-route clearing,
  both play modes, ordered pass validation, animations, makes, misses and turnovers.
- All five challenge levels, final victory, retries, complete game reset, and persistence.
- Separate **Clear all routes** and **Full reset** operations, with undo, mode and roster
  preservation, correct route/position/screen/pass-plan behavior and reload.
- Selecting Setup/Cut/Finish route beats, a screen setter and cutter, the editable
  screen-and-cut example, pass departure timing, invalid timing feedback and correction,
  and replay in both play modes. Successful screen contact appears in the result explanation.
- Keyboard edits, modal Escape, malformed save recovery, help, data search and unavailable
  historical stats. Overflow checks at 320, 390, 430, 768, 1024 and 1440 px widths.
- An ordinary possession with unmodified randomness and no off-origin runtime dependencies.

Selected outcome/progression tests control browser randomness to reliably verify makes,
misses, turnovers and victory. This is test-only instrumentation; the shipped game has no
cheat mode. A separate test uses the original random source. Mobile input is actual Chromium
emulated touch, not a claim of physical-device testing.

Screenshots: [desktop sequencing](screenshots/desktop-sequencing.png) and
[mobile sequencing](screenshots/mobile-sequencing.png). The machine-readable latest run
is in ignored `test-results/browser-results.json`.

## Data and runtime integrity

The unchanged 2,443 bundled records and 21,987 numerical fields were checked against the
attributed source CSV; the download copy matches. The player pool still contains 1,231
unique players across 204 historical team–decade pools. See [data notes](DATA.md).

The managed cloud dev server needs writable configuration storage:
`XDG_CONFIG_HOME=/workspace/.tools/chalk-cloudflare NODE_USE_ENV_PROXY=1 npm run dev`.
Its first startup failed when the registry tried writing to the read-only home config;
using the supported XDG path fixed it, after which all local browser tests passed.

Public Chromium tests use approved access to the existing NSS certificate store so it
can initialize correctly. TLS verification remains enabled. No certificate-error bypass,
assertion disabling, or unverified production artifact was used.

## Limits

One stationary screen is supported per possession, with an optional Finish-beat roll.
Screen contact, defensive slowdown and the four-percentage-point cutter-shot bonus are
explicit game estimates, not measured NBA screening statistics or a physics simulation.

Safari, Firefox and physical phones were not tested. A fresh-task environment snapshot
restore is not claimed. Nonfatal build notices remain for the icon library's React Server
Component directive and the intentionally bundled historical-data chunk (about 124 KB gzip).
