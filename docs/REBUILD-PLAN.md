# Basketball game rebuild: Astra handoff

Status: implementation authorized by the user after the requested Astra handoff.
The rebuild is implemented and verified on the existing Cloudflare game. See
`docs/qa/rebuild` for the baseline findings, balance measurements and playthrough evidence.

## Product goal

A fast, approachable basketball tactics game: draft legends, make a simple basketball
decision, watch an exciting possession, learn one useful thing, and chase the next win.
The court, players, ball, scoreboard and opponent should dominate the experience.

Target a 5–10 minute run, with quick retries, a short optional playable introduction,
and a credible path through all five opponents. These are design targets to measure
in playtests, not claims that the current game achieves them.

## What the user has established

- The current game feels like work and resembles software rather than a game.
- Screens should follow naturally from routes drawn into another player, including
  off-ball screens. The user should not schedule movements or passes on a timeline.
- Automatic passing must allow choosing the starting ball handler.
- Preserve broad historical player coverage and one PG, SG, SF, PF and C per new draft.
- The game should teach lightly and make every level practically beatable.
- Use Astra for the rebuild. The user accepted this plan and instructed implementation.
- Review the provided Agent Team Kit for QA and playthrough methods. The user may
  provide an additional run-through skill; incorporate it when it arrives.

## Findings established in this planning turn

The current code hides `starter` under the collapsed Passing options panel. The
`useAutomaticPlay` action explicitly assigns `starter: 0`. This explains the reported
loss of control and must become a critical behavioral acceptance check.

The current screen is organized around a tall toolbar, explanatory sections, a side
form and a scrolling result area. There is no short playable onboarding flow. Its
automated full-ladder test controls randomness to force wins; the ordinary-randomness
browser test covers one possession. Those tests verify useful mechanics but do not
establish a normal player's ability to finish the ladder or the quality of the experience.

Baseline: repository commit `97d822dc1826ebc0f4d8ea845ee52fef18227b9a`.
Current game: https://chalk-and-dynasty.tyhoag.workers.dev/.
Current Cloudflare version: `116bfe4e-986d-466d-935d-cdf1eb3dfe9c`.

## Proposed experience

### 1. An actual game presentation

Replace the cream editorial/dashboard composition with an original 2D arcade basketball
presentation: a bright court in a darker arena, bold scoreboard typography, readable
jersey/player markers, clear ball possession, animated shot arcs and net/score feedback.
Opponent introductions, quick result transitions and a final victory sequence give the
run a beginning, escalation and payoff. Sound is optional, with a visible mute control;
support reduced motion and clear visual alternatives.

Keep the court, compact score/goal HUD and primary Play action together. Desktop should
not require scrolling between drawing, running and seeing the outcome. On phones, use
a responsive court and compact bottom controls; reserve drawers for details. The game
should respond to drag, tap and keyboard input without tiny targets or hover-only actions.

### 2. A short loop with meaningful decisions

Start/resume → draft five → optional short introduction → matchup → draw or choose a
play → run → immediate result → adjust/retry or next opponent → final victory.

Keep the existing broad, sourced dataset and position-complete draft rules. Make drafting
feel like picking a lineup: prominent player identity, team/era and position, compact
headline stats, larger roster slots, and a quick transition after each pick. Detailed
season stats remain available on demand. Avoid turning each pick into a spreadsheet.

Retain the understandable three-makes-within-five-possessions challenge unless playtests
show a concrete reason to change it. Show progress as a compact game HUD, rather than
round metadata and instructional prose spread around the screen.

### 3. Direct basketball controls

- Tap/select a player and choose **Start with ball** or **Take the shot**, with clear
  ball and shooter markers. Both choices are available during automatic passing.
- Drag a player to reposition; draw a path to move. Preserve waypoint/keyboard options.
- Draw into a defender or teammate to imply a screen; draw a teammate past the planted
  screen for an off-ball cut. Support multiple picks. A continuing screener route can
  express a roll, with a short inferred plant rather than a timing form.
- Automatic passing controls delivery timing and reads openings. It must not silently
  replace the chosen starter or shooter. If a specific pass is desired, use a simple
  court-based pass arrow; eliminate ordered-number forms and timing dropdowns from
  the rebuilt core flow.
- Keep Undo, Clear routes and Reset positions as small, understandable controls.
  Clear preserves positions; full reset restores the formation. Neither discards the team.
- Provide a few editable play starters, such as Cut to the hoop, Screen and roll,
  and Give and go. A player can begin playing before mastering freehand drawing.

Build a coherent possession model behind these controls: one ball, recognizable
defensive assignments, actual screen contact, believable planted/rolling movement,
clear pass ownership and no teleporting or credited actions after a turnover. Reuse
validated existing logic where it supports these behaviors; replace contradictory rules.

### 4. Instruction through play

Use an optional 20–30 second interactive introduction in which the player selects a
ball handler, draws or adjusts one cut, then takes a shot. Show one brief cue at a time
and allow skipping/replaying it. Teach screens when they become relevant, rather than
requiring the player to read a manual before the first possession.

After a possession, give one specific, truthful piece of feedback: “That screen freed
your shooter” or “The defender stayed in the passing lane.” Avoid identical generic
explanations, long probability reports, or advice unrelated to what actually happened.

### 5. A fair five-opponent ladder

Give opponents distinct appearances and basketball behavior. Introduce movement,
off-ball cuts, screens, passing pressure and the combined superteam challenge gradually.
The last opponent can be difficult while clearly remaining beatable.

Tune difficulty against varied real drafted lineups and reasonable plays. Measure
possession success, round win rates, retries and complete-run duration. An intentional
play should improve the outcome compared with standing still or crowding the ball.
The final opponent must not depend on an exceptional draft or an exploit.

Use normal random distributions for balance measurements and ordinary browser
playthroughs. Seeded simulations are useful for reproducibility; do not overwrite the
random function with guaranteed makes to claim a successful player experience.
Keep targeted forced-outcome tests separately for checking state transitions.

## Build sequence and review points

1. **Baseline audit:** adapt the kit's UX expectation loop to a fresh local browser
   session. Walk draft → play → loss/retry → advancement, and record a prioritized
   defect list. Cover discoverability, contradictory controls, input, visual feedback,
   pacing, progression and accessibility. Do not ask the user to supply the bug list.
2. **One-matchup vertical slice:** build the new court, HUD, direct ball/shooter
   selection, a working screen/cut, automatic pass and a complete result/retry loop.
   Include the first tutorial cues. Capture desktop and phone footage as the early
   visual checkpoint. A connected mockup can guide layout, but the milestone is playable.
3. **Full game:** integrate the faster draft, editable play starters, five-opponent
   ladder, progression, contextual instruction, sound/motion options and final victory.
   Preserve compatible saved rosters/progress; explain any unavoidable play-drawing reset.
4. **Balance and experience review:** run varied-lineup simulations, ordinary-randomness
   browser sessions, and an independent fresh-eyes UX review. Fix major confusion and
   usability defects, not only crashes. Record findings and retest fixes.
5. **Release:** finish focused logic/browser checks and the production build, verify
   the exact release candidate in a preview, then update the existing Cloudflare game.
   Verify the public build and key interactions and retain the previous version for rollback.

Use the existing React/Vite deployment and sourced data. Separate gameplay state,
simulation, court rendering, HUD, draft and tutorial into cohesive modules as rebuilt,
so future fixes do not require editing the entire application component. Keep this
client-side deployment free of new paid services, credentials or backend infrastructure.

## QA adapted from the linked kit

Reviewed source: https://github.com/ai-foundry-byu/agent-team-kit,
commit `c3ed7ad31d4a299f60a3aa6959f051d7f98847ae`.
Read-only reference checkout: `/tmp/chalk-agent-team-kit-review`.

Relevant guidance:

- `skills/ux-critique/SKILL.md`: predict → act → observe → judge; screenshots, written
  expectations, code pointers and suggested fixes. Run the critique against a disposable
  local copy. Adapt database/report hooks to local files for this client-side game.
- `docs/WALKS-AND-SWEEPS-SPEC.md`: an end-to-end journey plus a screen-by-screen control
  sweep, restored to a clean baseline between actions. Classify changed, inert, erroneous
  and intentionally skipped controls. Record coverage gaps.
- `docs/DRIVING-THE-APP.md`: real visible interactions, browser state as well as screenshots,
  recordings for sequences, and capture of console/network failures.
- `skills/regression-check/SKILL.md`: trace changed shared mechanics to all affected UI
  behaviors, then check saves, resets, retries, tutorial, both input types and progression.

Adapt these methods to the existing Playwright setup. The external kit's installer,
Claude hooks, Supabase examples and release pipeline were not installed in this turn.
Use local annotated HTML/JSON findings and recordings; a hosted feedback database is
unnecessary. Maintain a short `taste.md` capturing the user's established preferences:
game presentation, obvious controls, lightly instructional, natural basketball actions,
short sessions, fair difficulty, and no timeline chores.

Do the broad audit on local disposable browser state. After release, perform a targeted
public smoke check. Keep subjective UX findings distinct from deterministic test results;
neither an LLM's approval nor green tests alone proves that the game is fun.

## Acceptance evidence before calling the rebuild complete

- A recorded first-time journey from draft to a real possession using only visible UI.
- Starting with any of the five players works with automatic passing; changing passing
  behavior, clearing routes, running and reloading preserve that explicit choice.
- On-ball and off-ball screens visibly affect pursuit; a rolling route continues after
  planting; impossible dependencies and missed picks do not generate free success.
- No timing organizer, screen-role selectors or ordered-number pass form in normal play.
- Readable court/HUD/Play controls at desktop, tablet and 320–430 px phone widths, with
  desktop/touch/keyboard checks and no need to scroll to discover the main action.
- Complete ordinary-randomness playthroughs across all five opponents, with varied
  drafted teams. Report retries and failures as well as successful runs; do not cherry-pick.
- Clear measured balance results and a practical winning approach for each opponent.
- Clear/reposition/reset/undo/retry/new draft/resume have distinct, reliable semantics.
- A prioritized UX findings report with screenshots and fix status, plus regression/build
  results and a verified public URL/commit. No unresolved blocker or major confusing flow.

