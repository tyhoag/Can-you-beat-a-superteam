// A deliberately small, inspectable game model. Ratings are game estimates.
export const ERAS = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
export const LEVELS = [
  {
    name: "Easy",
    team: "The Rec League",
    short: "REC",
    subtitle: "Find your rhythm.",
    style: "zone",
    speed: 3.8,
    gap: 32,
    risk: 0.012,
    color: "#8dbcaa",
    description:
      "A loose zone protects the paint. Work the wings and make them move.",
  },
  {
    name: "Medium",
    team: "City Select",
    short: "CITY",
    subtitle: "Earn your space.",
    style: "man",
    speed: 5.5,
    gap: 25,
    risk: 0.025,
    color: "#a7b8d4",
    description:
      "Man-to-man coverage follows your players. A quick cut can create separation.",
  },
  {
    name: "Hard",
    team: "The Switchmen",
    short: "SWCH",
    subtitle: "No easy matchups.",
    style: "switch",
    speed: 7,
    gap: 20,
    risk: 0.04,
    color: "#e7be79",
    description:
      "Defenders exchange assignments. Spread the floor rather than stacking your routes.",
  },
  {
    name: "Extra Hard",
    team: "Full Court Pressure",
    short: "PRESS",
    subtitle: "Every pass matters.",
    style: "press",
    speed: 8.3,
    gap: 16,
    risk: 0.065,
    color: "#e29583",
    description:
      "Aggressive coverage jumps passing lanes. Short passes and decisive movement help.",
  },
  {
    name: "Impossible",
    team: "The Statistical Five",
    short: "V",
    subtitle: "Legends on the other side.",
    style: "elite",
    speed: 9.2,
    gap: 13,
    risk: 0.075,
    color: "#e6ce83",
    description:
      "A balanced all-time lineup built from the dataset. Elite pursuit and help defense, but every attempt still has a chance.",
  },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const RIM = { x: 250, y: 55 };
export function ratings(p) {
  const rim = clamp(45 + p.fg * 65 + p.points * 0.25, 50, 98);
  // A low-volume or pre-three-point season uses an explicitly estimated range rating.
  const range =
    (p.threeAttempts ?? 0) >= 1
      ? clamp(38 + (p.three ?? 0.25) * 110, 40, 98)
      : clamp(30 + (p.ft ?? 0.7) * 35, 40, 65);
  const creation = clamp(45 + p.assists * 4.2, 45, 98);
  const defense =
    p.steals === null || p.blocks === null
      ? 65
      : clamp(40 + p.steals * 10 + p.blocks * 9 + p.rebounds * 0.8, 40, 98);
  const strength = 0.32 * rim + 0.22 * range + 0.2 * creation + 0.26 * defense;
  return { rim, range, creation, defense, strength };
}
// Greedy, fixed slot order and ID tie-breaks make the opponent reproducible.
export function superteam(players) {
  const slots = [["PG"], ["SG"], ["SF"], ["PF"], ["C"]];
  const used = new Set();
  return slots.map(([slot]) => {
    const eligible = players.filter(
      (p) => !used.has(p.id) && p.position.split("-").includes(slot),
    );
    const best = eligible.sort(
      (a, b) =>
        ratings(b).strength - ratings(a).strength ||
        a.id.localeCompare(b.id) ||
        a.key.localeCompare(b.key),
    )[0];
    if (!best) throw new Error(`No eligible ${slot}`);
    used.add(best.id);
    return { ...best, slot };
  });
}
export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function draftPools(players, era) {
  const groups = new Map();
  for (const p of players.filter((p) => p.era === era)) {
    const current = groups.get(p.team);
    if (!current || p.season > current.latest)
      groups.set(p.team, {
        team: p.team,
        teamName: p.teamName,
        era,
        latest: p.season,
      });
  }
  return [...groups.values()].sort((a, b) =>
    a.teamName.localeCompare(b.teamName),
  );
}
export const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
export function draftOffers(players, era, roster, team = null) {
  const picked = roster
    .map((key) => players.find((p) => p.key === key))
    .filter(Boolean);
  const usedIds = new Set(picked.map((p) => p.id));
  const filled = new Set(picked.map((p) => p.position));
  const pool = players
    .filter((p) => p.era === era && (!team || p.team === team))
    .sort(
      (a, b) =>
        ratings(b).strength - ratings(a).strength ||
        a.id.localeCompare(b.id) ||
        a.key.localeCompare(b.key),
    );
  return POSITIONS.map((position) => {
    const candidates = pool.filter((p) => p.position === position);
    const player = candidates.find((p) => !usedIds.has(p.id)) ?? candidates[0];
    if (!player) return null;
    return {
      ...player,
      draftBlockedReason: filled.has(position)
        ? `${position} filled`
        : usedIds.has(player.id)
          ? "Already drafted"
          : null,
    };
  }).filter(Boolean);
}
export function eligibleDraftTeam(
  players,
  era,
  roster,
  preferred,
  random = Math.random,
) {
  const hasChoice = (team) =>
    draftOffers(players, era, roster, team).some((p) => !p.draftBlockedReason);
  if (preferred && hasChoice(preferred)) return preferred;
  return (
    shuffle(
      draftPools(players, era).filter((p) => hasChoice(p.team)),
      random,
    )[0]?.team ?? null
  );
}
export function selectDraftPlayer(state, key, players, random = Math.random) {
  if (state.stage !== "draft" || state.roster.length >= 5) return state;
  const picked = state.roster.map((key) => players.find((p) => p.key === key));
  if (
    picked.some((p) => !p) ||
    new Set(picked.map((p) => p.position)).size !== picked.length
  )
    return state;
  const index = state.roster.length;
  const choice = draftOffers(
    players,
    state.eras[index],
    state.roster,
    state.draftTeams[index],
  ).find((p) => p.key === key && !p.draftBlockedReason);
  if (!choice) return state;
  const roster = [...state.roster, choice.key];
  const draftTeams = [...state.draftTeams];
  if (roster.length < 5) {
    const next = eligibleDraftTeam(
      players,
      state.eras[roster.length],
      roster,
      draftTeams[roster.length],
      random,
    );
    if (!next) return state;
    draftTeams[roster.length] = next;
  }
  return {
    ...state,
    roster,
    draftTeams,
    stage: roster.length === 5 ? "game" : "draft",
    draftPositionNotice: null,
  };
}
export const DEFAULT_POSITIONS = [
  { x: 250, y: 365 },
  { x: 80, y: 285 },
  { x: 420, y: 285 },
  { x: 145, y: 145 },
  { x: 355, y: 145 },
];
export const BEATS = ["Setup", "Cut", "Finish"];
export const ROUTE_WINDOWS = [
  [0, 0.24],
  [0.34, 0.58],
  [0.68, 0.88],
];
const PASS_WINDOWS = [
  [0.25, 0.33],
  [0.59, 0.67],
  [0.89, 0.99],
];
export const beatAt = (t) => (t < 0.34 ? 0 : t < 0.68 ? 1 : 2);
export function defaultPassBeats(passes) {
  const count = Math.max(0, passes.length - 1);
  return Array.from({ length: count }, (_, i) =>
    count === 1 ? 2 : Math.floor(((i + 1) * 3) / (count + 1)),
  );
}
export function normalizePlay(play) {
  return {
    ...play,
    routeBeats: play.routeBeats ?? [0, 0, 0, 0, 0],
    screen: play.screen ?? null,
    passBeats: play.passBeats ?? defaultPassBeats(play.passes ?? []),
  };
}
export function clearAllRoutes(play) {
  return { ...play, routes: Array.from({ length: 5 }, () => []) };
}
export function resetPlay(play) {
  const passes =
    play.starter === play.shooter
      ? [play.starter]
      : [play.starter, play.shooter];
  return {
    ...clearAllRoutes(play),
    positions: structuredClone(DEFAULT_POSITIONS),
    routeBeats: [0, 0, 0, 0, 0],
    screen: null,
    passes,
    passBeats: defaultPassBeats(passes),
  };
}
export function addPass(play, receiver) {
  if (play.passes.length >= 8) return play;
  const beats = play.passBeats ?? defaultPassBeats(play.passes);
  return {
    ...play,
    passes: [...play.passes, receiver],
    passBeats: [...beats, beats.at(-1) ?? 2],
  };
}
export function screenExample(play) {
  return {
    ...resetPlay(play),
    positions: [
      { x: 250, y: 365 },
      { x: 80, y: 285 },
      { x: 420, y: 285 },
      { x: 130, y: 245 },
      { x: 355, y: 145 },
    ],
    routes: [
      [],
      [
        { x: 165, y: 245 },
        { x: 215, y: 180 },
        { x: 290, y: 115 },
      ],
      [],
      [{ x: 250, y: 95 }],
      [],
    ],
    routeBeats: [0, 1, 0, 2, 0],
    screen: { screener: 3, cutter: 1 },
    starter: 0,
    shooter: 1,
    passes: [0, 1],
    passBeats: [1],
  };
}
export function playerPoint(play, index, t) {
  const beat =
    play.screen?.screener === index ? 2 : (play.routeBeats?.[index] ?? 0);
  const [start, end] = ROUTE_WINDOWS[beat];
  return routePoint(
    play.positions[index],
    play.routes[index],
    (t - start) / (end - start),
  );
}
export function schedulePasses(play) {
  const passes =
    play.mode === "passes"
      ? play.passes
      : play.starter === play.shooter
        ? [play.starter]
        : [play.starter, play.shooter];
  const beats =
    play.mode === "passes"
      ? (play.passBeats ?? defaultPassBeats(passes))
      : defaultPassBeats(passes);
  const seen = [0, 0, 0],
    counts = [0, 0, 0];
  beats.forEach((b) => counts[b]++);
  return passes.slice(1).map((to, i) => {
    const beat = beats[i],
      j = seen[beat]++,
      [start, end] = PASS_WINDOWS[beat],
      slot = (end - start) / counts[beat];
    return {
      from: passes[i],
      to,
      beat,
      t: start + (j + 0.1) * slot,
      arrive: start + (j + 0.9) * slot,
    };
  });
}
export function defaultPlay() {
  return {
    positions: structuredClone(DEFAULT_POSITIONS),
    routes: [
      [{ x: 295, y: 300 }],
      [
        { x: 80, y: 190 },
        { x: 140, y: 105 },
      ],
      [{ x: 435, y: 210 }],
      [{ x: 175, y: 235 }],
      [{ x: 325, y: 105 }],
    ],
    shooter: 2,
    starter: 0,
    passes: [0, 1, 2],
    mode: "routes",
    routeBeats: [0, 0, 0, 0, 0],
    screen: null,
    passBeats: [1, 2],
  };
}
export function routePoint(start, route, t) {
  if (t <= 0 || route.length === 0) return { ...start };
  if (t >= 1) return { ...route.at(-1) };
  const pts = [start, ...route];
  if (pts.length === 1) return { ...start };
  const lengths = pts.slice(1).map((p, i) => distance(p, pts[i]));
  let remaining = lengths.reduce((s, v) => s + v, 0) * clamp(t, 0, 1);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 1 : remaining / lengths[i];
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
      };
    }
    remaining -= lengths[i];
  }
  return { ...start };
}
export function validatePlay(play) {
  if (
    !play ||
    !Array.isArray(play.positions) ||
    play.positions.length !== 5 ||
    !Array.isArray(play.routes) ||
    play.routes.length !== 5
  )
    return "Place all five players on the court.";
  if (
    ![play.shooter, play.starter].every(
      (n) => Number.isInteger(n) && n >= 0 && n < 5,
    )
  )
    return "Choose a ball handler and a shooter.";
  for (let i = 0; i < 5; i++) {
    if (!Array.isArray(play.routes[i]) || play.routes[i].length > 24)
      return "Use at most 24 route points per player.";
    const pts = [play.positions[i], ...play.routes[i]];
    if (
      pts.some(
        (p) =>
          !p ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 22 ||
          p.x > 478 ||
          p.y < 25 ||
          p.y > 445,
      )
    )
      return "Keep every player and route inside the court.";
    if (pts.slice(1).reduce((sum, p, j) => sum + distance(pts[j], p), 0) > 850)
      return "That route is too long. Clear it and draw a shorter route.";
  }
  if (
    play.routeBeats !== undefined &&
    (!Array.isArray(play.routeBeats) ||
      play.routeBeats.length !== 5 ||
      play.routeBeats.some((b) => !Number.isInteger(b) || b < 0 || b > 2))
  )
    return "Choose Setup, Cut, or Finish for each route.";
  if (play.screen !== undefined && play.screen !== null) {
    const { screener, cutter } = play.screen;
    if (
      ![screener, cutter].every(
        (i) => Number.isInteger(i) && i >= 0 && i < 5,
      ) ||
      screener === cutter
    )
      return "Choose two different players for the screen.";
  }
  if (
    play.passBeats !== undefined &&
    (!Array.isArray(play.passBeats) ||
      play.passBeats.some((b) => !Number.isInteger(b) || b < 0 || b > 2))
  )
    return "Choose a valid beat for each pass.";
  if (play.mode === "passes") {
    if (!Array.isArray(play.passes) || play.passes.length < 1)
      return "Add the starting ball handler to the pass sequence.";
    if (play.passes.some((n) => !Number.isInteger(n) || n < 0 || n > 4))
      return "Pass only to players on your team.";
    if (play.passes[0] !== play.starter)
      return "The first player in the sequence must be your starting ball handler.";
    if (play.passes.at(-1) !== play.shooter)
      return "End the pass sequence with your selected shooter.";
    if (play.passes.some((n, i) => i > 0 && n === play.passes[i - 1]))
      return "A player cannot pass to themselves. Remove the repeated step.";
    if (play.passes.length > 8)
      return "Use at most seven passes. Undo a pass to shorten the sequence.";
    const beats = play.passBeats ?? defaultPassBeats(play.passes);
    if (beats.length !== play.passes.length - 1)
      return "Choose a timing for each pass.";
    if (beats.some((b, i) => i > 0 && b < beats[i - 1]))
      return "Pass timings must follow the sequence: Setup, then Cut, then Finish. Move the later pass to the same or a later beat.";
  }
  return null;
}
function segmentDistance(p, a, b) {
  const len = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = len
    ? clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len, 0, 1)
    : 0;
  return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
export function simulate(
  roster,
  play,
  levelIndex,
  random = Math.random,
  opponents = [],
) {
  const error = validatePlay(play);
  if (error) throw new Error(error);
  if (roster.length !== 5) throw new Error("Draft exactly five players first.");
  const level = LEVELS[levelIndex];
  if (!level) throw new Error("Unknown defense.");
  const passes =
    play.mode === "passes"
      ? play.passes
      : play.starter === play.shooter
        ? [play.starter]
        : [play.starter, play.shooter];
  const passEvents = schedulePasses(play);
  let defenders = play.positions.map((p) => ({
    x: p.x + (250 - p.x) * 0.12,
    y: clamp(p.y - level.gap, 25, 445),
  }));
  const frames = [];
  let turnover = null;
  let passRisk = 0;
  const screenedDefenders = new Set();
  for (let step = 0; step <= 48; step++) {
    const t = step / 48;
    const offense = play.positions.map((p, i) => playerPoint(play, i, t));
    const taken = new Set();
    const screenActive = Boolean(play.screen) && t <= 0.62;
    const blocked = [];
    defenders = defenders.map((d, i) => {
      let target = i;
      if (level.style === "switch" || level.style === "elite") {
        target = offense
          .map((p, j) => ({ j, dist: distance(d, p) }))
          .filter((v) => !taken.has(v.j))
          .sort((a, b) => a.dist - b.dist)[0].j;
        taken.add(target);
      }
      const p = offense[target];
      let goal = { x: p.x + (250 - p.x) * 0.06, y: p.y - level.gap };
      if (level.style === "zone")
        goal = {
          x: p.x * 0.64 + play.positions[i].x * 0.36,
          y: p.y * 0.64 + play.positions[i].y * 0.36 - level.gap,
        };
      if (level.style === "press") goal = { x: p.x, y: p.y - 8 };
      const dist = distance(d, goal);
      const defRating =
        levelIndex === 4 && opponents[i] ? ratings(opponents[i]).defense : 70;
      let speed = level.speed * (0.85 + defRating / 450);
      const [cutStart, cutEnd] = ROUTE_WINDOWS[play.routeBeats?.[target] ?? 0];
      if (
        screenActive &&
        target === play.screen.cutter &&
        play.routes[target].length &&
        t >= cutStart &&
        t <= cutEnd
      ) {
        const screen = offense[play.screen.screener];
        if (distance(d, screen) < 65 && segmentDistance(screen, d, goal) < 30) {
          speed *= levelIndex >= 2 ? 0.42 : 0.24;
          blocked.push(i);
          screenedDefenders.add(i);
        }
      }
      const f = dist === 0 ? 0 : Math.min(1, speed / dist);
      return {
        x: clamp(d.x + (goal.x - d.x) * f, 22, 478),
        y: clamp(d.y + (goal.y - d.y) * f, 25, 445),
      };
    });
    frames.push({
      t,
      offense,
      defenders: structuredClone(defenders),
      screenActive,
      blocked,
    });
  }
  for (const event of passEvents) {
    const frame = frames[Math.round(event.t * 48)];
    const a = frame.offense[event.from],
      b = frames[Math.round(event.arrive * 48)].offense[event.to];
    const lane = Math.min(
      ...frame.defenders.map((p) => segmentDistance(p, a, b)),
    );
    const creation = ratings(roster[event.from]).creation;
    const risk = clamp(
      level.risk +
        distance(a, b) / 3200 +
        Math.max(0, 25 - lane) * 0.0035 -
        (creation - 50) * 0.001,
      0.008,
      0.3,
    );
    event.risk = risk;
    passRisk = 1 - (1 - passRisk) * (1 - risk);
    if (!turnover && random() < risk) {
      const lanes = frame.defenders.map((d) => segmentDistance(d, a, b));
      turnover = { ...event, by: lanes.indexOf(Math.min(...lanes)) };
    }
  }
  const final = frames.at(-1);
  const spot = final.offense[play.shooter];
  const separation = Math.min(...final.defenders.map((d) => distance(d, spot)));
  const spacing =
    final.offense
      .filter((_, i) => i !== play.shooter)
      .reduce((s, p) => s + Math.min(140, distance(p, spot)), 0) / 4;
  const shotDistance = distance(spot, RIM);
  const three = shotDistance > 235;
  const ability = ratings(roster[play.shooter]);
  const base =
    shotDistance < 85
      ? 0.6 + ability.rim * 0.002
      : three
        ? 0.23 + ability.range * 0.0023
        : 0.38 + ability.rim * 0.0017;
  const pressure = clamp((65 - separation) / 65, 0, 1);
  const spaceBonus = (spacing - 75) / 700;
  const movement =
    distance(play.positions[play.shooter], spot) > 70 ? 0.035 : 0;
  const screenBonus =
    play.screen?.cutter === play.shooter && screenedDefenders.size > 0
      ? 0.04
      : 0;
  const chance = clamp(
    base -
      pressure * 0.24 +
      spaceBonus +
      movement +
      screenBonus -
      levelIndex * 0.012,
    0.12,
    0.88,
  );
  const made = !turnover && random() < chance;
  let explanation = turnover
    ? "The defense jumped a passing lane. Try a shorter pass or a better passing angle."
    : `${separation > 40 ? "A clean look" : separation > 23 ? "A pressured look" : "A closely contested look"} ${three ? "from outside" : "inside the arc"}. ${spacing > 100 ? "Good team spacing opened the floor." : "Teammates crowded the shooting lane."} ${movement ? "The shooter’s cut helped create the chance." : ""}`;
  if (play.screen)
    explanation +=
      screenedDefenders.size > 0
        ? " The screen slowed a chasing defender." +
          (screenBonus > 0
            ? " The cutter's shot gets a small game-model boost."
            : "")
        : " The screen missed the chasing defender. Place the screener nearer the cutter's defensive path.";
  return {
    screenedDefenders: [...screenedDefenders],
    screenBonus,
    made,
    turnover,
    shooter: play.shooter,
    three,
    chance,
    passRisk,
    separation,
    spacing,
    explanation,
    frames,
    passEvents,
    spot,
    passes,
  };
}
export function roundStatus(results) {
  const makes = results.filter(Boolean).length;
  return makes >= 3
    ? "won"
    : results.length - makes >= 3 || results.length >= 5
      ? "lost"
      : "playing";
}
export function recordResult(state, made) {
  if (state.victory || roundStatus(state.results) !== "playing") return state;
  return {
    ...state,
    results: [...state.results, Boolean(made)],
    totalAttempts: state.totalAttempts + 1,
  };
}
export function advance(state) {
  if (roundStatus(state.results) !== "won") return state;
  return state.level === 4
    ? { ...state, victory: true }
    : { ...state, level: state.level + 1, results: [], round: 1 };
}
export function freshGame(players = []) {
  const eras = shuffle(ERAS).slice(0, 5);
  return {
    version: 2,
    stage: "draft",
    eras,
    draftTeams: eras.map(
      (era) => shuffle(draftPools(players, era))[0]?.team || null,
    ),
    roster: [],
    level: 0,
    results: [],
    round: 1,
    totalAttempts: 0,
    play: defaultPlay(),
    victory: false,
  };
}
export function restoreGame(raw, players) {
  try {
    const s = JSON.parse(raw);
    if (s?.play) s.play = normalizePlay(s.play);
    if (
      s.version !== 2 ||
      !["draft", "game"].includes(s.stage) ||
      !Array.isArray(s.roster) ||
      new Set(s.roster).size !== s.roster.length ||
      s.roster.length > 5 ||
      s.roster.some((key) => !players.some((p) => p.key === key)) ||
      new Set(s.roster.map((key) => players.find((p) => p.key === key)?.id))
        .size !== s.roster.length
    )
      return null;
    if (
      !Array.isArray(s.eras) ||
      s.eras.length !== 5 ||
      new Set(s.eras).size !== 5 ||
      s.eras.some((e) => !ERAS.includes(e))
    )
      return null;
    if (
      !Array.isArray(s.draftTeams) ||
      s.draftTeams.length !== 5 ||
      s.draftTeams.some(
        (team, i) =>
          !draftPools(players, s.eras[i]).some((p) => p.team === team),
      )
    )
      return null;
    if (
      (s.stage === "game" && s.roster.length !== 5) ||
      (s.stage === "draft" && s.roster.length >= 5)
    )
      return null;
    if (
      !Number.isInteger(s.level) ||
      s.level < 0 ||
      s.level > 4 ||
      !Array.isArray(s.results) ||
      s.results.length > 5 ||
      s.results.some((b) => typeof b !== "boolean") ||
      validatePlay({ ...s.play, mode: "routes" })
    )
      return null;
    if (
      !["routes", "passes"].includes(s.play.mode) ||
      !Array.isArray(s.play.passes) ||
      s.play.passes.length > 8 ||
      s.play.passes.some((n) => !Number.isInteger(n) || n < 0 || n > 4)
    )
      return null;
    if (
      typeof s.victory !== "boolean" ||
      (s.victory && (s.level !== 4 || roundStatus(s.results) !== "won")) ||
      !Number.isInteger(s.totalAttempts) ||
      s.totalAttempts < 0 ||
      !Number.isInteger(s.round) ||
      s.round < 1
    )
      return null;
    if (s.stage === "draft") {
      const seen = new Set();
      let count = 0;
      for (const key of s.roster) {
        const position = players.find((p) => p.key === key).position;
        if (seen.has(position)) break;
        seen.add(position);
        count++;
      }
      if (count < s.roster.length) {
        s.roster = s.roster.slice(0, count);
        s.draftPositionNotice =
          "Drafts now require one PG, SG, SF, PF and C. Your picks before the first repeated position were kept; finish the open positions.";
      }
      const next = eligibleDraftTeam(
        players,
        s.eras[s.roster.length],
        s.roster,
        s.draftTeams[s.roster.length],
      );
      if (!next) return null;
      s.draftTeams[s.roster.length] = next;
    }
    return s;
  } catch {
    return null;
  }
}
