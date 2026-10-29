# Playbook, formation, reshuffles and automatic ball movement

The optional Playbook teaches cuts/spacing, passes/timing, off-ball screens and pick-and-rolls
through four six-second examples. The examples use the actual movement, defense, screen
contact and passing engine, stopping at the shooting opportunity rather than promising a
make. Pause/replay, reduced-motion opt-in playback, written tips and Try this play work
on desktop and touch. Previewing never spends a possession. Keyboard focus stays in the
dialog, including when its extra controls section is collapsed.

New teams start with their PG on the ball, SG/SF on the wings, and PF/C in the key.
This maps actual positions to spots, regardless of draft order. Full reset restores that
formation and PG possession, clears routes and keeps the selected shooter. Clear and
automatic passing retain explicitly chosen roles. Saved drawings are not silently moved;
use Reset to apply the formation to an existing game. Loaded example plays intentionally
reposition players to demonstrate their basketball action.

Each draft has two team reshuffles total. They keep the current decade and already-picked
players, select an eligible different team, and avoid returning to a team already reshuffled
away on that pick. Reload and later picks do not refill the budget; a fresh draft does.
Old saved drafts migrate to two reshuffles. No available alternative means no charge.

Automatic passing can choose a two-pass relay or give-and-go. It compares lane clearance,
opening and pass distance with direct delivery; it avoids an unnecessary extra pass or an
outlet through a planted screener. The chosen starter and shooter remain in control. The
same actual pass events drive ball animation, interception checks and shooting. Manual
receiver arrows remain optional and retain automatic timing.

## Checks

- 52 unit tests passed: all 120 position orders, new/reset formations, reshuffle budget and
  migration, exhausted/no-alternative cases, final-position eligibility, stale picks, real
  two-pass sequences, screen/roll timing, interception truncation and existing draft/data rules.
- 30 distinct desktop/touch browser scenarios checked, including both complete five-opponent
  runs with ordinary randomness, saved progress, mouse/touch drawing, resets, alternatives,
  new reshuffles, reversed-order drafts, tutorial playback/pause/replay and loading a real play.
- Actual full-speed give-and-go animation observed a teammate receive the ball and return it
  to the selected handler in automatic mode on both desktop and touch. Normal interceptions
  were allowed, with up to three real attempts, without injecting RNG or success.
- An older screen-play test omitted the legitimate “Good ball movement” feedback from its
  expected wording. That assertion was corrected and both desktop/touch cases passed again.
  The final dialog focus/copy update also passed targeted tutorial and keyboard checks.
- Production build and deployment packaging passed. Existing large-data-chunk and third-party
  module-directive build warnings remain unchanged.
- Model balance: 120/120 sampled lineups completed five opponents using a predeclared simple
  play per opponent and independent seeded outcome rolls. Median 22 possessions, p90 30,
  mean 1.03 rematches. This measures the simplified game model, not human enjoyment.
  See [balance.json](balance.json); data records and shot-probability bounds are unchanged.

Screenshots show desktop/mobile formation and the quick playbook. Public deployment and
asset verification are recorded in [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Public verification

Cloudflare version `75331641-2820-437b-8bdc-de47b4bdb55d`, application
`bf5ae62fa77d2b9f880794511abeba61a8472fb3`, deployed to the existing free Worker.
All eight feature browser checks passed on public HTTPS across desktop and touch.
The formation/guide screenshots in this folder now show those public sessions. A separate
live walk completed a real possession with no page errors and verified SHA-256 matches for
all eight served static files; see `live-verification.json` and the `live-*.png` images.
