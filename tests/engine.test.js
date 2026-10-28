import test from "node:test";
import assert from "node:assert/strict";
import players from "../src/players.json" with { type: "json" };
import {
  ERAS,
  LEVELS,
  ratings,
  superteam,
  draftOffers,
  draftPools,
  freshGame,
  defaultPlay,
  validatePlay,
  simulate,
  roundStatus,
  recordResult,
  advance,
  restoreGame,
  routePoint,
  clearAllRoutes,
  resetPlay,
  screenExample,
  playerPoint,
  addPass,
  schedulePasses,
} from "../src/engine.js";
const roster = superteam(players);
const seed = (s) => () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 4294967296;
};
test("dataset spans every historical team-era pool and more than 1,200 unique players", () => {
  assert.equal(players.length, 2443);
  assert.equal(new Set(players.map((p) => p.id)).size, 1231);
  assert.equal(new Set(players.map((p) => p.key)).size, 2443);
  assert.equal(
    ERAS.reduce((n, e) => n + draftPools(players, e).length, 0),
    204,
  );
  for (const p of players) {
    assert.ok(p.source.endsWith(p.id + ".html"));
    assert.equal(Math.floor(p.season / 10) * 10, p.era);
    assert.ok(p.games >= 20);
    assert.ok(p.teamName);
    if (p.season < 1974) {
      assert.equal(p.steals, null);
      assert.equal(p.blocks, null);
    }
  }
});
test("every team-era pool supports a duplicate-safe five-candidate draft", () => {
  for (const era of ERAS)
    for (const pool of draftPools(players, era)) {
      const available = players.filter(
        (p) => p.era === era && p.team === pool.team,
      );
      assert.ok(available.length >= 9);
      const used = available.slice(0, 4).map((p) => p.key);
      const offers = draftOffers(players, era, used, pool.team);
      assert.equal(offers.length, 5);
      const usedIds = new Set(available.slice(0, 4).map((p) => p.id));
      assert.ok(offers.every((p) => !usedIds.has(p.id)));
      assert.equal(new Set(offers.map((p) => p.id)).size, 5);
    }
});
test("100 full drafts produce exactly five unique players from five real team-era pools", () => {
  for (let n = 0; n < 100; n++) {
    const g = freshGame(players);
    assert.equal(new Set(g.eras).size, 5);
    g.eras.forEach((era, i) => {
      const offers = draftOffers(players, era, g.roster, g.draftTeams[i]);
      assert.equal(offers.length, 5);
      assert.ok(
        offers.every((p) => p.era === era && p.team === g.draftTeams[i]),
      );
      const selected = offers[n % 5];
      assert.ok(
        !g.roster
          .map((key) => players.find((p) => p.key === key).id)
          .includes(selected.id),
      );
      g.roster.push(selected.key);
    });
    assert.equal(g.roster.length, 5);
  }
});
test("duplicate prevention uses player identity across team and season records", () => {
  const jordan = players.find((p) => p.name === "Michael Jordan");
  const all = players.filter((p) => p.id === jordan.id);
  assert.ok(all.length >= 2);
  for (const p of all)
    assert.ok(
      draftOffers(players, p.era, [jordan.key], p.team).every(
        (q) => q.id !== jordan.id,
      ),
    );
});
test("default play is immediately valid in both modes", () => {
  const p = defaultPlay();
  assert.equal(validatePlay(p), null);
  p.mode = "passes";
  assert.equal(validatePlay(p), null);
});
test("invalid passes explain start, finish, self-pass, invalid player, length", () => {
  const p = { ...defaultPlay(), mode: "passes" };
  assert.match(validatePlay({ ...p, passes: [1, 2] }), /first player/);
  assert.match(validatePlay({ ...p, passes: [0, 1] }), /End the pass/);
  assert.match(validatePlay({ ...p, passes: [0, 0, 2] }), /themselves/);
  assert.match(
    validatePlay({ ...p, passes: [0, 9, 2] }),
    /players on your team/,
  );
  assert.match(
    validatePlay({ ...p, passes: [0, 1, 0, 1, 0, 1, 0, 1, 2] }),
    /seven passes/,
  );
  assert.equal(
    validatePlay({ ...p, starter: 2, passes: [2], passBeats: [] }),
    null,
  );
  assert.equal(
    validatePlay({ ...p, passes: [0, 1, 0, 2], passBeats: [0, 1, 2] }),
    null,
  );
});
test("invalid coordinates, overlong routes and missing players cannot run", () => {
  const p = defaultPlay();
  p.positions[0].x = 1000;
  assert.match(validatePlay(p), /inside the court/);
  assert.match(
    validatePlay({ ...defaultPlay(), positions: [] }),
    /five players/,
  );
  const q = defaultPlay();
  q.routes[0] = Array.from({ length: 10 }, (_, i) => ({
    x: i % 2 ? 25 : 475,
    y: 400,
  }));
  assert.match(validatePlay(q), /too long/);
  assert.throws(() => simulate(roster, p, 0), /inside/);
});
test("route interpolation follows waypoints and stays at its last point", () => {
  assert.deepEqual(
    routePoint(
      { x: 0, y: 0 },
      [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      0.75,
    ),
    { x: 10, y: 5 },
  );
  assert.deepEqual(routePoint({ x: 0, y: 0 }, [], 0.8), { x: 0, y: 0 });
});
test("superteam reproducibly covers five positions with five unique players", () => {
  const a = superteam(players);
  assert.deepEqual(a, superteam([...players].reverse()));
  assert.deepEqual(
    a.map((p) => p.slot),
    ["PG", "SG", "SF", "PF", "C"],
  );
  assert.equal(new Set(a.map((p) => p.id)).size, 5);
  assert.ok(a.every((p) => p.position.includes(p.slot)));
});
test("missing historical defense has explicit neutral estimate; ratings finite", () => {
  assert.equal(ratings(players.find((p) => p.steals === null)).defense, 65);
  for (const p of players)
    for (const v of Object.values(ratings(p)))
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 100);
});
test("animation includes all offense and defenders, finite frames, ordered passes", () => {
  const r = simulate(
    roster,
    { ...defaultPlay(), mode: "passes" },
    2,
    () => 0.99,
    roster,
  );
  assert.equal(r.frames.length, 49);
  for (const f of r.frames) {
    assert.equal(f.offense.length, 5);
    assert.equal(f.defenders.length, 5);
    assert.ok(
      f.offense.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    );
  }
  assert.equal(r.passEvents.length, 2);
  assert.ok(r.passEvents[0].t < r.passEvents[1].t);
});
test("a turnover overrides the shot and identifies the interrupted pass", () => {
  const r = simulate(roster, defaultPlay(), 4, () => 0, roster);
  assert.ok(r.turnover);
  assert.equal(r.made, false);
  assert.match(r.explanation, /passing lane/);
});
test("changed spacing affects shot chance", () => {
  const p = defaultPlay();
  p.routes = Array.from({ length: 5 }, () => []);
  p.shooter = 0;
  p.starter = 0;
  p.positions = [
    { x: 250, y: 120 },
    { x: 70, y: 280 },
    { x: 430, y: 280 },
    { x: 90, y: 400 },
    { x: 410, y: 400 },
  ];
  const spread = simulate(roster, p, 0, () => 0.99, roster);
  const q = structuredClone(p);
  q.positions = q.positions.map((_, i) => ({ x: 250 + i * 3, y: 120 + i * 3 }));
  const crowded = simulate(roster, q, 0, () => 0.99, roster);
  assert.ok(spread.spacing > crowded.spacing);
  assert.ok(spread.chance > crowded.chance + 0.05);
});
test("defensive difficulty reduces chance and raises pass risk for same play", () => {
  const a = simulate(roster, defaultPlay(), 0, () => 0.99, roster),
    b = simulate(roster, defaultPlay(), 4, () => 0.99, roster);
  assert.ok(a.chance > b.chance);
  assert.ok(b.passRisk > a.passRisk);
});
test("same play can make or miss, including Impossible; outcomes remain bounded", () => {
  for (const l of [0, 4]) {
    let makes = 0,
      misses = 0;
    const rng = seed(204);
    for (let i = 0; i < 150; i++) {
      const r = simulate(roster, defaultPlay(), l, rng, roster);
      assert.ok(r.chance >= 0.12 && r.chance <= 0.88);
      r.made ? makes++ : misses++;
    }
    assert.ok(makes > 10 && misses > 10);
  }
});
test("three makes advance; three misses end a round; finished rounds cannot record", () => {
  assert.equal(roundStatus([true, false, true]), "playing");
  assert.equal(roundStatus([true, true, true]), "won");
  assert.equal(roundStatus([false, true, false, false]), "lost");
  let g = {
    ...freshGame(players),
    stage: "game",
    roster: roster.map((p) => p.key),
  };
  g = recordResult(recordResult(recordResult(g, true), true), true);
  assert.equal(recordResult(g, false), g);
  g = advance(g);
  assert.equal(g.level, 1);
  assert.deepEqual(g.results, []);
  assert.equal(g.totalAttempts, 3);
});
test("five defensive wins produce final victory without losing the roster", () => {
  let g = {
    ...freshGame(players),
    stage: "game",
    roster: roster.map((p) => p.key),
  };
  for (let l = 0; l < 5; l++) {
    for (let i = 0; i < 3; i++) g = recordResult(g, true);
    g = advance(g);
  }
  assert.equal(g.victory, true);
  assert.equal(g.level, 4);
  assert.equal(g.totalAttempts, 15);
  assert.deepEqual(
    g.roster,
    roster.map((p) => p.key),
  );
});
test("saved game roundtrips; malformed state safely starts fresh", () => {
  const g = {
    ...freshGame(players),
    stage: "game",
    roster: roster.map((p) => p.key),
  };
  assert.deepEqual(restoreGame(JSON.stringify(g), players), g);
  for (const s of [
    "nope",
    "{}",
    "null",
    JSON.stringify({ ...g, level: 80 }),
    JSON.stringify({ ...g, roster: ["missing"] }),
    JSON.stringify({ ...g, play: {} }),
    JSON.stringify({ ...g, victory: true }),
  ])
    assert.equal(restoreGame(s, players), null);
});

test("shooter ability and shot location change the displayed model probability", () => {
  const base = defaultPlay();
  base.routes = Array.from({ length: 5 }, () => []);
  base.shooter = 0;
  base.starter = 0;
  base.positions[0] = { x: 250, y: 115 };
  const good = structuredClone(roster),
    weak = structuredClone(roster);
  good[0] = { ...good[0], fg: 0.65, points: 35, three: 0.45, threeAttempts: 8 };
  weak[0] = { ...weak[0], fg: 0.35, points: 6, three: 0.2, threeAttempts: 3 };
  const a = simulate(good, base, 1, () => 0.99, roster),
    b = simulate(weak, base, 1, () => 0.99, roster);
  assert.ok(a.chance > b.chance);
  const far = structuredClone(base);
  far.positions[0] = { x: 250, y: 400 };
  const c = simulate(good, far, 1, () => 0.99, roster);
  assert.ok(a.chance > c.chance);
  assert.equal(a.three, false);
  assert.equal(c.three, true);
});
test("moving a shooter away from a starting defender can create separation", () => {
  const p = defaultPlay();
  p.shooter = 0;
  p.starter = 0;
  p.routes = Array.from({ length: 5 }, () => []);
  p.positions[0] = { x: 95, y: 350 };
  const still = simulate(roster, p, 0, () => 0.99, roster);
  const cut = structuredClone(p);
  cut.routes[0] = [{ x: 250, y: 110 }];
  const moving = simulate(roster, cut, 0, () => 0.99, roster);
  assert.ok(moving.separation > still.separation);
  assert.ok(moving.chance > still.chance);
});

test("clear all routes preserves custom positions, pass timing, screen and player choices", () => {
  const p = screenExample({ ...defaultPlay(), mode: "passes" });
  p.positions[0] = { x: 222, y: 333 };
  const before = structuredClone(p),
    after = clearAllRoutes(p);
  assert.ok(after.routes.every((r) => r.length === 0));
  assert.deepEqual(after.positions, before.positions);
  assert.deepEqual(after.passes, before.passes);
  assert.deepEqual(after.passBeats, before.passBeats);
  assert.deepEqual(after.screen, before.screen);
  assert.equal(after.shooter, before.shooter);
  assert.deepEqual(p, before);
});
test("full reset restores original spots with no routes, screen or inherited sequence", () => {
  const p = screenExample({ ...defaultPlay(), mode: "passes" });
  p.positions[0] = { x: 222, y: 333 };
  const after = resetPlay(p);
  assert.deepEqual(after.positions, defaultPlay().positions);
  assert.ok(after.routes.every((r) => r.length === 0));
  assert.equal(after.screen, null);
  assert.deepEqual(after.routeBeats, [0, 0, 0, 0, 0]);
  assert.deepEqual(after.passes, [p.starter, p.shooter]);
  assert.deepEqual(after.passBeats, [2]);
  assert.equal(after.mode, "passes");
  assert.equal(validatePlay(after), null);
});
test("route beats wait for Setup, Cut or Finish; screen setter holds then rolls", () => {
  const p = screenExample(defaultPlay());
  assert.deepEqual(playerPoint(p, 1, 0.25), p.positions[1]);
  assert.notDeepEqual(playerPoint(p, 1, 0.45), p.positions[1]);
  assert.deepEqual(playerPoint(p, 1, 0.6), p.routes[1].at(-1));
  assert.deepEqual(playerPoint(p, 3, 0.65), p.positions[3]);
  assert.notDeepEqual(playerPoint(p, 3, 0.75), p.positions[3]);
  assert.deepEqual(playerPoint(p, 3, 1), p.routes[3].at(-1));
});
test("ordered passes leave after the chosen beats and cannot overlap", () => {
  const p = {
    ...defaultPlay(),
    mode: "passes",
    passes: [0, 1, 0, 2],
    passBeats: [0, 1, 2],
  };
  let events = schedulePasses(p);
  assert.ok(events[0].t > 0.24 && events[0].arrive < 0.34);
  assert.ok(events[1].t > 0.58 && events[1].arrive < 0.68);
  assert.ok(events[2].t > 0.88 && events[2].arrive < 1);
  events = schedulePasses({ ...p, passBeats: [1, 1, 1] });
  assert.ok(
    events.every(
      (e, i) => e.arrive > e.t && (!i || e.t > events[i - 1].arrive),
    ),
  );
  assert.match(
    validatePlay({ ...p, passBeats: [2, 1, 2] }),
    /timings must follow/,
  );
  assert.match(validatePlay({ ...p, passBeats: [0] }), /timing for each/);
  assert.match(
    validatePlay({ ...p, routeBeats: [0, 0, 0, 0, 5] }),
    /Choose Setup/,
  );
  assert.match(
    validatePlay({ ...p, screen: { screener: 1, cutter: 1 } }),
    /different players/,
  );
});
test("moving a screen into a chasing defender path changes pursuit and shot outcome factors", () => {
  const p = screenExample(defaultPlay()),
    hit = simulate(roster, p, 1, () => 0.99, roster);
  const far = structuredClone(p);
  far.positions[3] = { x: 470, y: 430 };
  const miss = simulate(roster, far, 1, () => 0.99, roster);
  const without = simulate(
    roster,
    { ...p, screen: null },
    1,
    () => 0.99,
    roster,
  );
  assert.ok(hit.screenedDefenders.length > 0);
  assert.equal(miss.screenedDefenders.length, 0);
  assert.equal(hit.screenBonus, 0.04);
  assert.equal(miss.screenBonus, 0);
  assert.notDeepEqual(hit.frames[24].defenders, without.frames[24].defenders);
  assert.ok(hit.chance > without.chance);
  assert.match(hit.explanation, /screen slowed/);
  assert.match(miss.explanation, /screen missed/);
});
test("chosen pass timing changes arrival location and passing risk; Routes mode uses automatic delivery", () => {
  const p = screenExample({ ...defaultPlay(), mode: "passes" });
  const early = simulate(
    roster,
    { ...p, passBeats: [0] },
    1,
    () => 0.99,
    roster,
  );
  const cut = simulate(roster, { ...p, passBeats: [1] }, 1, () => 0.99, roster);
  assert.notEqual(early.passEvents[0].t, cut.passEvents[0].t);
  assert.notEqual(early.passRisk, cut.passRisk);
  assert.deepEqual(
    early.frames[Math.round(early.passEvents[0].arrive * 48)].offense[1],
    p.positions[1],
  );
  assert.deepEqual(
    cut.frames[Math.round(cut.passEvents[0].arrive * 48)].offense[1],
    p.routes[1].at(-1),
  );
  const auto = schedulePasses({ ...p, mode: "routes", passBeats: [0] });
  assert.equal(auto[0].beat, 2);
  assert.deepEqual(
    addPass({ ...p, passes: [0], passBeats: [] }, 1).passBeats,
    [2],
  );
});
test("old saved teams and challenge progress migrate without a new draft", () => {
  const g = {
    ...freshGame(players),
    stage: "game",
    roster: roster.map((p) => p.key),
    level: 3,
    results: [true, false],
    round: 2,
    totalAttempts: 11,
  };
  const expected = structuredClone(g);
  delete g.play.routeBeats;
  delete g.play.passBeats;
  delete g.play.screen;
  assert.deepEqual(restoreGame(JSON.stringify(g), players), expected);
});
