# Chalk & Dynasty

**Play: https://chalk-and-dynasty.tyhoag.workers.dev**

Draft five basketball legends, draw a play and beat five defenses. A free, client-side
React/Vite game with an original SVG arena, optional local audio and no account or backend.

## Play

1. Draft exactly one PG, SG, SF, PF and C from five different team–decade draws. Season
   facts and player details are available on each card; identities cannot repeat. Use the
   arrows on each position’s card to compare up to three players from that team and era.
2. Try the optional three-step warm-up, or jump straight into the challenge.
3. Tap a jersey. **Start with ball** and **Take the shot** work with automatic passing.
   **Draw** drags a route or adds tapped waypoints; **Move** changes starting positions.
4. Draw into a defender or teammate to imply a screen. Cut another player around it.
   Continue the screener’s path toward the rim for a pick and roll. Screens must actually
   contact a defender; moving players cannot keep receiving planted-screen benefits.
5. **Play** runs the possession. Make three buckets within five attempts to advance.
   Three misses end the round early. **Rematch** keeps your team and drawing.

Four editable starting plays: Backdoor cut, Screen & cut, Pick & roll, Give & go.
Passing reads openings automatically. To choose receivers, select **Pass** and tap
jerseys on the court. The last receiver shoots; no timing form is required. **Auto
passes** keeps the chosen starting handler and shooter.

**Clear** erases all routes and keeps positions. **Reset** restores the original formation
and direct delivery. **Undo** reverses either. These actions preserve the drafted team.
A new draft requires a separate confirmation. Existing compatible saved teams, progress,
roles and drawings remain usable; unfinished invalid manual passing recovers to automatic.

Keyboard: Tab to a jersey, Enter to select, arrow keys to draw points or move. Sound is
opt-in and remembered. Reduced-motion preferences shorten playback. Modal dialogs support
Escape and trap keyboard focus. Progress saves locally in this browser.

## Develop and verify

Node.js 24 (or >=22.18) and npm:

```sh
npm ci
npm run dev
npm test
npm run test:browser
npm run build
node scripts/balance.mjs
```

Browser tests need a running local game and Chromium. The default executable is
`/usr/bin/chromium`; override with `CHROMIUM_PATH`. `PLAYWRIGHT_BASE_URL` selects a preview
or the public site. On a managed cloud machine with a read-only home configuration:

```sh
XDG_CONFIG_HOME=/workspace/.tools/chalk-cloudflare NODE_USE_ENV_PROXY=1 npm run dev
```

For the exact production output, serve
`.cloudflare/output/v0/workers/default/assets` with a local static server.
`node scripts/experience-walk.mjs` records ordinary full-speed mouse and touch journeys
against localhost only; it uses the installed `/usr/bin/ffmpeg` encoder through Chromium
screencasting. No randomness or saved state is injected into those journeys.

Reports, traces and recordings live in ignored `test-results/`. The review, balance
measurements and walkthrough notes are in [docs/qa/rebuild](docs/qa/rebuild).
See [verification evidence](docs/VALIDATION.md) for actual results and limitations.

## Historical data

- 1,525 player identities, 3,261 team-player-season records, 204 historical team–decade
  pools and 55 team abbreviations, covering seasons ending 1960–2024.
- Up to three draft choices per position, plus retained legacy roster records; at least
  20 games with that team. Short-lived historical teams can have fewer choices. No combined
  multi-team totals, invented teams or ABA records.
- Points, rebounds, assists, steals and blocks are real single-season per-game facts.
  Unavailable historical fields remain null and display “—”.
- Ability ratings and possession probabilities are explicit game estimates. The final
  opponent is a reproducible, position-balanced lineup selected by those ratings.
- Data origins, selection method, missing fields and licensing limits: [DATA.md](docs/DATA.md).
- Barlow Condensed by Jeremy Tribby is bundled under the SIL Open Font License in
  `public/fonts/OFL.txt`. Artwork and synth cues are original; no runtime font service.

## Deploy

The existing assets-only Cloudflare Worker is `chalk-and-dynasty`. No database, paid
binding, custom domain or runtime credential is required.

```sh
npm run build
NODE_USE_ENV_PROXY=1 CLOUDFLARE_ACCOUNT_ID=516850fdbfa65daee3e49f0ed2504d3d \
  ./node_modules/.bin/cf deploy --prebuilt --mode production --dry-run
NODE_USE_ENV_PROXY=1 CLOUDFLARE_ACCOUNT_ID=516850fdbfa65daee3e49f0ed2504d3d \
  ./node_modules/.bin/cf deploy --prebuilt --mode production
```

Use the existing secure account binding; never put token values in chat, source or command
arguments. Check the printed version and the actual public game. A dry run is not a release.
See [deployment notes](docs/DEPLOYMENT.md) for verified versions and environment details.

## Code map

- `src/main.jsx`: application shell and information dialogs
- `src/components/`: draft, interactive court, arena/HUD, season details, accessible modal
- `src/game/useGame.js`: persistence, edit history, practice, playback and challenge actions
- `src/game/playbook.js`: editable plays, role selection and contextual coaching
- `src/game/audio.js`: opt-in, locally generated sounds
- `src/engine.js`: pure drafting, movement, inferred screens, passing, defense and progression
- `src/players.json`, `public/players.json`: unchanged sourced historical facts
- `tests/`: pure mechanics plus real mouse/touch and ordinary-randomness ladder checks

Independent project, not affiliated with the NBA, its teams or players. The era/team draft
concept is inspired by 82-0; no 82-0 branding, artwork or interface is copied.
