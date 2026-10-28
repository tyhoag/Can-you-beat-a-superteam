# Chalk & Dynasty

**Play the live game: https://chalk-and-dynasty.tyhoag.workers.dev**

Draft across NBA eras, draw a basketball possession, and beat five defenses.
A complete client-side game built with React, Vite and an SVG court. No sports API,
account, database, external font, paid binding, or runtime secret is required to play.

## Develop

Requires Node.js 24 (or Node.js >=22.18) and npm.

```sh
npm ci
npm run dev
```

Use this existing checkout. Cloud tasks are isolated already; a Git worktree is unnecessary.
Progress stays in this browser's local storage. **New draft → Start fresh** clears it.

## Checks

```sh
npm test                 # draft, data, passes, simulation, challenge and storage tests
npm run test:browser      # real Chromium mouse/touch, both viewport projects
npm run build            # complete Cloudflare static-assets production build
npm run deploy:check      # Cloudflare CLI dry run; does not publish
```

Start `npm run dev` before browser tests. The Playwright config uses `/usr/bin/chromium`;
set `CHROMIUM_PATH` on machines with Chromium elsewhere. Browser reports, screenshots
and traces go to ignored `test-results/`. Tests use controlled random rolls in selected
cases to exercise makes, misses, turnovers and the final victory reliably; the shipped
game uses fresh `Math.random` rolls. See [verification notes](docs/VALIDATION.md).

## Play

1. Each of five picks assigns a random historical team in a different decade. Choose
   from a position-balanced five of its best available players by this game's score.
2. **Position** drags starting spots. **Draw route** taps waypoints or draws a path.
   Select each numbered player to edit their route. Undo reverses a gesture; the bin
   clears the selected route; reset restores the default play.
3. **Routes** handles the ball automatically. **Routes + passes** lets you set a
   starting handler and ordered receivers. The last receiver must be your shooter.
4. **Run the play** animates routes, defenders, passes and the shot. Outcomes explain
   space, pressure and pass risk. A shot chance is conditional on successful delivery.
5. Score three makes within five possessions. Three misses end an unwinnable round
   early. Retry without losing your roster. Beat all five levels to finish.

The court supports mouse, touch, keyboard selection and arrow-key position/route edits.
Reduced-motion preferences shorten possession animation. Information dialogs trap focus
and close with Escape. This is an entertainment model, not an NBA prediction tool.

## Data and mechanics

- **1,231 unique players**, **2,443 factual team-player-season records**, and **204
  team–decade pools** covering season-ending years 1960–2024.
- Includes all 55 NBA team abbreviations represented in those years, including historical
  relocations; absent franchises in a decade are not invented. Only NBA records, not ABA.
- A season must contain at least 20 games for that team. Combined multi-team rows are
  excluded. Up to 12 player identities are retained per pool, protecting all five
  positions and supplying duplicate-safe replacements.
- Single-season points, rebounds, assists, steals and blocks per game. Unrecorded
  statistics remain `null`, displayed as **—**. See [data provenance](docs/DATA.md).
- Player ability ratings and probabilities are explicitly game estimates. The pure
  model, validation and reproducible final lineup are in `src/engine.js`.
- Easy: loose zone. Medium: man coverage. Hard: assignment switches. Extra Hard:
  passing-lane pressure. Impossible: the dataset's position-balanced Statistical Five.

## Deploy to Cloudflare

The repository uses the official `cf` CLI and Cloudflare Vite plugin. Configuration is
`cloudflare.config.ts`; the Worker name is `chalk-and-dynasty`. It is an assets-only
Worker with no provisioned database, paid service, or custom domain.

```sh
NODE_USE_ENV_PROXY=1 npx cf auth whoami
# If not authenticated, use the official OAuth account connection:
npx cf auth login --no-browser
NODE_USE_ENV_PROXY=1 CLOUDFLARE_ACCOUNT_ID=516850fdbfa65daee3e49f0ed2504d3d npm run deploy
```

Account connection requires the account owner. Do not put credentials in source, chat,
command arguments, or a committed `.env`. A deployment URL is only established by an
actual successful deploy and public browser verification. A dry run is not a deployment.
For a remote environment that cannot retain OAuth credentials, configure a scoped
Cloudflare API-token requirement through secure environment settings, not chat.

In the managed cloud environment, Node needs `NODE_USE_ENV_PROXY=1` to use the supplied
HTTPS proxy. The Account ID above is a public deployment identifier, not a credential.

The current tool version does not expose `cf init`; the checked-in typed configuration
uses the installed plugin's supported assets-only API. `npm run deploy:check` validates
its production Build Output. Official references and exact deployment blockers are in
[deployment notes](docs/DEPLOYMENT.md).

## Structure

- `src/main.jsx`: draft, editor, animation, accessible information dialogs, game UI
- `src/style.css`: responsive local-only visual design
- `src/engine.js`: pure draft, validation, simulation, progression and save-state logic
- `src/players.json`: offline source records; a download copy is in `public/players.json`
- `scripts/bundle-data.py`: reproducible source-CSV selection
- `tests/`: meaningful unit and actual Chromium interaction tests
- `docs/`: provenance, verification, deployment and optional assignment starter

Independent student project. Not affiliated with the NBA or its teams or players.
Original interface and court artwork. The era/team draft concept is inspired by 82-0;
no 82-0 branding, assets or interface is reused.
