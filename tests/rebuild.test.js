import test from "node:test";
import assert from "node:assert/strict";
import players from "../src/players.json" with { type: "json" };
import {
  defaultPlay,
  simulate,
  superteam,
  planPlay,
  playerPoint,
  distance,
  validatePlay,
  clearAllRoutes,
  restoreGame,
  freshGame,
} from "../src/engine.js";
import {
  automatic,
  chooseRole,
  template,
  PLAYS,
  firstPlay,
  feedback,
} from "../src/game/playbook.js";
const roster = superteam(players);
test("automatic delivery, templates and clears preserve every chosen handler and shooter", () => {
  for (let starter = 0; starter < 5; starter++)
    for (let shooter = 0; shooter < 5; shooter++) {
      const p = { ...defaultPlay(), starter, shooter };
      for (const next of [
        automatic(p),
        clearAllRoutes(p),
        ...PLAYS.map((t) => template(t.id, p)),
      ]) {
        assert.equal(next.starter, starter);
        assert.equal(next.shooter, shooter);
        assert.equal(validatePlay(next), null);
        const r = simulate(roster, next, 2, () => 0.999, roster);
        assert.equal(r.passes[0], starter);
        assert.equal(r.passes.at(-1), shooter);
      }
    }
});
test("choosing a role keeps the court drawing and works without manual passing", () => {
  const p = template("screen");
  const chosen = chooseRole(p, "starter", 4);
  assert.equal(chosen.starter, 4);
  assert.equal(chosen.shooter, p.shooter);
  assert.deepEqual(chosen.routes, p.routes);
  assert.deepEqual(chosen.positions, p.positions);
  assert.equal(validatePlay(chosen), null);
});
test("a drawn pick-and-roll plants, makes contact, and continues to the rim before the catch", () => {
  for (let level = 0; level < 5; level++) {
    const p = template("roll", { ...defaultPlay(), starter: 0, shooter: 1 });
    const r = simulate(roster, p, level, () => 0.999, roster),
      screen = r.plan.screens.find((s) => s.screener === 1 && s.cutter === 0);
    assert.ok(
      screen?.roll.length,
      "the shooter rolls after setting the handler’s screen",
    );
    const m = r.plan.movements[1];
    assert.ok(m.release > m.ready);
    assert.deepEqual(
      playerPoint(p, 1, (m.ready + m.release) / 2, r.plan),
      screen.point,
    );
    assert.ok(distance(playerPoint(p, 1, m.end, r.plan), screen.point) > 100);
    assert.ok(r.screenEvents.some((s) => s.screener === 1 && s.cutter === 0));
    assert.ok(
      r.frames
        .filter((f) => f.t > screen.release)
        .every((f) => !f.activeScreens.some((s) => s.screener === 1)),
      "a rolling player cannot keep screening",
    );
    assert.ok(r.passEvents.at(-1).arrive > m.release);
    assert.ok(r.spot.y < 130);
  }
});
test("cuts do not accidentally count as screens; off-ball plays do make real contact", () => {
  const p = { ...defaultPlay(), starter: 0, shooter: 1 };
  const cut = simulate(roster, template("cut", p), 1, () => 0.999, roster);
  assert.equal(cut.screenEvents.length, 0);
  const screen = simulate(
    roster,
    template("screen", p),
    1,
    () => 0.999,
    roster,
  );
  assert.ok(
    screen.screenEvents.some((s) => s.cutter === 1 && s.screener !== 0),
  );
  assert.ok(screen.screenEvents.every((s) => s.t <= screen.shotT));
});
test("an interception terminates scheduled delivery and never credits a basket", () => {
  const p = template("give", { ...defaultPlay(), starter: 0, shooter: 1 });
  const r = simulate(roster, p, 4, () => 0, roster);
  assert.ok(r.turnover);
  assert.equal(r.passEvents.length, 1);
  assert.equal(r.made, false);
  assert.ok(
    r.screenEvents.every((s) => s.t <= (r.turnover.t + r.turnover.arrive) / 2),
  );
});
test("new draft starts with a real point guard and an editable valid basketball play", () => {
  const p = firstPlay([...roster].reverse());
  assert.equal([...roster].reverse()[p.starter].position, "PG");
  assert.equal(validatePlay(p), null);
  assert.ok(p.routes[p.shooter].length);
});
test("saved games preserve the rebuild ball choice, drawings, old roster and challenge progress", () => {
  const g = {
    ...freshGame(players),
    stage: "game",
    roster: roster.map((p) => p.key),
    level: 3,
    results: [true, false],
    totalAttempts: 13,
    play: template("roll", { ...defaultPlay(), starter: 4, shooter: 2 }),
  };
  assert.deepEqual(restoreGame(JSON.stringify(g), players), g);
});
test("feedback distinguishes a real screen, an open miss and a turnover", () => {
  const r = simulate(
    roster,
    template("screen", { ...defaultPlay(), starter: 0, shooter: 1 }),
    1,
    () => 0.999,
    roster,
  );
  assert.match(feedback(r), /pick worked/);
  assert.match(feedback({ ...r, screenBonus: 0, separation: 90 }), /open look/);
  assert.match(feedback({ ...r, turnover: {} }), /defender/);
});
