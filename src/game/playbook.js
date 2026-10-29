import { resetPlay, defaultPlay, ratings } from "../engine.js";
export const PLAYS = [
  {
    id: "cut",
    name: "Backdoor cut",
    short: "Cut",
    tip: "Cut behind your defender. The pass finds you near the rim.",
  },
  {
    id: "screen",
    name: "Screen & cut",
    short: "Screen",
    tip: "A teammate plants a screen. Your shooter cuts around it.",
  },
  {
    id: "roll",
    name: "Pick & roll",
    short: "Pick & roll",
    tip: "Set the pick, then roll to the rim. Passing reads the opening.",
  },
  {
    id: "give",
    name: "Give & go",
    short: "Give & go",
    tip: "Pass to a teammate, cut, then get the ball back.",
  },
];
export function automatic(play) {
  return {
    ...play,
    mode: "routes",
    passes:
      play.starter === play.shooter
        ? [play.starter]
        : [play.starter, play.shooter],
  };
}
export function chooseRole(play, role, index) {
  return automatic({ ...play, [role]: index });
}
export function template(id, play = defaultPlay()) {
  const p = automatic(resetPlay(play));
  const shoot = p.shooter,
    start = p.starter;
  const rest = [0, 1, 2, 3, 4].filter((i) => i !== shoot && i !== start);
  const setter = rest[0];
  p.positions[shoot] = { x: 80, y: 285 };
  if (start !== shoot) p.positions[start] = { x: 250, y: 365 };
  const free = [0, 1, 2, 3, 4].filter((i) => i !== shoot && i !== start);
  [
    { x: 425, y: 290 },
    { x: 350, y: 150 },
    { x: 85, y: 90 },
    { x: 250, y: 365 },
  ].forEach((pt, i) => {
    if (free[i] !== undefined) p.positions[free[i]] = pt;
  });
  p.routes[shoot] = [
    { x: 95, y: 230 },
    { x: 185, y: 135 },
    { x: 250, y: 100 },
  ];
  if (id === "screen") {
    p.positions[setter] = { x: 175, y: 255 };
    p.routes[setter] = [{ x: 110, y: 260 }];
    p.routes[shoot] = [
      { x: 130, y: 260 },
      { x: 165, y: 185 },
      { x: 265, y: 105 },
    ];
  }
  if (id === "roll") {
    // With two different roles the shooter sets the pick and rolls for the catch.
    const handler = start === shoot ? shoot : start,
      big = start === shoot ? setter : shoot;
    p.positions[handler] = { x: 80, y: 285 };
    p.positions[big] = { x: 175, y: 255 };
    p.routes[handler] = [
      { x: 130, y: 260 },
      { x: 165, y: 185 },
      { x: 265, y: 115 },
    ];
    p.routes[big] = [
      { x: 110, y: 260 },
      { x: 150, y: 170 },
      { x: 230, y: 95 },
    ];
  }
  if (id === "give") {
    const helper = rest[0];
    p.positions[helper] = { x: 185, y: 250 };
    p.routes[shoot] = [
      { x: 80, y: 210 },
      { x: 165, y: 115 },
      { x: 240, y: 100 },
    ];
    p.mode = "passes";
    p.passes =
      start === shoot ? [start, helper, shoot] : [start, helper, shoot];
  }
  return p;
}
export function firstPlay(roster) {
  const starter = Math.max(
    0,
    roster.findIndex((p) => p.position === "PG"),
  );
  const shooter = roster
    .map((p, i) => ({
      i,
      score:
        ratings(p).rim + (p.position === "SG" || p.position === "SF" ? 7 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0].i;
  return template("cut", { ...defaultPlay(), starter, shooter });
}
export function feedback(result) {
  if (result.turnover)
    return "That pass crossed a defender. Try a shorter connection or a cut.";
  if (result.screenBonus)
    return result.made
      ? "The screen freed your shooter. That’s teamwork."
      : "The pick worked. A good look can still miss—run it again.";
  if (result.separation > 40)
    return result.made
      ? "Your cut created daylight. Keep making them chase."
      : "You created an open look. Keep the play; trust the next shot.";
  if (result.spacing < 80)
    return "Your players crowded the lane. Spread out to open a path.";
  if (result.separation < 24)
    return "A defender stayed close. Cut around a teammate’s screen.";
  return result.made
    ? "Good ball movement. Another bucket toward the win."
    : "A contested shot. Try cutting closer to the basket.";
}
