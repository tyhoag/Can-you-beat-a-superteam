# Data provenance and selection

## Verified factual inputs

Source compilation: Sumitro Datta, **bball-reference-datasets**:
https://github.com/sumitrodatta/bball-reference-datasets

The compilation attributes the underlying statistics to Basketball-Reference / Sports
Reference. The game bundles selected numerical season facts, with original source links;
it does not redistribute the upstream scraping code, team logos or player portraits.
The upstream GitHub mirror does not provide an explicit license notice. This project
makes no claim of ownership of the statistics or of a license to redistribute upstream
code. Its own limited, independently selected numerical facts are attributed here and
inside the game. Do not reuse site artwork or assume this permits bulk scraping.

Downloaded and actually inspected inputs:

- Player Per Game.csv:
  https://raw.githubusercontent.com/sumitrodatta/bball-reference-datasets/master/Data/Player%20Per%20Game.csv
- Team Abbrev.csv:
  https://raw.githubusercontent.com/sumitrodatta/bball-reference-datasets/master/Data/Team%20Abbrev.csv

`data-manifest.json` records exact SHA-256 digests of the source files used. Each
bundled record includes the player's Basketball-Reference URL, season-ending year,
team abbreviation, historical team name, games played, position, and per-game stats.
The game does not fetch these websites at runtime. It uses a fixed 1960–2024 slice;
2025 and 2026 records present in the mirror were deliberately excluded.

## Statistical basis

All displayed box-score stats are **regular-season, single-season per-game averages**,
rounded in the source to one decimal place. The season-ending year 1991 is displayed
as 1990–91 and belongs to the 1990s pool. This convention also means 1959–60 is in the
1960s pool and 2019–20 is in the 2020s pool.

Missing steals, blocks and three-point data remain null. Steals and blocks were not
NBA official statistics before 1973–74. The absence of a three-point line before
1979–80 is preserved in the source data. No official value is invented or zero-filled.
The in-game range fallback is a labeled estimate, not a historical three-point statistic.

Team-season rows must represent a real NBA team with a corresponding Team Abbrev row;
20+ games are required for that team. Combined multi-team totals (`2TM` etc.) and ABA
seasons are excluded. A player traded during a season can appear in separate pools with
that team's actual partial-season line; the displayed games count makes that basis clear.

## Selection

1. Group records by decade of season-ending year and actual historical team abbreviation.
2. For each player identity in that pool, keep the season with the highest game score;
   use the later season as a tie-break. Identity is Basketball-Reference's stable ID,
   so name changes and trades do not permit duplicates.
3. Preserve the original selection: each position’s best candidate plus the next
   highest scores up to 12 identities. Then add each position’s top three distinct
   identities wherever supported by the eligible source records. Keeping the original
   records makes every existing saved roster key remain valid; every old fact is unchanged.
4. Each draft shuffles the seven eras without replacement and uses five. For every
   pick it assigns a real team pool in that era. Each position’s card has previous/next
   arrows to browse up to three distinct available players, ranked by the same game
   score. Each candidate uses their own displayed season and stats. Candidates whose
   position is already filled are disabled. Exclude already-drafted
   identities from selectable candidates, even if their position changed in another
   season. The displayed season position determines the roster slot: exactly one PG,
   SG, SF, PF and C. If the planned team has no selectable player for the remaining
   slots, assign another eligible team within that era, preserving completion.

Existing completed games remain playable. Unfinished legacy drafts containing repeated
positions keep their valid prefix before the first repeated position; the game explains
that the remaining slots must be drafted under the new rule. This retains era/pick
alignment instead of silently assigning players invented positions.

This covers **1,525 identities / 3,261 season records / 204 pools / 55 historical
abbreviations**. It is intentionally not a claim to include every player or every
possible season. Teams are available only in decades in which they actually played.
A relocated team's old and new abbreviations are distinct historical draft pools.

Three distinct options are available in **978 of 1,020 team–decade position groups**
(95.9%). Another 35 have two options and seven have one under the 20-game eligibility
rule and real historical team abbreviations. Short-lived team eras are not padded
with invented players or another franchise’s seasons. The exact gaps are listed in
`data-manifest.json` under `positionChoiceGaps`. Already-drafted identities may reduce
available options during a particular run; the existing same-era team recovery still
prevents a draft from getting stuck.

The expansion adds 818 source-verified season records and 294 identities. All 2,443
previous records are preserved byte-for-byte at the object-field level. Source CSV
SHA-256 digests match the original inputs; this is a broader selection, not a refresh
with different statistics.

## Transparent game estimates

All ratings are capped, simplified game estimates:

- Rim = clamp(45 + FG% × 65 + PPG × .25, 50, 98).
- Range with 1+ three-point attempts/game = clamp(38 + 3P% × 110, 40, 98).
- Otherwise range = clamp(30 + FT% × 35, 40, 65); missing FT% uses .70.
- Creation = clamp(45 + APG × 4.2, 45, 98).
- Defense = clamp(40 + SPG × 10 + BPG × 9 + RPG × .8, 40, 98).
  Missing official steals or blocks uses a clearly labeled neutral defense rating of 65.
- Overall score = .32 × rim + .22 × range + .20 × creation + .26 × defense.

Percentages are fractions (e.g. .400). The final superteam greedily picks the best
unused eligible player for PG, SG, SF, PF, C, in that fixed order; tie-breaks are player
ID then record key alphabetically. Multiple seasons of one identity can never appear
on that lineup. This is reproducible and balanced, not an objective real-world GOAT list.

Movement follows drawn geometry with distance-based duration. Screen intent is inferred
when a route ends within 38 court units of another offensive player or their initial
defender. A planted teammate within 27 units of a through-cut can also screen; a route
that merely ends in a crowd is not treated as a through-cut. Several setters are
supported. Automatic dependencies allow a setter to arrive before the cutter moves;
cyclic screen dependencies are excluded so movement cannot deadlock.

Once planted, a setter can slow a chasing defender within 58 units if the setter is
within 28 units of the defender's path. Switching and elite defenses recover faster.
Actual contact before the shot can give the screened shooter a **4 percentage point**
bonus, capped once per shot before the existing 12–88% bounds. Moving, late or misplaced
screens get no bonus. These are entertainment mechanics, not recorded NBA screening stats.

Passes choose arrival/departure times by scoring receiver separation, route progress,
passing-lane clearance and pass distance over the simulated movement. The schedule keeps
one ball and reserves room for up to seven ordered passes. The shot follows final delivery;
a no-pass ball handler chooses a look during their own movement. Passing risk uses the
actual release/catch coordinates and defense. The same schedule drives animation and
probabilities, with no user-selected timeline slots. Contacts after the shot cannot
increase its probability. Existing saves keep drawings, receivers, roster and challenge
progress while obsolete `screen`, `routeBeats` and `passBeats` fields are removed.

`engine.js` contains all pursuit, passing and shot math. Route tempo is simplified;
this is not a physics engine or an NBA forecasting model. Probability bounds of
12–88% keep the shot roll fallible and the final level beatable. Pass turnovers are
additional risks, so total possession make probability can be below the shot probability.

## Reproduce

Download the two exact public CSV inputs over verified HTTPS, then run:

```sh
python scripts/bundle-data.py /tmp/player-stats.csv /tmp/team-abbrev.csv
```

Updated upstream files can change the output. Compare source digests and run the data,
draft, source-consistency, simulation and browser tests before accepting a refresh.

## 82-0 research

The direct 82-0 site was blocked by this environment's domain policy. The documented
mechanic was reviewed from the public project description at:
https://github.com/DanielTomaro13/nba-82-0

Its README describes spinning a franchise and era, drafting a starting five and pursuing
an undefeated season. Chalk & Dynasty uses a wholly original chalkboard interface and
a five-defense route-and-pass challenge instead of a season simulator. No code or assets
were copied from that repository.
