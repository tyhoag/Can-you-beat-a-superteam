# Verification evidence

**Verified live game: https://chalk-and-dynasty.tyhoag.workers.dev**

## Inferred screens and automatic passing

- `npm test`: **35 passed**, none failed or skipped.
- Full production-preview browser suite: **22 passed** across desktop and mobile.
- Live Cloudflare browser suite with
  `--grep 'full draft|drawing directly|simple play|optional receiver|clear-all'`:
  **10 passed**, none failed, flaky or skipped, across desktop and mobile.
- Production build, Cloudflare packaging dry run and actual deployment passed.
- Application commit: `f6c2fb225a28628b1430320f2a0828568730263c`.
- Cloudflare version: `757924cf-654c-4ab5-9910-0c5629997393`.

The unit suite verifies screen intent from routes ending at a defender or teammate,
stationary teammates beside through-cuts, actual on-ball and off-ball contact, two
independent screens in one play, misplaced screens receiving no bonus, cyclic and
zero-length routes, chained setters finishing before cutters move, automatic delivery
changing with geometry, seven non-overlapping passes with one ball, and no credit for
screens after the shot or a turnover. Legacy timing fields no longer influence motion
or delivery, and save migration preserves drawings, receivers, team and progress.

The browser checks draw directly from a numbered setter onto a teammate and then a
defender, undo, draw an off-ball cut, choose a shooter and run. They verify inferred
screen markers, contact in the possession result, replay in both delivery modes,
save/reload, absence of timing/screen dropdowns even when Passing options is open,
clear-all versus full-reset semantics, and overflow at 320–1440 px. The full local run
also covers all five challenges, victory, retries, drafting, keyboard controls and data.

An initial mobile run caught a player-name label intercepting a route waypoint and
switching the selected player. Name labels and shooter stars no longer capture pointer
input; the focused desktop/mobile check and complete final 22-test run then passed.

Screenshots from the public browser run: [desktop](screenshots/desktop-natural-screens.png)
and [mobile](screenshots/mobile-natural-screens.png). The optional receiver panel is
expanded in these screenshots to show the absence of timing controls; it starts closed.

## Previous simpler play editor

- `npm test`: **30 passed**, none failed or skipped.
- `PLAYWRIGHT_BASE_URL=http://localhost:4173 npm run test:browser`: **22 passed**
  against the local production preview, covering every existing desktop/mobile interaction.
- The live Cloudflare run with `--grep 'simple play|advanced controls preserve|full draft|screen, cut'`:
  **8 passed**, none failed, flaky or skipped, across desktop and mobile.
- Production build and actual `cf deploy --prebuilt --mode production --dry-run` pass.
- Deployed application commit: `1a93abe055339f1e98bfce17e98696880886adb1`.
- Cloudflare version: `2802f380-7b28-4ea4-a727-ed8839553d87`.
- GitHub main was checked against the application commit after the push.

The default panel now offers a shooter, starter example and Run. Screens, manual passing,
route beats and estimated probabilities are together in a closed Advanced controls panel.
New browser assertions verify a normal possession without opening it, keyboard expansion,
closing without changing a custom play, reload preservation with a visible active notice,
and a reversible return to automatic delivery that keeps routes, positions, shooter,
roster and progress. An invalid hidden pass order has visible feedback and a working
shortcut back to its controls. All earlier reset, progression, position-lock and mobile
checks also pass locally.

Screenshots from the live browser run: [desktop](screenshots/desktop-simple-play.png)
and [mobile](screenshots/mobile-simple-play.png).

An initial local browser run found the previous preview server was no longer running
(`ERR_CONNECTION_REFUSED`); restarting the production preview resolved it. The complete
22-test run above then passed. A separate Python HTTP asset-hash check was rejected by
Cloudflare with code 1010 (HTTP 403); no alternate client signature was used to evade
that restriction. The normal Chromium live-game tests above passed with TLS verification
and exercised the newly deployed controls. A full asset-hash comparison is not claimed
for this release.

## Previous position-complete draft update

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

## Previous browser interactions verified

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

Multiple planted screens are inferred from route endpoints and teammates beside cuts.
Automatic rolling after a screen, moving-screen fouls and contact physics are not modeled.
Screen contact, defensive slowdown, automatic pass selection and the non-stacking
four-percentage-point cutter-shot bonus are explicit game estimates, not measured NBA
screening statistics or a physics simulation.

Safari, Firefox and physical phones were not tested. A fresh-task environment snapshot
restore is not claimed. Nonfatal build notices remain for the icon library's React Server
Component directive and the intentionally bundled historical-data chunk (about 124 KB gzip).
