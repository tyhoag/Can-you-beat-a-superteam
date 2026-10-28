# Verification evidence

**Verified live game: https://chalk-and-dynasty.tyhoag.workers.dev**

## Position-complete draft update

- `npm test`: **30 passed**, none failed or skipped. Includes all previous drafting,
  data, geometry, defense, probability, progression and save-state checks, plus separate
  full-reset/clear-all semantics, three route beats, screen hold/roll behavior, actual
  screen contact versus a misplaced screen, scheduled non-overlapping passes, pass-risk
  changes with timing, and migration of existing saved teams and progress.
- `npm run test:browser`: **18 passed** against the local production preview.
- `PLAYWRIGHT_BASE_URL=https://chalk-and-dynasty.tyhoag.workers.dev npm run test:browser`:
  with `--grep 'draft locks|full draft'`: **4 passed on the live Cloudflare site**,
  covering desktop/mobile position locks, reload persistence, complete balanced drafting
  and possession editing/replay. None failed, flaky or skipped.
- `npm run deploy:check`: complete production build and real Cloudflare CLI dry run pass.
- Actual deployment: Cloudflare version `c3f296f1-21a8-4963-95c7-89a5f51dde15`, from
  application commit `40ecec8f1464b742451cb366e5dfcc3faa550c39`.
- Public HTML and all six static files match the prepared local production build by SHA-256.

Unit coverage now also exercises every team's five-position candidate board, filled
position locks, 200 randomized complete drafts with exactly one PG/SG/SF/PF/C, stale or
forged selection rejection, identity reuse across changing season positions, last-slot
team-pool recovery, and unfinished legacy draft migration. Complete saved legacy games
remain playable.

The pure unit suite uses Node's supported `--experimental-test-isolation=none` mode:
the restricted sandbox's child-process IPC otherwise reported only the test file,
rather than individual tests. The verified run reports all 30 tests with zero skipped;
no assertions were disabled.

## Browser interactions verified

All 18 interaction checks passed against the production preview. Four focused checks
then passed on the deployed site, including both desktop and mobile full-draft/play
flows and the new position-lock-specific flow.

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
- Filled-position buttons are disabled and remain locked after reload; the roster has
  fixed PG/SG/SF/PF/C slots; a full draft produces exactly those five positions.
- Keyboard edits, modal Escape, malformed save recovery, help, data search and unavailable
  historical stats. Overflow checks at 320, 390, 430, 768, 1024 and 1440 px widths.
- An ordinary possession with unmodified randomness and no off-origin runtime dependencies.

Selected outcome/progression tests control browser randomness to reliably verify makes,
misses, turnovers and victory. This is test-only instrumentation; the shipped game has no
cheat mode. A separate test uses the original random source. Mobile input is actual Chromium
emulated touch, not a claim of physical-device testing.

Screenshots: [desktop position locks](screenshots/desktop-position-lock.png) and
[mobile position locks](screenshots/mobile-position-lock.png). The machine-readable latest run
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
