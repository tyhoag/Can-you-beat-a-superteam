import test from "node:test";
import assert from "node:assert/strict";
import players from "../src/players.json" with { type: "json" };
import {
  freshGame,
  reshuffleDraft,
  draftOptions,
  selectDraftPlayer,
  restoreGame,
  resetPlay,
  validatePlay,
  simulate,
  superteam,
  formation,
} from "../src/engine.js";
import { firstPlay, template } from "../src/game/playbook.js";
import { LESSONS, lessonPlay } from "../src/game/lessons.js";

const roster = superteam(players);
const pick = (g) =>
  selectDraftPlayer(
    g,
    draftOptions(
      players,
      g.eras[g.roster.length],
      g.roster,
      g.draftTeams[g.roster.length],
    ).find((p) => !p.draftBlockedReason).key,
    players,
  );

test("two reshuffles keep the era and picks, change teams, reject stale cards and survive reload", () => {
  let g = pick(freshGame(players));
  const original = structuredClone(g),
    seen = new Set([g.draftTeams[1]]);
  for (let left = 1; left >= 0; left--) {
    const stale = draftOptions(
      players,
      g.eras[1],
      g.roster,
      g.draftTeams[1],
    ).find((p) => !p.draftBlockedReason);
    g = reshuffleDraft(g, players, () => 0.3);
    assert.equal(g.reshufflesLeft, left);
    assert.deepEqual(g.roster, original.roster);
    assert.deepEqual(g.eras, original.eras);
    assert.ok(!seen.has(g.draftTeams[1]));
    seen.add(g.draftTeams[1]);
    assert.equal(selectDraftPlayer(g, stale.key, players), g);
    assert.deepEqual(restoreGame(JSON.stringify(g), players), g);
  }
  assert.equal(reshuffleDraft(g, players), g);
  g = pick(g);
  assert.equal(g.reshufflesLeft, 0, "budget spans all five picks");
  assert.equal(reshuffleDraft(g, players), g);
  assert.equal(freshGame(players).reshufflesLeft, 2);
});

test("reshuffling the final position offers an eligible team; unavailable alternatives spend nothing", () => {
  let g = freshGame(players);
  for (let i = 0; i < 4; i++) g = pick(g);
  const next = reshuffleDraft(g, players);
  assert.notEqual(next.draftTeams[4], g.draftTeams[4]);
  assert.equal(pick(next).stage, "game");
  const small = players.filter(
    (p) => p.era === g.eras[4] && p.team === g.draftTeams[4],
  );
  assert.equal(reshuffleDraft(g, small), g);
  const complete = pick(next);
  assert.equal(reshuffleDraft(complete, players), complete);
});

test("old saves receive two reshuffles; impossible budgets are rejected", () => {
  const old = freshGame(players);
  delete old.reshufflesLeft;
  delete old.draftTeamHistory;
  assert.equal(restoreGame(JSON.stringify(old), players).reshufflesLeft, 2);
  for (const value of [-1, 3, 1.5, "2"])
    assert.equal(
      restoreGame(JSON.stringify({ ...old, reshufflesLeft: value }), players),
      null,
    );
});

function permutations(items) {
  return items.length
    ? items.flatMap((item, i) =>
        permutations(items.filter((_, j) => i !== j)).map((rest) => [
          item,
          ...rest,
        ]),
      )
    : [[]];
}
test("all 120 draft orders put bigs in the key, wings outside and the ball with the PG", () => {
  for (const team of permutations(roster)) {
    const p = firstPlay(team);
    assert.equal(team[p.starter].position, "PG");
    assert.equal(validatePlay(p), null);
    for (let i = 0; i < 5; i++) {
      const { x, y } = p.positions[i],
        pos = team[i].position;
      if (pos === "C" || pos === "PF")
        assert.ok(x > 176 && x < 324 && y > 22 && y < 210);
      if (pos === "SG" || pos === "SF")
        assert.ok((x < 100 || x > 400) && y > 260);
      if (pos === "PG") assert.deepEqual({ x, y }, { x: 250, y: 365 });
    }
    const edited = template("roll", { ...p, starter: (p.starter + 1) % 5 });
    const reset = resetPlay(edited, team);
    assert.deepEqual(reset.positions, formation(team));
    assert.equal(team[reset.starter].position, "PG");
    assert.ok(reset.routes.every((r) => !r.length));
    assert.equal(reset.shooter, edited.shooter);
  }
});

test("automatic passing makes real relay and give-and-go connections; manual orders remain exact", () => {
  for (const id of ["cut", "give", "screen"]) {
    const p = lessonPlay(id, roster),
      r = simulate(roster, p, 1, () => 0.99);
    assert.equal(p.mode, "routes");
    assert.equal(r.passEvents.length, 2);
    assert.equal(r.passEvents[0].from, p.starter);
    assert.equal(r.passEvents.at(-1).to, p.shooter);
    assert.equal(r.passEvents[0].to, r.passEvents[1].from);
    assert.ok(r.passEvents[1].t > r.passEvents[0].arrive);
    if (id === "give")
      assert.equal(r.passEvents.at(-1).to, r.passEvents[0].from);
    const own = {
      ...p,
      mode: "passes",
      passes: [p.starter, (p.starter + 1) % 5, p.shooter],
    };
    if (own.passes[1] !== p.shooter) {
      assert.deepEqual(simulate(roster, own, 1, () => 0.99).passes, own.passes);
    }
  }
  const roll = lessonPlay("roll", roster),
    r = simulate(roster, roll, 1, () => 0.99);
  assert.equal(
    r.passEvents.length,
    1,
    "a clean pick-and-roll does not force a detour",
  );
  assert.ok(r.passEvents[0].arrive > r.plan.movements[roll.shooter].release);
});

test("all tutorial examples use playable drawings and their advertised basketball actions", () => {
  for (const team of [roster, [...roster].reverse()])
    for (const l of LESSONS) {
      const p = lessonPlay(l.id, team),
        r = simulate(team, p, 1, () => 0.99);
      assert.equal(validatePlay(p), null);
      assert.equal(team[p.starter].position, "PG");
      assert.equal(p.mode, "routes");
      if (l.id === "screen" || l.id === "roll")
        assert.ok(r.screenEvents.length);
      if (l.id === "roll") assert.equal(team[p.shooter].position, "C");
      if (l.id === "give") assert.equal(p.starter, p.shooter);
      assert.ok(r.passEvents.every((e) => e.arrive > e.t));
    }
});
