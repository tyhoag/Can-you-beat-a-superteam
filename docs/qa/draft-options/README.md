# Team-era choices at each draft position

Each position still occupies one card. Previous/next arrows browse up to three different
eligible players from the assigned team and decade; the Draft button selects the visible
player. Name, season, stats and the details dialog follow that choice. Filled positions
stay locked and drafted identities cannot repeat in a later era.

Selection retains the original 2,443 records and adds 818 source-verified seasons, for
3,261 records and 1,525 distinct identities. All previous record fields are unchanged,
so existing saved rosters remain valid. The final opponent selection is unchanged.

Coverage before any picks: 978 team-era position groups have three choices, 35 have two,
and seven have one. These are real historical teams and eligible 20-game seasons; no
players or positions are invented to pad short-lived team eras. The full exception list
is in `docs/data-manifest.json`. Already-drafted identities are excluded from choices.

Checks:

- Source CSV SHA-256 digests match the original inputs.
- Every one of the 3,261 records and 29,349 numerical fields matches the source CSV.
- Downloadable `public/players.json` matches the bundled data.
- Every old roster record is preserved; final opponent identities/seasons are unchanged.
- 46 unit tests pass, including all 204 pools, every visible alternative, 200 randomized
  complete drafts using alternatives, duplicate-season deduplication and saved choices.
- 22 desktop/touch browser tests pass. Browser evidence covers previous/next, changing details, selecting the actual visible
  player, position locks after reload, and a complete alternate-choice team playing a
  real possession, on desktop and emulated touch.

Local screenshots: `desktop-options.png`, `mobile-options.png`.
Public verification and exact deployment identifiers are recorded in `docs/VALIDATION.md`
and `docs/DEPLOYMENT.md` after release.
