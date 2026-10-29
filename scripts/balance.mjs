import fs from "node:fs";
import players from "../src/players.json" with { type: "json" };
import {
  ERAS,
  shuffle,
  draftPools,
  draftOffers,
  selectDraftPlayer,
  freshGame,
  simulate,
  superteam,
  clearAllRoutes,
  roundStatus,
} from "../src/engine.js";
import { firstPlay, template, PLAYS } from "../src/game/playbook.js";
let seed = 20261029;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const opponents = superteam(players),
  lineups = [],
  seen = new Set();
for (let n = 0; n < 120; n++) {
  const eras = shuffle(ERAS, random).slice(0, 5);
  let g = {
    ...freshGame(players),
    eras,
    draftTeams: eras.map(
      (e) => shuffle(draftPools(players, e), random)[0].team,
    ),
  };
  for (let i = 0; i < 5; i++) {
    const options = draftOffers(
      players,
      g.eras[i],
      g.roster,
      g.draftTeams[i],
    ).filter((p) => !p.draftBlockedReason);
    g = selectDraftPlayer(
      g,
      options[Math.floor(random() * options.length)].key,
      players,
      random,
    );
  }
  const roster = g.roster.map((k) => players.find((p) => p.key === k));
  roster.forEach((p) => seen.add(p.id));
  lineups.push(roster);
}
const strategies = ["cut", "cut", "screen", "roll", "screen"];
const roundProbability = (p) =>
  10 * p ** 3 * (1 - p) ** 2 + 5 * p ** 4 * (1 - p) + p ** 5;
const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const levels = Array.from({ length: 5 }, (_, level) => {
  const templates = PLAYS.map(({ id }) => {
    const rates = lineups.map((roster) => {
      const r = simulate(
        roster,
        template(id, firstPlay(roster)),
        level,
        () => 0.9999,
        opponents,
      );
      return r.chance * (1 - r.passRisk);
    });
    return {
      id,
      meanBucketRate: avg(rates),
      minBucketRate: Math.min(...rates),
      maxBucketRate: Math.max(...rates),
      meanRoundWinRate: avg(rates.map(roundProbability)),
    };
  });
  const still = lineups.map((roster) => {
    const r = simulate(
      roster,
      clearAllRoutes(template(strategies[level], firstPlay(roster))),
      level,
      () => 0.9999,
      opponents,
    );
    return r.chance * (1 - r.passRisk);
  });
  return {
    level: level + 1,
    strategy: strategies[level],
    stationaryBucketRate: avg(still),
    templates,
  };
});
const runs = [];
for (const roster of lineups) {
  let attempts = 0,
    retries = 0;
  const perLevel = [];
  for (let level = 0; level < 5; level++) {
    const r = simulate(
        roster,
        template(strategies[level], firstPlay(roster)),
        level,
        () => 0.9999,
        opponents,
      ),
      p = r.chance * (1 - r.passRisk);
    let count = 0,
      losses = 0,
      won = false;
    for (let round = 0; round < 30 && !won; round++) {
      const results = [];
      while (roundStatus(results) === "playing") {
        results.push(random() < p);
        count++;
      }
      won = roundStatus(results) === "won";
      if (!won) losses++;
    }
    attempts += count;
    retries += losses;
    perLevel.push({ level: level + 1, attempts: count, retries: losses, won });
  }
  runs.push({
    roster: roster.map((p) => `${p.name} (${p.season})`),
    attempts,
    retries,
    perLevel,
  });
}
const values = runs.map((r) => r.attempts).sort((a, b) => a - b);
const report = {
  seed: 20261029,
  lineups: lineups.length,
  uniquePlayers: seen.size,
  method:
    "120 random valid drafts. Geometry/ratings compute each possession probability. Independent seeded uniform rolls sample the equivalent bucket/miss distribution, including pass risk. A predeclared simple play is used per opponent, not an oracle best play. This measures the model, not human enjoyment.",
  levels,
  runs,
  summary: {
    completed: runs.filter((r) => r.perLevel.every((l) => l.won)).length,
    meanPossessions: avg(values),
    medianPossessions: values[60],
    p90Possessions: values[108],
    maxPossessions: values.at(-1),
    meanRetries: avg(runs.map((r) => r.retries)),
    paceEstimate:
      "At 3.4 seconds of playback plus 6–12 seconds to decide/edit per possession, excluding drafting and tutorial.",
  },
};
const output = process.env.BALANCE_OUTPUT || "docs/qa/rebuild/balance.json";
fs.mkdirSync(output.slice(0, output.lastIndexOf("/")), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ summary: report.summary, levels }, null, 2));
