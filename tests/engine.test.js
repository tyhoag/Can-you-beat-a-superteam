import test from "node:test";
import assert from "node:assert/strict";
import players from "../src/players.json" with { type: "json" };
import {
  ERAS,
  POSITIONS,
  selectDraftPlayer,
  eligibleDraftTeam,
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
  planPlay,
  initialDefenders,
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
test("every team-era pool has one card per position and locks filled positions", () => {
  for (const era of ERAS)
    for (const pool of draftPools(players, era)) {
      const offers = draftOffers(players, era, [], pool.team);
      assert.deepEqual(
        offers.map((p) => p.position),
        POSITIONS,
      );
      assert.ok(offers.every((p) => !p.draftBlockedReason));
      for (const first of offers) {
        const next = draftOffers(players, era, [first.key], pool.team);
        assert.equal(next.length, 5);
        assert.equal(next.filter((p) => p.draftBlockedReason).length, 1);
        assert.equal(
          next.find((p) => p.position === first.position).draftBlockedReason,
          `${first.position} filled`,
        );
        assert.ok(
          next
            .filter((p) => !p.draftBlockedReason)
            .every((p) => p.id !== first.id && p.position !== first.position),
        );
      }
    }
});
test("200 randomized drafts finish with exactly one of all five positions and no duplicate identities", () => {
  const rng = seed(713);
  for (let n = 0; n < 200; n++) {
    let g = freshGame(players);
    assert.equal(new Set(g.eras).size, 5);
    for (let i = 0; i < 5; i++) {
      const all = draftOffers(players, g.eras[i], g.roster, g.draftTeams[i]);
      const available = all.filter((p) => !p.draftBlockedReason);
      assert.ok(available.length > 0);
      const selected = available[Math.floor(rng() * available.length)];
      const next = selectDraftPlayer(g, selected.key, players, rng);
      assert.notEqual(next, g);
      g = next;
      assert.equal(g.roster.length, i + 1);
    }
    const roster = g.roster.map((key) => players.find((p) => p.key === key));
    assert.equal(g.stage, "game");
    assert.equal(new Set(roster.map((p) => p.id)).size, 5);
    assert.deepEqual(
      roster.map((p) => p.position).sort(),
      [...POSITIONS].sort(),
    );
  }
});
test("selection rejects filled positions, stale cards and picks after the draft", () => {
  let g = freshGame(players);
  const offers = draftOffers(players, g.eras[0], g.roster, g.draftTeams[0]);
  g = selectDraftPlayer(g, offers[0].key, players);
  const next = draftOffers(players, g.eras[1], g.roster, g.draftTeams[1]);
  const locked = next.find((p) => p.position === offers[0].position);
  assert.ok(locked.draftBlockedReason);
  assert.equal(selectDraftPlayer(g, locked.key, players), g);
  assert.equal(selectDraftPlayer(g, offers[0].key, players), g);
  assert.equal(selectDraftPlayer(g, "missing-player", players), g);
  while (g.stage === "draft") {
    const i = g.roster.length,
      p = draftOffers(players, g.eras[i], g.roster, g.draftTeams[i]).find(
        (p) => !p.draftBlockedReason,
      );
    g = selectDraftPlayer(g, p.key, players);
  }
  assert.equal(selectDraftPlayer(g, offers[1].key, players), g);
});
test("duplicate prevention uses player identity across team, season and position records", () => {
  const jordan = players.find((p) => p.name === "Michael Jordan");
  for (const p of players.filter((p) => p.id === jordan.id)) {
    const offers = draftOffers(players, p.era, [jordan.key], p.team);
    assert.ok(
      offers
        .filter((q) => !q.draftBlockedReason)
        .every((q) => q.id !== jordan.id),
    );
  }
});
test("team selection recovers when the last open position has only an already-drafted identity", () => {
  const template = players[0];
  const fixture = [
    ...POSITIONS.map((position, i) => ({
      ...template,
      id: `old${i}`,
      key: `old${i}`,
      position,
      era: 1960,
      team: "OLD",
      teamName: "Old",
    })),
    ...POSITIONS.map((position, i) => ({
      ...template,
      id: i === 0 ? "old4" : `a${i}`,
      key: `a${i}`,
      position,
      era: 2020,
      team: "A",
      teamName: "A",
    })),
    ...POSITIONS.map((position, i) => ({
      ...template,
      id: `b${i}`,
      key: `b${i}`,
      position,
      era: 2020,
      team: "B",
      teamName: "B",
    })),
  ];
  const roster = ["old1", "old2", "old3", "old4"];
  assert.ok(
    draftOffers(fixture, 2020, roster, "A").every((p) => p.draftBlockedReason),
  );
  assert.equal(
    eligibleDraftTeam(fixture, 2020, roster, "A", () => 0),
    "B",
  );
  const g = {
    ...freshGame(players),
    stage: "draft",
    eras: [1970, 1980, 1990, 1960, 2020],
    draftTeams: ["X", "X", "X", "OLD", "A"],
    roster: roster.slice(0, 3),
  };
  const next = selectDraftPlayer(g, "old4", fixture, () => 0);
  assert.equal(next.roster.length, 4);
  assert.equal(next.draftTeams[4], "B");
  const done = selectDraftPlayer(next, "b0", fixture, () => 0);
  assert.equal(done.stage, "game");
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

test("clear all routes keeps positions, receiver order and shooter but removes drawn picks", () => {
  const p = screenExample({ ...defaultPlay(), mode: "passes" });
  p.positions[0] = { x: 222, y: 333 };
  const before = structuredClone(p),
    after = clearAllRoutes(p);
  assert.ok(after.routes.every((r) => r.length === 0));
  assert.deepEqual(after.positions, before.positions);
  assert.deepEqual(after.passes, before.passes);
  assert.equal(after.shooter, before.shooter);
  assert.deepEqual(p, before);
});
test("full reset restores original spots and direct delivery with no drawn screens", () => {
  const p = screenExample({ ...defaultPlay(), mode: "passes" });
  p.positions[0] = { x: 222, y: 333 };
  const after = resetPlay(p);
  assert.deepEqual(after.positions, defaultPlay().positions);
  assert.ok(after.routes.every((r) => r.length === 0));
  assert.deepEqual(planPlay(after).screens, []);
  assert.deepEqual(after.passes, [p.starter, p.shooter]);
  assert.equal(after.mode, "passes");
  assert.equal(validatePlay(after), null);
});
test("routes ending at another defender or teammate infer a screen without selecting a setter", () => {
  for (const target of ["defender", "teammate"]) {
    const p = screenExample(defaultPlay());
    p.routes[3] = [
      {
        ...(target === "defender" ? initialDefenders(p, 1)[1] : p.positions[1]),
      },
    ];
    const plan = planPlay(p, 1),
      screen = plan.screens.find((s) => s.screener === 3 && s.cutter === 1);
    assert.ok(screen, target);
    assert.deepEqual(screen.point, p.routes[3].at(-1));
    assert.ok(plan.movements[1].start > screen.ready);
    assert.deepEqual(playerPoint(p, 1, screen.ready, plan), p.positions[1]);
    assert.deepEqual(
      playerPoint(p, 3, screen.ready + 0.05, plan),
      screen.point,
    );
    assert.notDeepEqual(
      playerPoint(p, 1, plan.movements[1].start + 0.1, plan),
      p.positions[1],
    );
  }
});
test("a planted teammate beside a through-cut also sets an implied screen", () => {
  const p = screenExample(defaultPlay());
  p.positions[3] = { x: 110, y: 260 };
  p.routes[3] = [];
  const r = simulate(roster, p, 1, () => 0.99, roster);
  assert.ok(r.plan.screens.some((s) => s.screener === 3 && s.cutter === 1));
  assert.ok(r.screenEvents.some((s) => s.screener === 3 && s.cutter === 1));
});
test("off-ball and on-ball screens make actual defender contact; misplaced routes give no boost", () => {
  for (const starter of [0, 1]) {
    const p = { ...screenExample(defaultPlay()), starter };
    const hit = simulate(roster, p, 1, () => 0.99, roster);
    const far = structuredClone(p);
    far.routes[3] = [{ x: 470, y: 430 }];
    const miss = simulate(roster, far, 1, () => 0.99, roster);
    assert.ok(hit.screenEvents.some((s) => s.cutter === 1));
    assert.equal(hit.screenBonus, 0.04);
    assert.equal(miss.screenEvents.length, 0);
    assert.equal(miss.screenBonus, 0);
    assert.notDeepEqual(hit.frames[12].defenders, miss.frames[12].defenders);
    assert.match(hit.explanation, /screen slowed/);
    if (starter === 0) assert.ok(hit.screenEvents[0].t < hit.passEvents[0].t);
    else assert.equal(hit.passEvents.length, 0);
  }
});
test("two independent off-ball screens can work in one possession", () => {
  const p = screenExample(defaultPlay());
  p.positions[4] = { x: 360, y: 255 };
  p.routes[4] = [{ x: 400, y: 260 }];
  p.routes[2] = [
    { x: 380, y: 260 },
    { x: 335, y: 185 },
    { x: 265, y: 105 },
  ];
  const r = simulate(roster, p, 1, () => 0.99, roster);
  assert.ok(r.screenEvents.some((s) => s.screener === 3 && s.cutter === 1));
  assert.ok(r.screenEvents.some((s) => s.screener === 4 && s.cutter === 2));
  assert.ok(
    r.screenBonus <= 0.04,
    "multiple picks do not stack unlimited bonuses",
  );
});
test("circular and zero-length drawings stay finite and cannot deadlock movement", () => {
  const p = resetPlay(defaultPlay());
  p.routes[0] = [{ ...p.positions[1] }];
  p.routes[1] = [{ ...p.positions[0] }];
  p.routes[2] = [{ ...p.positions[2] }, { ...p.positions[2] }];
  const r = simulate(roster, p, 1, () => 0.99, roster);
  for (const m of r.plan.movements)
    assert.ok(Number.isFinite(m.end) && m.end <= 0.94);
  for (const f of r.frames)
    for (const point of f.offense)
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
});
test("chained screens finish setting before each cutter moves", () => {
  const p = resetPlay(defaultPlay());
  p.positions = [50, 150, 250, 350, 450].map((x) => ({ x, y: 400 }));
  const defenders = initialDefenders(p, 1);
  p.routes = defenders.slice(1).map((point) => [{ ...point }]);
  p.routes.push([{ x: 250, y: 80 }]);
  const plan = planPlay(p, 1);
  assert.equal(plan.screens.length, 4);
  for (const screen of plan.screens) {
    assert.ok(plan.movements[screen.cutter].start > screen.ready);
    assert.ok(plan.movements[screen.cutter].end <= 0.94);
  }
});
test("automatic passes react to the cut and coverage; old timing choices have no effect", () => {
  const p = screenExample(defaultPlay());
  const r = simulate(roster, p, 1, () => 0.99, roster);
  const changed = simulate(
    roster,
    {
      ...p,
      routeBeats: [2, 2, 2, 2, 2],
      passBeats: [0],
      screen: { screener: 0, cutter: 4 },
    },
    1,
    () => 0.99,
    roster,
  );
  assert.deepEqual(changed.passEvents, r.passEvents);
  assert.deepEqual(changed.frames, r.frames);
  assert.equal(changed.chance, r.chance);
  const p2 = structuredClone(p);
  p2.routes[1] = [{ x: 90, y: 200 }];
  const different = simulate(roster, p2, 1, () => 0.99, roster);
  assert.notEqual(different.passEvents[0].t, r.passEvents[0].t);
  assert.ok(r.passEvents[0].arrive > r.plan.movements[1].start);
  assert.ok(r.passEvents[0].arrive <= r.plan.movements[1].end);
  assert.ok(r.shotT > r.passEvents[0].arrive && r.shotT <= 1);
  assert.deepEqual(
    r.spot,
    r.frames[Math.round(r.shotT * 48)].offense[p.shooter],
  );
  assert.ok(
    r.screenEvents.every((s) => s.t <= r.shotT),
    "future screens cannot boost an earlier shot",
  );
});
test("up to seven automatic passes remain ordered with one ball and no timing controls", () => {
  for (const passes of [[0], [0, 1], [0, 1, 0, 2], [0, 1, 2, 3, 4, 0, 1, 2]]) {
    const p = {
      ...defaultPlay(),
      mode: "passes",
      passes,
      shooter: passes.at(-1),
    };
    assert.equal(validatePlay(p), null);
    const r = simulate(roster, p, 1, () => 0.99, roster);
    assert.equal(r.passEvents.length, passes.length - 1);
    assert.ok(
      r.passEvents.every(
        (e, i) =>
          e.t >= 0 &&
          e.arrive > e.t &&
          e.arrive <= r.shotT &&
          (!i || e.t > r.passEvents[i - 1].arrive),
      ),
    );
  }
  assert.deepEqual(
    addPass({ ...defaultPlay(), passes: [0] }, 1).passes,
    [0, 1],
  );
});
test("a turnover cannot claim a screen that would happen after possession ended", () => {
  const p = {
    ...screenExample(defaultPlay()),
    mode: "passes",
    passes: [0, 2, 1],
  };
  const r = simulate(roster, p, 1, () => 0, roster);
  assert.ok(r.turnover);
  const interception = (r.turnover.t + r.turnover.arrive) / 2;
  assert.ok(r.screenEvents.every((s) => s.t <= interception));
  assert.equal(r.made, false);
});
test("saved legacy timelines retire without losing drawings, receivers, team or progress", () => {
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
  g.play.routeBeats = [2, 1, 0, 2, 0];
  g.play.passBeats = [2, 0];
  g.play.screen = { screener: 3, cutter: 1 };
  assert.deepEqual(restoreGame(JSON.stringify(g), players), expected);
});

test("unfinished legacy drafts keep the valid prefix before a repeated position; completed games remain playable", () => {
  const g = freshGame(players),
    pgs = players.filter((p) => p.position === "PG");
  g.roster = [pgs[0].key, pgs.find((p) => p.id !== pgs[0].id).key];
  const restored = restoreGame(JSON.stringify(g), players);
  assert.deepEqual(restored.roster, [g.roster[0]]);
  assert.match(restored.draftPositionNotice, /one PG/);
  assert.ok(
    draftOffers(
      players,
      restored.eras[1],
      restored.roster,
      restored.draftTeams[1],
    ).some((p) => !p.draftBlockedReason),
  );
  const unique = [];
  for (const p of pgs)
    if (!unique.some((q) => q.id === p.id) && unique.length < 5) unique.push(p);
  const legacy = {
    ...freshGame(players),
    stage: "game",
    roster: unique.map((p) => p.key),
    level: 3,
    results: [true, false],
    totalAttempts: 17,
  };
  assert.deepEqual(restoreGame(JSON.stringify(legacy), players), legacy);
});
