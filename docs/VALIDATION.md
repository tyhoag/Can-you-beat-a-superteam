# Verification evidence

## Current-instance checks

- `npm ci --cache /workspace/.npm-cache`: frozen-lockfile dependency refresh passes.
- `npm test`: **20 tests passed**, none failed or skipped. Covers 100 full randomized
  drafts, all 204 pools, identity deduplication across seasons and teams, route geometry,
  pass validation, animation frames, turnovers, shooter ability, shot location, spacing,
  movement, difficulty, random makes/misses on Impossible, all five level transitions,
  final victory and malformed save recovery.
- `python scripts/verify-data.py /tmp/player-stats.csv`: all **2,443 records / 21,987
  numeric fields** match the downloaded factual source. The public download matches.
- `npm run build`: complete static-assets Cloudflare production build passes.
- `npm run deploy:check`: actual Cloudflare CLI dry run passes, seven static files,
  no resource bindings. Output is `.cloudflare/output/v0/workers/default/assets`.

## Real Chromium interactions

Both a desktop viewport (1440 × 1080) and a mobile/touch viewport (390 × 844):

- Full five-player team-and-era draft, five eligible candidates at every pick, different
  eras and stable identities, then reload with roster preservation.
- Mouse and touch drag positioning; waypoint and freehand route drawing; undo of a
  complete move gesture; clear route; reset play.
- Both play modes; sequence finish validation; blocked self-pass; fixing an invalid
  sequence and running it; shot result and turnover result.
- Animated makes through all five defenses, final victory, reload into victory, new draft.
- Failed round, unlimited retry with retained roster, cancel/confirm complete reset.
- Responsive overflow checks at 320, 390, 430, 768, 1024 and 1440 px widths; in-game help;
  searchable source records and actual unavailable historical statistics.
- Keyboard position/route edits, modal Escape, malformed local-storage recovery.
- A possession using the original, unmodified random source; no external runtime requests.

The first 10 interaction tests passed against the live development build. The final
production-asset browser run passed **12 tests**, with none failed or skipped, including
unmodified randomness and runtime-network independence in both viewport projects.
The report is in ignored `test-results/browser-results.json`. An intermediate production
run exposed a touch-release endpoint issue. Pointer-up now applies the final finger
position, the failing mobile test was rerun successfully, and all 12 final production
tests then passed in 58.7 seconds. The visible player token also has a larger transparent
touch target.

Selected outcome/progression tests deliberately control browser randomness to verify
rare end states reliably. This is test-only instrumentation through Playwright; the
shipped code has no cheat mode or deterministic victory. The unmodified-random test
separately verifies the normal game path. Mobile tests dispatch actual Chromium touch
input; they are emulation, not a claim of testing physical iOS/Android hardware.

## Limits

- No live Cloudflare URL was verified: the real deploy is blocked by absent account
  authentication and the runtime domain policy. See DEPLOYMENT.md.
- No fresh-task snapshot restoration or environment publication is claimed; the user
  publishes environment changes through the onboarding product.
- Browser tests use Chromium. Safari/Firefox and physical devices were not tested.
- The model is a simplified basketball game. Historical ability estimates, cross-era
  comparisons and probabilities are not calibrated real NBA forecasts.
- Production emits nonfatal informational warnings about the icon library's unused
  React Server Component directive and a deliberately bundled data chunk. The data
  chunk is roughly 124 KB gzip; no live API is used.
