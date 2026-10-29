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
    name: "Final boss",
    team: "The Superteam",
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
export const DRAFT_CHOICES_PER_POSITION = 3;
export const DRAFT_RESHUFFLES = 2;
export function draftOptions(players, era, roster, team = null) {
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
  return POSITIONS.flatMap((position) => {
    const seen = new Set();
    const candidates = pool.filter((p) => {
      if (p.position !== position || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    const available = candidates.filter((p) => !usedIds.has(p.id));
    const choices = available.length ? available : candidates.slice(0, 1);
    return choices.slice(0, DRAFT_CHOICES_PER_POSITION).map((player) => ({
      ...player,
      draftBlockedReason: filled.has(position)
        ? `${position} filled`
        : usedIds.has(player.id)
          ? "Already drafted"
          : null,
    }));
  });
}
// One opening card per position; all alternatives use the same eligibility rules.
export function draftOffers(players, era, roster, team = null) {
  const options = draftOptions(players, era, roster, team);
  return POSITIONS.map((position) =>
    options.find((p) => p.position === position),
  ).filter(Boolean);
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
export function reshuffleChoices(state, players) {
  if (state.stage !== "draft" || state.reshufflesLeft <= 0) return [];
  const index = state.roster.length;
  const seen = new Set([
    state.draftTeams[index],
    ...(state.draftTeamHistory ?? []),
  ]);
  return draftPools(players, state.eras[index]).filter(
    (pool) =>
      !seen.has(pool.team) &&
      draftOffers(players, state.eras[index], state.roster, pool.team).some(
        (p) => !p.draftBlockedReason,
      ),
  );
}
export function reshuffleDraft(state, players, random = Math.random) {
  const choices = reshuffleChoices(state, players);
  if (!choices.length) return state;
  const index = state.roster.length;
  const draftTeams = [...state.draftTeams];
  draftTeams[index] = shuffle(choices, random)[0].team;
  return {
    ...state,
    draftTeams,
    reshufflesLeft: state.reshufflesLeft - 1,
    draftTeamHistory: [
      ...(state.draftTeamHistory ?? []),
      state.draftTeams[index],
    ],
  };
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
  const choice = draftOptions(
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
    draftTeamHistory: [],
  };
}
export const DEFAULT_POSITIONS = [
  { x: 250, y: 365 },
  { x: 80, y: 285 },
  { x: 420, y: 285 },
  { x: 145, y: 145 },
  { x: 355, y: 145 },
];
// Map spots to basketball positions, never to the order the cards were drafted.
export function formation(roster) {
  const spots = {
    PG: { x: 250, y: 365 },
    SG: { x: 80, y: 285 },
    SF: { x: 420, y: 285 },
    PF: { x: 205, y: 165 },
    C: { x: 295, y: 110 },
  };
  return roster.map((p, i) => ({
    ...(spots[p.position] ?? DEFAULT_POSITIONS[i]),
  }));
}
// Movement and passing are inferred from the drawing, never assigned to timeline slots.
export function normalizePlay(play) {
  const { routeBeats, passBeats, screen, ...drawing } = play;
  return drawing;
}
export function clearAllRoutes(play) {
  return {
    ...normalizePlay(play),
    routes: Array.from({ length: 5 }, () => []),
  };
}
export function resetPlay(play, roster) {
  const starter = roster
    ? Math.max(
        0,
        roster.findIndex((p) => p.position === "PG"),
      )
    : play.starter;
  const passes = starter === play.shooter ? [starter] : [starter, play.shooter];
  return {
    ...clearAllRoutes(play),
    starter,
    positions: roster ? formation(roster) : structuredClone(DEFAULT_POSITIONS),
    passes,
  };
}
export function addPass(play, receiver) {
  return play.passes.length >= 8
    ? play
    : { ...normalizePlay(play), passes: [...play.passes, receiver] };
}
export function screenExample(play) {
  return {
    ...resetPlay(play),
    positions: [
      { x: 250, y: 365 },
      { x: 80, y: 285 },
      { x: 420, y: 285 },
      { x: 175, y: 255 },
      { x: 355, y: 145 },
    ],
    routes: [
      [],
      [
        { x: 130, y: 260 },
        { x: 165, y: 185 },
        { x: 265, y: 105 },
      ],
      [],
      [{ x: 110, y: 260 }],
      [],
    ],
    starter: 0,
    shooter: 1,
    passes: [0, 1],
  };
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
  };
}
export function initialDefenders(play, levelIndex = 0) {
  return play.positions.map((p) => ({
    x: p.x + (250 - p.x) * 0.12,
    y: clamp(p.y - LEVELS[levelIndex].gap, 25, 445),
  }));
}
function routeLength(start, route) {
  return route.reduce(
    (sum, point, i) => sum + distance(i ? route[i - 1] : start, point),
    0,
  );
}
export function planPlay(play, levelIndex = 0) {
  const defenders = initialDefenders(play, levelIndex);
  const lengths = play.routes.map((r, i) => routeLength(play.positions[i], r));
  const endpoints = play.routes.map((r, i) => r.at(-1) ?? play.positions[i]);
  const candidates = [];
  for (let setter = 0; setter < 5; setter++) {
    for (let cutter = 0; cutter < 5; cutter++) {
      if (setter === cutter) continue;
      const route = play.routes[setter];
      let point = endpoints[setter],
        split = route.length - 1;
      let aim = Math.min(
        distance(point, play.positions[cutter]),
        distance(point, defenders[cutter]),
      );
      // A through-route can plant at an intermediate point, then roll. Choose the
      // closest deliberately drawn waypoint; sample-independent segments are below.
      if (aim > 38 && lengths[setter] > 70) {
        const path = [play.positions[setter], ...route];
        let travelled = 0,
          best = null;
        for (let j = 0; j < path.length - 1; j++) {
          const a = path[j],
            b = path[j + 1],
            len = distance(a, b);
          for (const target of [defenders[cutter], play.positions[cutter]]) {
            const f = len
              ? clamp(
                  ((target.x - a.x) * (b.x - a.x) +
                    (target.y - a.y) * (b.y - a.y)) /
                    (len * len),
                  0,
                  1,
                )
              : 0;
            const spot = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
            const along = travelled + len * f,
              near = distance(spot, target);
            if (
              along > 25 &&
              lengths[setter] - along > 45 &&
              near <= 24 &&
              (!best || near < best.aim)
            )
              best = { point: spot, split: j, aim: near };
          }
          travelled += len;
        }
        if (best) ({ point, split, aim } = best);
      }
      const path = [play.positions[cutter], ...play.routes[cutter]];
      const nearCut = path
        .slice(1)
        .some((p, j) => segmentDistance(point, path[j], p) < 27);
      const aimed = lengths[setter] > 8 && aim <= 38;
      const through =
        lengths[cutter] > 45 &&
        nearCut &&
        distance(point, play.positions[cutter]) > 28 &&
        distance(point, endpoints[cutter]) > 42;
      if (aimed || through) {
        const rolling =
          distance(point, endpoints[setter]) > 45 && split < route.length;
        const approach = rolling ? [...route.slice(0, split), point] : route;
        const roll = rolling ? route.slice(split) : [];
        candidates.push({
          screener: setter,
          cutter,
          point: { ...point },
          aimed,
          score: !lengths[setter] && through ? -1 : aimed ? aim : 60,
          approach,
          roll,
        });
      }
    }
  }
  candidates.sort(
    (a, b) =>
      a.score - b.score || a.screener - b.screener || a.cutter - b.cutter,
  );
  const screens = [];
  const reaches = (from, to, seen = new Set()) => {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return screens
      .filter((s) => s.screener === from)
      .some((s) => reaches(s.cutter, to, seen));
  };
  for (const c of candidates)
    if (
      !screens.some((s) => s.screener === c.screener) &&
      !reaches(c.cutter, c.screener)
    )
      screens.push(c);
  const movements = Array(5);
  const duration = (length) =>
    length > 0 ? clamp(length / 620, 0.16, 0.7) : 0;
  function movement(index) {
    if (movements[index]) return movements[index];
    const setup = screens.filter(
      (s) => s.cutter === index && lengths[index] > 0,
    );
    const start = Math.max(
      0,
      ...setup.map((s) => movement(s.screener).ready + 0.025),
    );
    const screen = screens.find((s) => s.screener === index);
    const approach = screen?.approach ?? play.routes[index];
    const ready =
      start + duration(routeLength(play.positions[index], approach));
    const roll = screen?.roll ?? [];
    const release = ready + (roll.length ? 0.19 : 0);
    return (movements[index] = {
      start,
      ready,
      release,
      end:
        release +
        duration(routeLength(screen?.point ?? endpoints[index], roll)),
      length: lengths[index],
      approach,
      roll,
      point: screen?.point ?? endpoints[index],
    });
  }
  for (let i = 0; i < 5; i++) movement(i);
  const scale = 0.94 / Math.max(0.94, ...movements.map((m) => m.end));
  for (const m of movements)
    for (const k of ["start", "ready", "release", "end"])
      m[k] = Math.min(0.94, m[k] * scale);
  return {
    screens: screens.map((s) => ({
      ...s,
      ready: movements[s.screener].ready,
      release: s.roll.length ? movements[s.screener].release : 1,
    })),
    movements,
  };
}
export function playerPoint(play, index, t, plan = planPlay(play)) {
  const m = plan.movements[index];
  if (t <= m.ready || !m.roll.length)
    return routePoint(
      play.positions[index],
      m.approach,
      m.ready > m.start ? (t - m.start) / (m.ready - m.start) : 1,
    );
  if (t <= m.release) return { ...m.point };
  return routePoint(m.point, m.roll, (t - m.release) / (m.end - m.release));
}
function openingScore(play, frames, plan, receiver, time) {
  const frame = frames[Math.round(time * 48)],
    spot = frame.offense[receiver];
  const space = Math.min(...frame.defenders.map((d) => distance(d, spot)));
  const move = plan.movements[receiver];
  const progress =
    move.end > move.start
      ? clamp((time - move.start) / (move.end - move.start), 0, 1)
      : 1;
  const rim = Math.max(0, 300 - distance(spot, RIM));
  return Math.min(space, 95) * 0.9 + progress * 18 + rim * 0.07 - time * 2;
}
export function schedulePasses(
  play,
  frames = null,
  plan = planPlay(play),
  order = null,
) {
  frames ??= Array.from({ length: 49 }, (_, step) => ({
    offense: play.positions.map((_, i) =>
      playerPoint(play, i, step / 48, plan),
    ),
    defenders: initialDefenders(play),
  }));
  if (!order && play.mode !== "passes")
    return automaticPassEvents(play, frames, plan);
  const passes = order ?? play.passes;
  const events = [];
  let earliest = 0.045;
  for (let i = 1; i < passes.length; i++) {
    const from = passes[i - 1],
      to = passes[i];
    const latest =
      play.mode !== "passes" && i < passes.length - 1
        ? 0.45
        : 0.94 - (passes.length - 1 - i) * 0.115;
    let best = null;
    for (
      let step = Math.ceil((earliest + 0.035) * 48);
      step <= Math.floor(latest * 48);
      step++
    ) {
      const arrive = step / 48;
      const catchFrame = frames[step],
        destination = catchFrame.offense[to];
      const source =
        frames[Math.max(0, Math.round((arrive - 0.06) * 48))].offense[from];
      const flight = clamp(distance(source, destination) / 2800, 0.035, 0.08);
      const t = arrive - flight;
      if (t < earliest) continue;
      const departFrame = frames[Math.round(t * 48)],
        origin = departFrame.offense[from];
      const lane = Math.min(
        ...departFrame.defenders.map((d) =>
          segmentDistance(d, origin, destination),
        ),
      );
      const score =
        openingScore(play, frames, plan, to, arrive) +
        Math.min(lane, 45) * 0.7 -
        distance(origin, destination) * 0.035;
      if (!best || score > best.score) best = { from, to, t, arrive, score };
    }
    // Seven passes always have space reserved, even for stationary or long-route receivers.
    best ??= {
      from,
      to,
      t: earliest,
      arrive: Math.min(latest, earliest + 0.035),
    };
    const { score, ...event } = best;
    events.push(event);
    earliest = event.arrive + 0.025;
  }
  return events;
}
// Read the drawing: use a relay or give-and-go when it gives a useful, short
// connection. Avoid the planted screener and keep the chosen final shooter.
function automaticPassEvents(play, frames, plan) {
  const direct =
    play.starter === play.shooter
      ? [play.starter]
      : [play.starter, play.shooter];
  const candidates = [direct];
  const cutter = play.routes[play.shooter].length > 0;
  if (play.starter !== play.shooter || cutter) {
    for (let helper = 0; helper < 5; helper++) {
      if (
        helper === play.starter ||
        helper === play.shooter ||
        plan.screens.some((s) => s.screener === helper)
      )
        continue;
      candidates.push([play.starter, helper, play.shooter]);
    }
  }
  let best = null;
  for (const order of candidates) {
    const events = schedulePasses(play, frames, plan, order);
    const time = events.length ? Math.min(1, events.at(-1).arrive + 0.04) : 0.9;
    let score = openingScore(play, frames, plan, play.shooter, time);
    let longest = 0,
      total = 0,
      valid = true;
    for (const e of events) {
      const frame = frames[Math.round(e.t * 48)],
        a = frame.offense[e.from],
        b = frames[Math.round(e.arrive * 48)].offense[e.to];
      const length = distance(a, b);
      const lane = Math.min(
        ...frame.defenders.map((d) => segmentDistance(d, a, b)),
      );
      longest = Math.max(longest, length);
      total += length;
      score -= Math.max(0, 24 - lane) * 0.9 + 3;
      if (events.length > 1 && (length < 35 || lane < 7)) valid = false;
    }
    score -= longest * 0.075 + total * 0.025;
    // A moving handler can give the ball up before cutting and receive it back.
    if (play.starter === play.shooter && cutter && events.length === 2)
      score += 20;
    if (valid && (!best || score > best.score)) best = { score, events };
  }
  return best?.events ?? [];
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
  const plan = planPlay(play, levelIndex);
  let defenders = initialDefenders(play, levelIndex);
  const frames = [];
  const contacts = [];
  const contactKeys = new Set();
  let turnover = null;
  let passRisk = 0;
  for (let step = 0; step <= 48; step++) {
    const t = step / 48;
    const offense = play.positions.map((_, i) => playerPoint(play, i, t, plan));
    const taken = new Set();
    const activeScreens = plan.screens.filter(
      (s) =>
        t >= s.ready &&
        t <= s.release &&
        t <= plan.movements[s.cutter].end + 0.12,
    );
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
      for (const screen of activeScreens) {
        if (
          screen.cutter !== target ||
          !play.routes[target].length ||
          t <= plan.movements[target].start
        )
          continue;
        const spot = offense[screen.screener];
        if (distance(d, spot) < 58 && segmentDistance(spot, d, goal) < 28) {
          speed *= levelIndex >= 2 ? 0.42 : 0.2;
          blocked.push(i);
          const key = `${screen.screener}-${target}-${i}`;
          if (!contactKeys.has(key)) {
            contactKeys.add(key);
            contacts.push({
              screener: screen.screener,
              cutter: target,
              defender: i,
              t,
            });
          }
          break;
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
      activeScreens,
      blocked,
    });
  }
  let passEvents = schedulePasses(play, frames, plan);
  const passes = [play.starter, ...passEvents.map((event) => event.to)];
  let shotT = passEvents.length
    ? Math.min(1, passEvents.at(-1).arrive + 0.04)
    : 0.15;
  if (!passEvents.length) {
    let best = -Infinity;
    for (let step = 7; step <= 46; step++) {
      const score = openingScore(play, frames, plan, play.shooter, step / 48);
      if (score > best) {
        best = score;
        shotT = step / 48;
      }
    }
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
      passEvents = passEvents.slice(0, passEvents.indexOf(event) + 1);
      break;
    }
  }
  const possessionEnd = turnover ? (turnover.t + turnover.arrive) / 2 : shotT;
  const screenEvents = contacts.filter((c) => c.t <= possessionEnd);
  const screenedDefenders = new Set(screenEvents.map((c) => c.defender));
  const final = frames[Math.round(shotT * 48)];
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
  const screenBonus = screenEvents.some((s) => s.cutter === play.shooter)
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
  if (screenEvents.length)
    explanation +=
      " A screen slowed a chasing defender." +
      (screenBonus > 0 ? " The cutter found extra room for the shot." : "");
  return {
    plan,
    shotT,
    screenEvents,
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
    reshufflesLeft: DRAFT_RESHUFFLES,
    draftTeamHistory: [],
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
    s.reshufflesLeft ??= DRAFT_RESHUFFLES;
    s.draftTeamHistory ??= [];
    if (
      !Number.isInteger(s.reshufflesLeft) ||
      s.reshufflesLeft < 0 ||
      s.reshufflesLeft > DRAFT_RESHUFFLES ||
      !Array.isArray(s.draftTeamHistory) ||
      s.draftTeamHistory.length > DRAFT_RESHUFFLES - s.reshufflesLeft ||
      s.draftTeamHistory.some((team) => typeof team !== "string")
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
