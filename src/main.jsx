import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  Undo2,
  Play,
  Move,
  Pencil,
  MousePointer2,
  X,
  Check,
  Trophy,
  Info,
  ChevronRight,
  CircleHelp,
  Trash2,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  VolumeX,
  Shield,
  Target,
  Flag,
  Download,
  Sparkles,
} from "lucide-react";
import players from "./players.json";
import {
  LEVELS,
  DEFAULT_POSITIONS,
  RIM,
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
  distance,
  clamp,
} from "./engine.js";
import "./style.css";
const KEY = "chalk-dynasty-v2";
const playerCount = new Set(players.map((p) => p.id)).size;
const poolCount = new Set(players.map((p) => `${p.era}-${p.team}`)).size;
const colors = ["#f39b70", "#edcf88", "#9fc3df", "#c1bbdf", "#a9c7a3"];
const legendTeam = superteam(players);
const initials = (n) =>
  n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
const last = (n) => n.split(" ").at(-1);
const season = (p) => `${p.season - 1}–${String(p.season).slice(-2)}`;
const num = (n) => (n === null ? "—" : n.toFixed(1));
const ico = (Icon, size = 17) => (
  <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
);
const pct = (n) => `${Math.round(n * 100)}%`;
function App() {
  const [game, setGame] = useState(() => {
    try {
      return (
        restoreGame(localStorage.getItem(KEY), players) || freshGame(players)
      );
    } catch {
      return freshGame(players);
    }
  });
  const [modal, setModal] = useState(null),
    [confirmReset, setConfirmReset] = useState(false),
    [selected, setSelected] = useState(0),
    [tool, setTool] = useState("route"),
    [history, setHistory] = useState([]),
    [outcome, setOutcome] = useState(null),
    [animation, setAnimation] = useState(null),
    [notice, setNotice] = useState(""),
    [dataSearch, setDataSearch] = useState("");
  const roster = game.roster.map((id) => players.find((p) => p.key === id));
  const level = LEVELS[game.level];
  const play = game.play;
  const offers = useMemo(
    () =>
      draftOffers(
        players,
        game.eras[roster.length],
        game.roster,
        game.draftTeams[roster.length],
      ),
    [game.eras, game.roster, game.draftTeams],
  );
  const status = roundStatus(game.results);
  const running = animation !== null;
  const error = roster.length === 5 ? validatePlay(play) : null;
  const preview = useMemo(
    () =>
      roster.length === 5 && !error
        ? simulate(roster, play, game.level, () => 0.9999, legendTeam)
        : null,
    [game.roster, play, game.level, error],
  );
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(game));
    } catch {
      setNotice(
        "Your browser could not save progress. You can still play in this tab.",
      );
    }
  }, [game]);
  useEffect(() => {
    if (!modal && !confirmReset) return;
    const previous = document.activeElement;
    const el = document.querySelector('[role="dialog"]');
    el?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setConfirmReset(false);
      }
      if (e.key === "Tab" && el) {
        const list = [
          ...el.querySelectorAll("button,a[href],input,select"),
        ].filter((e) => !e.disabled);
        const a = list[0],
          b = list.at(-1);
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [modal, confirmReset]);
  function edit(next, continuation = false) {
    if (running) return;
    if (!continuation)
      setHistory((h) => [...h.slice(-29), structuredClone(play)]);
    setGame((g) => ({
      ...g,
      play: typeof next === "function" ? next(g.play) : next,
    }));
    setOutcome(null);
  }
  function undo() {
    if (!history.length || running) return;
    setGame((g) => ({ ...g, play: history.at(-1) }));
    setHistory((h) => h.slice(0, -1));
    setOutcome(null);
  }
  function draft(p) {
    if (roster.some((r) => r.id === p.id) || roster.length >= 5) return;
    setGame((g) => {
      const ids = [...g.roster, p.key];
      return { ...g, roster: ids, stage: ids.length === 5 ? "game" : "draft" };
    });
  }
  function reset() {
    setGame(freshGame(players));
    setConfirmReset(false);
    setHistory([]);
    setOutcome(null);
    setAnimation(null);
    setSelected(0);
  }
  function run() {
    if (error || running || status !== "playing") return;
    const result = simulate(roster, play, game.level, Math.random, legendTeam);
    setOutcome(null);
    setAnimation({ result, progress: 0 });
  }
  const animationRef = useRef(null);
  useEffect(() => {
    if (!animation || animation.progress !== 0) return;
    const result = animation.result;
    const stop = result.turnover ? result.turnover.t * 0.74 + 0.12 : 1;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const duration = (reduced ? 850 : 3400) * stop;
    let start;
    function tick(now) {
      if (!start) start = now;
      const f = Math.min(1, (now - start) / duration);
      setAnimation({ result, progress: f * stop });
      if (f < 1) animationRef.current = requestAnimationFrame(tick);
      else {
        setAnimation(null);
        setOutcome(result);
        setGame((g) => recordResult(g, result.made));
      }
    }
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animation?.result]);
  function retry() {
    setGame((g) => ({ ...g, results: [], round: g.round + 1 }));
    setOutcome(null);
  }
  function next() {
    setGame((g) => advance(g));
    setOutcome(null);
    setHistory([]);
  }
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label="Chalk and Dynasty home"
        >
          <span className="brand-ball">◈</span>
          <span>
            CHALK <i>&</i> DYNASTY
          </span>
        </a>
        <span className="header-note">
          A GAME OF BASKETBALL & POSSIBILITIES
        </span>
        <nav>
          <button className="text-button" onClick={() => setModal("help")}>
            {ico(CircleHelp)}
            <span>How to play</span>
          </button>
          <button
            className="icon-button"
            aria-label="Statistics and game methodology"
            onClick={() => setModal("data")}
          >
            {ico(Info)}
          </button>
        </nav>
      </header>
      <main>
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {game.stage === "draft" ? (
          <>
            <section className="draft-hero">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" /> THE ALL-ERA BASKETBALL CHALLENGE
                </div>
                <h1>
                  Legends on paper.
                  <br />
                  <em>Dynasties on the court.</em>
                </h1>
                <p>
                  Draft five icons. Draw your play. Take down five defenses.
                  <br className="desktop-br" /> Can your basketball brain beat
                  an all-time superteam?
                </p>
                <div className="hero-steps">
                  <span>
                    <b>01</b> Draft your five
                  </span>
                  <ChevronRight size={15} />
                  <span>
                    <b>02</b> Draw it up
                  </span>
                  <ChevronRight size={15} />
                  <span>
                    <b>03</b> Chase greatness
                  </span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <svg viewBox="0 0 240 220">
                  <path d="M15 200V20h210v180M78 20v78h84V20M78 98a42 42 0 0 0 84 0M39 20v40a81 81 0 0 0 162 0V20" />
                  <circle cx="120" cy="44" r="9" />
                  <path
                    className="art-route"
                    d="M50 170 Q55 110 106 85M175 165q20-30 10-68"
                  />
                  <circle className="art-player" cx="50" cy="170" r="13" />
                  <text x="50" y="175">
                    1
                  </text>
                  <circle className="art-player" cx="175" cy="165" r="13" />
                  <text x="175" y="170">
                    2
                  </text>
                  <path
                    className="art-x"
                    d="m96 67 16 16m0-16L96 83m60 20 16 16m0-16-16 16"
                  />
                  <path className="art-dash" d="m66 170 90-5" />
                </svg>
                <span>
                  GOOD TEAMS HAVE TALENT.
                  <br />
                  GREAT TEAMS HAVE A PLAN.
                </span>
              </div>
            </section>
            <section className="draft-section">
              <div className="section-top">
                <div>
                  <div className="eyebrow muted">THE DRAFT ROOM</div>
                  <h2>Your next legend is waiting.</h2>
                </div>
                <button
                  className="text-button muted"
                  onClick={() => setConfirmReset(true)}
                >
                  {ico(RotateCcw)} Restart draft
                </button>
              </div>
              <div className="draft-meta">
                <div className="era-label">
                  <span className="shuffle-mark">↝</span>
                  <span>
                    <small>YOUR TEAM & ERA</small>
                    <strong>
                      {game.eras[roster.length]}s{" "}
                      <span>
                        {
                          draftPools(players, game.eras[roster.length]).find(
                            (p) => p.team === game.draftTeams[roster.length],
                          )?.teamName
                        }
                      </span>
                    </strong>
                  </span>
                </div>
                <div className="draft-count">
                  <span>
                    PICK <b>{roster.length + 1}</b> OF 5
                  </span>
                  <div className="pick-bars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <i
                        key={i}
                        className={i <= roster.length ? "filled" : ""}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="draft-hint">
                A random team and decade. Five top available players, balanced
                by position. Choose your fit.
              </p>
              <div className="player-cards">
                {offers.map((p, i) => (
                  <PlayerCard
                    key={p.key}
                    p={p}
                    index={i}
                    onDraft={() => draft(p)}
                  />
                ))}
              </div>
              <div className="draft-roster">
                <div className="roster-label">
                  <span className="eyebrow muted">YOUR STARTING FIVE</span>
                  <span>{roster.length}/5 drafted</span>
                </div>
                <div className="roster-slots">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      className={`roster-slot ${roster[i] ? "occupied" : ""}`}
                      key={i}
                    >
                      <span className="slot-number">0{i + 1}</span>
                      {roster[i] ? (
                        <>
                          <span>
                            <b>{roster[i].name}</b>
                            <small>
                              {roster[i].position} · {season(roster[i])}
                            </small>
                          </span>
                          {ico(Check, 15)}
                        </>
                      ) : (
                        <span className="empty-label">Your next legend</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p className="source-note">
                {playerCount.toLocaleString()} players · {poolCount} team–decade
                pools · Real single-season stats{" "}
                <button onClick={() => setModal("data")}>
                  Data & credits {ico(ArrowUpRight, 12)}
                </button>
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="game-heading">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" />{" "}
                  {game.victory
                    ? "DYNASTY COMPLETE"
                    : "THE FIVE-DEFENSE GAUNTLET"}
                </div>
                <h1>
                  {game.victory
                    ? "You drew up a dynasty."
                    : "Talent is the start. "}
                  <em>{game.victory ? "" : "Now draw the difference."}</em>
                </h1>
              </div>
              <button
                className="text-button muted"
                disabled={running}
                onClick={() => setConfirmReset(true)}
              >
                {ico(RotateCcw)} New draft
              </button>
            </section>
            <ol className="level-track" aria-label="Defensive level progress">
              {LEVELS.map((l, i) => (
                <li
                  key={l.name}
                  className={`${i === game.level ? "active" : ""} ${i < game.level || game.victory ? "complete" : ""}`}
                >
                  <span className="level-index">
                    {i < game.level || game.victory
                      ? ico(Check, 14)
                      : `0${i + 1}`}
                  </span>
                  <div>
                    <b>{l.name}</b>
                    <small>{l.team}</small>
                  </div>
                  {i === 4 && ico(Trophy, 19)}
                </li>
              ))}
            </ol>
            {game.victory ? (
              <section className="victory">
                <div className="victory-mark">{ico(Trophy, 60)}</div>
                <div className="eyebrow">FIVE DEFENSES. ONE DYNASTY.</div>
                <h2>
                  The chalkboard
                  <br />
                  belongs to you.
                </h2>
                <p>
                  You took your five through the gauntlet and beat the
                  Statistical Five.
                  <br />
                  {game.totalAttempts} possessions. A whole lot of
                  possibilities.
                </p>
                <div className="victory-roster">
                  {roster.map((p, i) => (
                    <span key={p.id} style={{ "--player": colors[i] }}>
                      <b>{initials(p.name)}</b>
                      {p.name}
                    </span>
                  ))}
                </div>
                <button className="primary" onClick={reset}>
                  Build another dynasty {ico(ArrowRight)}
                </button>
                <button
                  className="text-button"
                  onClick={() => setModal("data")}
                >
                  Meet the superteam you beat {ico(ArrowUpRight)}
                </button>
              </section>
            ) : (
              <>
                <div className="game-grid">
                  <section className="playboard">
                    <div className="board-header">
                      <div>
                        <span className="eyebrow muted">YOUR CHALKBOARD</span>
                        <h2>Make your move.</h2>
                      </div>
                      <div className="court-legend">
                        <span>
                          <i /> Offense
                        </span>
                        <span>
                          <b>×</b> Defense
                        </span>
                      </div>
                    </div>
                    <div
                      className="court-toolbar"
                      role="group"
                      aria-label="Court drawing tools"
                    >
                      <div className="tool-group">
                        {[
                          ["move", Move, "Position"],
                          ["route", Pencil, "Draw route"],
                          ...(play.mode === "passes"
                            ? [["pass", MousePointer2, "Add pass"]]
                            : []),
                        ].map(([id, Icon, label]) => (
                          <button
                            key={id}
                            aria-pressed={tool === id}
                            className={tool === id ? "active" : ""}
                            disabled={running}
                            onClick={() => setTool(id)}
                          >
                            {ico(Icon, 15)}
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="tool-actions">
                        <button
                          className="icon-button"
                          disabled={running || !history.length}
                          onClick={undo}
                          aria-label="Undo last edit"
                          title="Undo last edit"
                        >
                          {ico(Undo2, 16)}
                        </button>
                        <button
                          className="icon-button"
                          disabled={running}
                          onClick={() =>
                            edit((p) => ({
                              ...p,
                              routes: p.routes.map((r, i) =>
                                i === selected ? [] : r,
                              ),
                            }))
                          }
                          aria-label="Clear selected player route"
                          title="Clear selected player route"
                        >
                          {ico(Trash2, 16)}
                        </button>
                        <button
                          className="icon-button"
                          disabled={running}
                          onClick={() => edit(defaultPlay())}
                          aria-label="Reset play to default"
                          title="Reset play to default"
                        >
                          {ico(RotateCcw, 16)}
                        </button>
                      </div>
                    </div>
                    <Court
                      play={play}
                      roster={roster}
                      selected={selected}
                      setSelected={setSelected}
                      tool={tool}
                      edit={edit}
                      running={running}
                      animation={animation}
                      outcome={outcome}
                      level={level}
                    />
                    <div className="court-caption">
                      <span>
                        {ico(
                          tool === "move"
                            ? Move
                            : tool === "pass"
                              ? MousePointer2
                              : Pencil,
                          14,
                        )}{" "}
                        {running
                          ? "Possession in motion…"
                          : tool === "move"
                            ? "Drag a numbered player to set their starting position."
                            : tool === "pass"
                              ? "Tap players in order to add receivers. End with your shooter."
                              : "Select a player, then tap points or draw on the court."}
                      </span>
                      <span>HALF COURT · OFFENSE ↑</span>
                    </div>
                    <div
                      className="roster-strip"
                      aria-label="Select an offensive player"
                    >
                      {roster.map((p, i) => (
                        <button
                          key={p.id}
                          disabled={running}
                          aria-pressed={selected === i}
                          className={selected === i ? "selected" : ""}
                          onClick={() => setSelected(i)}
                          style={{ "--player": colors[i] }}
                        >
                          <span className="player-chip">{i + 1}</span>
                          <span>
                            <b>{last(p.name)}</b>
                            <small>
                              {p.position}
                              {play.starter === i ? " · BALL" : ""}
                              {play.shooter === i ? " · SHOT" : ""}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                    <details className="keyboard-controls">
                      <summary>Keyboard controls & player details</summary>
                      <p>
                        Select a player below or focus a court marker. Arrow
                        keys move the selected player in Position mode; in Draw
                        route mode, they add route points. Enter selects a
                        marker or adds it as a receiver in Add pass mode.
                      </p>
                      <div className="nudge">
                        <span>
                          {roster[selected].name} · {season(roster[selected])}
                        </span>
                        {[
                          ["←", -10, 0],
                          ["↑", 0, -10],
                          ["↓", 0, 10],
                          ["→", 10, 0],
                        ].map(([s, x, y]) => (
                          <button
                            disabled={running}
                            key={s}
                            aria-label={`Move selected player ${s}`}
                            onClick={() => {
                              const start =
                                tool === "route"
                                  ? play.routes[selected].at(-1) ||
                                    play.positions[selected]
                                  : play.positions[selected];
                              const pt = {
                                x: clamp(start.x + x, 22, 478),
                                y: clamp(start.y + y, 25, 445),
                              };
                              edit((p) =>
                                tool === "route"
                                  ? {
                                      ...p,
                                      routes: p.routes.map((r, i) =>
                                        i === selected
                                          ? [...r, pt].slice(0, 24)
                                          : r,
                                      ),
                                    }
                                  : {
                                      ...p,
                                      positions: p.positions.map((r, i) =>
                                        i === selected ? pt : r,
                                      ),
                                    },
                              );
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <p>
                        PTS {num(roster[selected].points)} · REB{" "}
                        {num(roster[selected].rebounds)} · AST{" "}
                        {num(roster[selected].assists)} · STL{" "}
                        {num(roster[selected].steals)} · BLK{" "}
                        {num(roster[selected].blocks)} per game. — = unrecorded.
                      </p>
                    </details>
                  </section>
                  <aside className="strategy-panel">
                    <section className="opponent-card">
                      <div className="opponent-title">
                        <span
                          className="opponent-logo"
                          style={{ "--accent": level.color }}
                        >
                          {game.level === 4 ? ico(Trophy, 26) : ico(Shield, 26)}
                        </span>
                        <span>
                          <small>
                            DEFENSE 0{game.level + 1} / 05 ·{" "}
                            {level.name.toUpperCase()}
                          </small>
                          <h2>{level.team}</h2>
                        </span>
                      </div>
                      <p>{level.description}</p>
                      {game.level === 4 && (
                        <>
                          <div className="opponent-names">
                            {legendTeam.map((p) => (
                              <span key={p.id}>
                                <b>{p.slot}</b> {p.name}
                              </span>
                            ))}
                          </div>
                          <button
                            className="inline-link"
                            onClick={() => setModal("data")}
                          >
                            How this five was selected {ico(ArrowUpRight, 12)}
                          </button>
                        </>
                      )}
                      <div className="scoreboard">
                        <div>
                          <b>
                            {game.results.filter(Boolean).length}
                            <small>/ 3</small>
                          </b>
                          <span>BUCKETS TO WIN</span>
                        </div>
                        <div
                          className="possession-dots"
                          aria-label={`${game.results.length} of 5 possessions used`}
                        >
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={
                                game.results[i] === true
                                  ? "made"
                                  : game.results[i] === false
                                    ? "missed"
                                    : ""
                              }
                            >
                              {game.results[i] === true ? (
                                ico(Check, 13)
                              ) : game.results[i] === false ? (
                                <X size={13} />
                              ) : (
                                i + 1
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="round-meta">
                        <span>
                          Round {game.round} · {game.results.length}/5
                          possessions
                        </span>
                        <span>{game.totalAttempts} total played</span>
                      </div>
                    </section>
                    <section className="play-controls">
                      <div className="eyebrow muted">THE PLAYBOOK</div>
                      <h3>You’re the coach.</h3>
                      <div
                        className="mode-toggle"
                        role="group"
                        aria-label="Play mode"
                      >
                        <button
                          disabled={running}
                          aria-pressed={play.mode === "routes"}
                          className={play.mode === "routes" ? "active" : ""}
                          onClick={() => {
                            edit((p) => ({ ...p, mode: "routes" }));
                            if (tool === "pass") setTool("route");
                          }}
                        >
                          Routes
                        </button>
                        <button
                          disabled={running}
                          aria-pressed={play.mode === "passes"}
                          className={play.mode === "passes" ? "active" : ""}
                          onClick={() =>
                            edit((p) => ({ ...p, mode: "passes" }))
                          }
                        >
                          Routes + passes
                        </button>
                      </div>
                      <p className="control-hint">
                        {play.mode === "routes"
                          ? "Draw the movement. We deliver the ball to your shooter automatically."
                          : "Draw the movement and choose each receiver. The last receiver must be your shooter."}
                      </p>
                      <label className="field-label" htmlFor="starter">
                        STARTS WITH THE BALL
                      </label>
                      <select
                        id="starter"
                        disabled={running}
                        value={play.starter}
                        onChange={(e) =>
                          edit((p) => ({
                            ...p,
                            starter: +e.target.value,
                            passes: [+e.target.value],
                          }))
                        }
                      >
                        {roster.map((p, i) => (
                          <option value={i} key={p.id}>
                            {i + 1}. {p.name}
                          </option>
                        ))}
                      </select>
                      <label className="field-label" htmlFor="shooter">
                        TAKES THE SHOT
                      </label>
                      <select
                        id="shooter"
                        disabled={running}
                        value={play.shooter}
                        onChange={(e) =>
                          edit((p) => ({ ...p, shooter: +e.target.value }))
                        }
                      >
                        {roster.map((p, i) => (
                          <option value={i} key={p.id}>
                            {i + 1}. {p.name}
                          </option>
                        ))}
                      </select>
                      {play.mode === "passes" && (
                        <div className="pass-builder">
                          <div className="pass-label">
                            <span className="field-label">PASS ORDER</span>
                            <button
                              disabled={running || play.passes.length <= 1}
                              onClick={() =>
                                edit((p) => ({
                                  ...p,
                                  passes: p.passes.slice(0, -1),
                                }))
                              }
                              className="inline-link"
                            >
                              Undo pass
                            </button>
                          </div>
                          <div
                            className="pass-sequence"
                            aria-label="Ordered pass sequence"
                          >
                            {play.passes.map((n, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && ico(ArrowRight, 13)}
                                <span style={{ "--player": colors[n] }}>
                                  {n + 1}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="pass-receivers">
                            {roster.map((p, i) => (
                              <button
                                key={p.id}
                                disabled={running || play.passes.length >= 8}
                                aria-label={`Pass to ${p.name}`}
                                onClick={() =>
                                  edit((p) => ({
                                    ...p,
                                    passes: [...p.passes, i],
                                  }))
                                }
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                          <small>
                            Tap a number to add a receiver. You can revisit a
                            player after a different receiver.
                          </small>
                        </div>
                      )}
                      {error && (
                        <p className="validation" role="alert">
                          {ico(Info, 15)}
                          {error}
                        </p>
                      )}
                      {preview && (
                        <div className="play-read">
                          <span>
                            {ico(Target, 16)} Estimated look{" "}
                            <small>GAME MODEL</small>
                          </span>
                          <div>
                            <b>{pct(preview.chance)}</b>
                            <span>
                              shot chance · {pct(preview.passRisk)} pass
                              turnover risk
                            </span>
                          </div>
                        </div>
                      )}
                      <button
                        className="primary run-button"
                        onClick={run}
                        disabled={
                          running || Boolean(error) || status !== "playing"
                        }
                      >
                        {ico(Play, 18)}{" "}
                        {running ? "Running your play…" : "Run the play"}{" "}
                        {!running && <span>→</span>}
                      </button>
                      <p className="rule-note">
                        Make 3 shots in up to 5 possessions. Unlimited retries.
                      </p>
                    </section>
                  </aside>
                </div>
                <section
                  className={`result-panel ${outcome ? "has-result" : ""}`}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {running ? (
                    <>
                      <span className="result-icon">{ico(Play, 24)}</span>
                      <div>
                        <h3>Let the play unfold.</h3>
                        <p>
                          Watch your routes, the passing lanes, and the defender
                          closest to your shooter.
                        </p>
                      </div>
                    </>
                  ) : outcome ? (
                    <>
                      <span
                        className={`result-icon ${outcome.made ? "good" : "bad"}`}
                      >
                        {ico(
                          outcome.made ? Check : outcome.turnover ? X : Target,
                          26,
                        )}
                      </span>
                      <div className="result-copy">
                        <span className="eyebrow muted">
                          POSSESSION {game.results.length} ·{" "}
                          {outcome.turnover
                            ? "TURNOVER"
                            : outcome.three
                              ? "THREE-POINT ATTEMPT"
                              : "TWO-POINT ATTEMPT"}
                        </span>
                        <h3>
                          {outcome.made
                            ? "Nothing but net."
                            : outcome.turnover
                              ? "Passing lane picked off."
                              : "Off the mark."}{" "}
                          <span>{roster[outcome.shooter].name}</span>
                        </h3>
                        <p>
                          {outcome.explanation}
                          {!outcome.turnover &&
                            ` The shot had a ${pct(outcome.chance)} game-model chance; even a good look can miss.`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="result-icon">{ico(Pencil, 24)}</span>
                      <div>
                        <h3>Every dynasty starts with a good possession.</h3>
                        <p>
                          The default play is ready to run. Try it, watch what
                          happens, then make it your own.
                        </p>
                      </div>
                    </>
                  )}
                  {status !== "playing" && (
                    <div className="round-outcome">
                      <b>
                        {status === "won"
                          ? "Defense beaten."
                          : "A fresh round awaits."}
                      </b>
                      <span>
                        {status === "won"
                          ? game.level === 4
                            ? "One last step: claim your dynasty."
                            : "Keep your team. Take on the next defense."
                          : "Three misses leave fewer than three possible makes."}
                      </span>
                      <button
                        className="primary"
                        onClick={status === "won" ? next : retry}
                      >
                        {status === "won"
                          ? game.level === 4
                            ? "Claim the dynasty"
                            : "Next defense"
                          : "Retry this defense"}{" "}
                        {ico(ArrowRight, 16)}
                      </button>
                    </div>
                  )}
                </section>
                <div className="coach-note">
                  <span>{ico(Sparkles, 18)} COACH’S NOTE</span>
                  <p>
                    Space your five. Cut toward the basket. Put the ball in your
                    best shooter’s hands. There’s more than one way to win.
                  </p>
                  <button
                    onClick={() => setModal("help")}
                    className="inline-link"
                  >
                    Open the playbook {ico(ArrowUpRight, 13)}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <footer>
        <span>
          CHALK & DYNASTY <i>© {new Date().getFullYear()}</i>
        </span>
        <span>Real legends. Imagined matchups. Your basketball brain.</span>
        <button onClick={() => setModal("data")}>
          Stats, credits & game model {ico(ArrowUpRight, 12)}
        </button>
      </footer>
      {confirmReset && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmReset(false);
          }}
        >
          <section
            className="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Cancel new draft"
              onClick={() => setConfirmReset(false)}
            >
              {ico(X)}
            </button>
            <div className="eyebrow muted">A CLEAN CHALKBOARD</div>
            <h2 id="reset-title">Start a new draft?</h2>
            <p>
              This clears your roster, play, and challenge progress. Your next
              five legends are waiting.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setConfirmReset(false)}
                className="secondary"
              >
                Keep playing
              </button>
              <button onClick={reset} className="primary">
                Start fresh {ico(RotateCcw, 16)}
              </button>
            </div>
          </section>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Close information"
              onClick={() => setModal(null)}
            >
              {ico(X)}
            </button>
            {modal === "help" ? (
              <>
                <div className="eyebrow muted">THE POCKET PLAYBOOK</div>
                <h2 id="modal-title">
                  A little chalk.
                  <br />A lot of possibility.
                </h2>
                <div className="help-steps">
                  <div>
                    <b>01</b>
                    <span>
                      <h3>Draft across time.</h3>
                      <p>
                        Each pick brings a randomly assigned team from a
                        different decade. Choose from its five top available
                        players, balanced by position. Over 1,200 unique players
                        are available across 204 historical team–decade pools.
                        Stats are single-season per-game numbers; positions are
                        a guide, not a restriction.
                      </p>
                    </span>
                  </div>
                  <div>
                    <b>02</b>
                    <span>
                      <h3>Draw something great.</h3>
                      <p>
                        Use <strong>Position</strong> to drag your five. Use{" "}
                        <strong>Draw route</strong>, select a numbered player,
                        then tap waypoints or draw a path. The star marks your
                        shooter; the orange ring marks the starting ball
                        handler. Dashed arrows are passes.
                      </p>
                    </span>
                  </div>
                  <div>
                    <b>03</b>
                    <span>
                      <h3>Choose your level of control.</h3>
                      <p>
                        <strong>Routes:</strong> automatic ball delivery to your
                        shooter. <strong>Routes + passes:</strong> choose a
                        starting ball handler, add numbered receivers in order,
                        and end with your shooter. Passes happen during the
                        routes; the shot happens after the movement finishes. A
                        one-player sequence means no pass.
                      </p>
                    </span>
                  </div>
                  <div>
                    <b>04</b>
                    <span>
                      <h3>Three buckets to move on.</h3>
                      <p>
                        Make 3 shots within 5 possessions to beat each defense.
                        A round ends early once you’ve won, or after 3 misses
                        make the goal unreachable. Revise your play between
                        possessions. Retry a defense as often as you like; keep
                        your drafted team.
                      </p>
                    </span>
                  </div>
                </div>
                <div className="info-box">
                  Good plays improve your chances, but don’t guarantee a make.
                  The probability is a game estimate, not a real NBA prediction.
                  Progress saves automatically in this browser.
                </div>
                <button className="primary" onClick={() => setModal(null)}>
                  Let’s draw it up {ico(ArrowRight)}
                </button>
              </>
            ) : (
              <>
                <div className="eyebrow muted">OPEN THE NOTEBOOK</div>
                <h2 id="modal-title">
                  Real stats.
                  <br />
                  Transparent imagination.
                </h2>
                <h3>The season behind each legend</h3>
                <p>
                  {players.length.toLocaleString()} curated NBA
                  team-player-seasons featuring {playerCount.toLocaleString()}{" "}
                  unique players across {poolCount} team–decade pools from the
                  1960s–2020s (season-ending years 1960–2024). All box-score
                  numbers are regular-season{" "}
                  <strong>per-game averages from the displayed season</strong>,
                  not career averages. — means unavailable. Steals and blocks
                  were not officially recorded before 1973–74; we preserve those
                  missing values.
                </p>
                <p>
                  Factual season records were checked against{" "}
                  <a
                    href="https://github.com/sumitrodatta/bball-reference-datasets"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Sumitro Datta’s public Basketball-Reference datasets
                  </a>{" "}
                  (Player Per Game.csv). Original compilation:{" "}
                  <a
                    href="https://www.basketball-reference.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Basketball-Reference / Sports Reference
                  </a>
                  . Each player below links to their season source. Team names
                  and affiliations come from the same dataset’s Team Abbrev.csv.
                  We bundle only this small selection of factual records; no
                  portraits, team logos, or source code are taken from those
                  sites. No live sports API or account is needed.
                </p>
                <h3>Who makes the draft pool?</h3>
                <p>
                  For every team abbreviation in every decade, eligible seasons
                  require at least 20 games with that team. Combined multi-team
                  totals are excluded. Keep each player’s highest game-score
                  season for that team and decade, then retain up to 12 players,
                  including the top eligible PG, SG, SF, PF and C. For a draft
                  pick, remove players you already chose, offer the best
                  remaining player in each position, and fill any missing
                  position by score. “Best” here means this game’s transparent
                  rating, not an official NBA ranking. Relocations and
                  historical team names remain attached to the teams that
                  actually existed; franchises that did not yet exist are not
                  invented.
                </p>
                <h3>The ratings are ours</h3>
                <p>
                  Rim, range, creation and defense ratings are{" "}
                  <strong>game-specific estimates</strong> on a 0–100 scale. Rim
                  uses field-goal percentage and scoring. Range uses three-point
                  percentage with at least one attempt per game; otherwise it
                  uses a conservative free-throw-based estimate, including for
                  pre-three-point eras. Creation uses assists. Defense uses
                  steals, blocks and rebounds; missing defense stats use a
                  neutral rating of 65. These are simplified mechanics, not
                  historical measurements of talent.
                </p>
                <h3>How the Statistical Five is selected</h3>
                <p>
                  In fixed order PG → SG → SF → PF → C, select the highest-rated
                  unused player eligible for each position. Score ={" "}
                  <strong>
                    32% rim + 22% range + 20% creation + 26% defense
                  </strong>
                  . Ties use player ID alphabetically. This reproducible
                  selection balances five positions; it is not an objective
                  claim about the best real team.
                </p>
                <div className="superteam-list">
                  {legendTeam.map((p) => (
                    <div key={p.id}>
                      <b>{p.slot}</b>
                      <span>
                        {p.name}
                        <small>{season(p)}</small>
                      </span>
                      <strong>{Math.round(ratings(p).strength)}</strong>
                    </div>
                  ))}
                </div>
                <h3>How a possession works</h3>
                <p>
                  Players follow drawn routes at a common tempo. Defenders
                  track, switch or pressure according to the level; the final
                  team’s individual defense estimates also affect pursuit.
                  Passing risk uses distance, nearby passing-lane defenders,
                  passer creation and level. Shot chance uses location, shooter
                  rating, nearest-defender pressure, teammate spacing and the
                  shooter’s movement. Chances are clamped to 12–88%. Each pass
                  and shot then gets a fresh random roll. The displayed shot
                  chance is conditional on the ball reaching the shooter; pass
                  risk is shown separately.
                </p>
                <h3>Source records</h3>
                <label className="data-search">
                  Find a player, team, decade or season
                  <input
                    aria-label="Search source records"
                    value={dataSearch}
                    onChange={(e) => setDataSearch(e.target.value)}
                    placeholder="Try: Jazz, Jordan, 1980…"
                  />
                </label>
                <p className="source-count">
                  Showing up to 80 matching records. The full downloadable file
                  includes all {players.length.toLocaleString()} records.
                </p>
                <div className="stats-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Player / season</th>
                        <th>PTS</th>
                        <th>REB</th>
                        <th>AST</th>
                        <th>STL</th>
                        <th>BLK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players
                        .filter(
                          (p) =>
                            !dataSearch ||
                            `${p.name} ${p.teamName} ${p.era} ${p.season}`
                              .toLowerCase()
                              .includes(dataSearch.toLowerCase()),
                        )
                        .slice(0, 80)
                        .map((p) => (
                          <tr key={p.key}>
                            <td>
                              <a
                                href={p.source}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {p.name}
                              </a>
                              <small>
                                {season(p)} · {p.position} · {p.team}
                              </small>
                            </td>
                            {[
                              "points",
                              "rebounds",
                              "assists",
                              "steals",
                              "blocks",
                            ].map((k) => (
                              <td key={k}>{num(p[k])}</td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="credits">
                  Original game and court artwork. Drafting inspiration: the
                  era-and-franchise team-building concept documented by NBA
                  82-0; no branding, assets, or interface copied. Independent
                  student project; not affiliated with the NBA, its teams, or
                  players.
                </p>
                <a className="secondary download" href="/players.json" download>
                  Download the bundled data {ico(Download, 16)}
                </a>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
function PlayerCard({ p, index, onDraft }) {
  const r = ratings(p);
  return (
    <article className="player-card" style={{ "--card-accent": colors[index] }}>
      <div className="card-top">
        <span>{p.position}</span>
        <span>{season(p)} SEASON</span>
      </div>
      <div className="player-monogram" aria-hidden="true">
        <span>{initials(p.name)}</span>
        <svg viewBox="0 0 160 100">
          <path d="M0 90q80-130 160 0M-10 60q90-130 180 0M80 0v100" />
        </svg>
        <b>{p.era}s</b>
      </div>
      <div className="player-name">
        <h3>{p.name}</h3>
        <span>
          {p.team} · {p.games} games
        </span>
      </div>
      <dl className="card-stats">
        {[
          ["points", "PTS"],
          ["rebounds", "REB"],
          ["assists", "AST"],
          ["steals", "STL"],
          ["blocks", "BLK"],
        ].map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd
              title={
                p[key] === null
                  ? "Not recorded for this season"
                  : `${label} per game`
              }
            >
              {num(p[key])}
            </dd>
          </div>
        ))}
      </dl>
      <div className="card-ability">
        <span>GAME ESTIMATES</span>
        <span>
          RIM <b>{Math.round(r.rim)}</b> <i>·</i> RANGE{" "}
          <b>{Math.round(r.range)}</b>
        </span>
      </div>
      <button
        className="draft-button"
        onClick={onDraft}
        aria-label={`Draft ${p.name}`}
      >
        Draft player {ico(ArrowUpRight, 18)}
      </button>
    </article>
  );
}
function Court({
  play,
  roster,
  selected,
  setSelected,
  tool,
  edit,
  running,
  animation,
  outcome,
  level,
}) {
  const svg = useRef(),
    drag = useRef(null);
  const progress = animation?.progress || 0;
  const result = animation?.result;
  const t = clamp(progress / 0.74, 0, 1);
  const frame = result?.frames[Math.min(48, Math.round(t * 48))];
  const offense = frame?.offense || play.positions;
  const defenders =
    frame?.defenders ||
    play.positions.map((p) => ({
      x: p.x + (250 - p.x) * 0.12,
      y: clamp(p.y - level.gap, 25, 445),
    }));
  function point(e) {
    const r = svg.current.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 500, 22, 478),
      y: clamp(((e.clientY - r.top) / r.height) * 470, 25, 445),
    };
  }
  function append(pt, continuation = false) {
    edit(
      (p) => ({
        ...p,
        routes: p.routes.map((r, i) =>
          i === selected ? [...r, pt].slice(0, 24) : r,
        ),
      }),
      continuation,
    );
  }
  function start(e, i) {
    if (running || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (i !== undefined) {
      setSelected(i);
      if (tool === "pass") {
        edit((p) => ({ ...p, passes: [...p.passes, i].slice(0, 8) }));
        return;
      }
      if (tool === "move") {
        edit((p) => p);
        drag.current = { type: "move", i };
        svg.current.setPointerCapture(e.pointerId);
      }
      return;
    }
    if (tool === "route") {
      append(point(e));
      drag.current = { type: "route", last: point(e) };
      svg.current.setPointerCapture(e.pointerId);
    }
  }
  function move(e) {
    if (!drag.current || running) return;
    const pt = point(e);
    if (drag.current.type === "move") {
      const i = drag.current.i;
      edit(
        (p) => ({
          ...p,
          positions: p.positions.map((v, j) => (j === i ? pt : v)),
        }),
        true,
      );
    } else if (distance(pt, drag.current.last) > 20) {
      append(pt, true);
      drag.current.last = pt;
    }
  }
  let ball = offense[play.starter];
  let ballLabel = "";
  if (result) {
    let holder = play.starter;
    for (const pe of result.passEvents) {
      if (t >= pe.t + 0.08) holder = pe.to;
      else if (t >= pe.t) {
        const f = (t - pe.t) / 0.08;
        ball = {
          x: offense[pe.from].x + (offense[pe.to].x - offense[pe.from].x) * f,
          y: offense[pe.from].y + (offense[pe.to].y - offense[pe.from].y) * f,
        };
        holder = -1;
        break;
      }
    }
    if (holder >= 0) ball = offense[holder];
    if (progress > 0.76 && !result.turnover) {
      const q = clamp((progress - 0.76) / 0.21, 0, 1);
      const target = result.made ? RIM : { x: 277, y: 83 };
      ball = {
        x: result.spot.x + (target.x - result.spot.x) * q,
        y:
          result.spot.y +
          (target.y - result.spot.y) * q -
          Math.sin(q * Math.PI) * 75,
      };
      ballLabel = q === 1 ? (result.made ? "BUCKET." : "NO GOOD.") : "THE SHOT";
    }
    if (result.turnover && t >= result.turnover.t) {
      ball = defenders[result.turnover.by];
      ballLabel = "PICKED OFF";
    }
  }
  const airborne = result && progress > 0.76 && !result.turnover;
  const ballX = ball.x + (airborne ? 0 : 12), ballY = ball.y - (airborne ? 0 : 10);
  const passLine =
    play.mode === "passes"
      ? play.passes
      : play.starter === play.shooter
        ? [play.starter]
        : [play.starter, play.shooter];
  return (
    <div className={`court-shell ${running ? "is-running" : ""}`}>
      <svg
        ref={svg}
        className={`court tool-${tool}`}
        viewBox="0 0 500 470"
        role="img"
        aria-label="Interactive basketball half court. Select a player, then draw routes or drag their starting positions."
        onPointerDown={(e) => start(e)}
        onPointerMove={move}
        onPointerUp={(e) => {
          move(e);
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="wood"
            width="50"
            height="15"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0h50M0 15h50M25 0v15"
              stroke="#c5b18c"
              strokeWidth=".4"
              opacity=".13"
            />
          </pattern>
          <pattern
            id="grain"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".5" fill="#fff" opacity=".045" />
          </pattern>
          <marker
            id="route-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path
              d="M0 0 6 3 0 6"
              fill="none"
              stroke="#f4c18c"
              strokeWidth="1.5"
            />
          </marker>
          <marker
            id="pass-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path
              d="M0 0 6 3 0 6"
              fill="none"
              stroke="#d9e5da"
              strokeWidth="1.5"
            />
          </marker>
        </defs>
        <rect width="500" height="470" fill="#1d3931" />
        <rect width="500" height="470" fill="url(#wood)" />
        <rect width="500" height="470" fill="url(#grain)" />
        <g className="court-lines" pointerEvents="none">
          <path d="M20 20H480V450H20Z" />
          <path d="M176 20V210H324V20" />
          <path d="M176 210a74 74 0 0 0 148 0" />
          <path
            strokeDasharray="6 7"
            opacity=".4"
            d="M176 210a74 74 0 0 1 148 0"
          />
          <path d="M42 20v70a210 210 0 0 0 416 0V20" />
          <path d="M192 450a58 58 0 0 1 116 0" />
          <path d="M222 44h56M250 44v4" />
          <circle cx="250" cy="55" r="8" stroke="#f1a176" strokeWidth="2.8" />
          <path d="M212 55v14a38 38 0 0 0 76 0V55" opacity=".6" />
        </g>
        <g className="court-wordmark" pointerEvents="none">
          <text x="250" y="337">
            DRAW UP
          </text>
          <text x="250" y="362">
            A DYNASTY.
          </text>
          <text x="250" y="418" className="small">
            CHALK & DYNASTY
          </text>
        </g>
        {!running && (
          <g pointerEvents="none">
            {passLine.slice(1).map((n, i) => {
              const a = play.positions[passLine[i]],
                b = play.positions[n];
              return (
                <path
                  key={i}
                  d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                  fill="none"
                  stroke="#d9e5da"
                  opacity=".3"
                  strokeDasharray="5 6"
                  markerEnd="url(#pass-arrow)"
                />
              );
            })}
          </g>
        )}
        <g pointerEvents="none">
          {play.routes.map(
            (route, i) =>
              route.length > 0 && (
                <g key={i} opacity={running ? 0.22 : i === selected ? 1 : 0.35}>
                  <path
                    d={`M${play.positions[i].x} ${play.positions[i].y} ${route.map((p) => `L${p.x} ${p.y}`).join(" ")}`}
                    fill="none"
                    stroke={colors[i]}
                    strokeWidth={i === selected ? 2.5 : 1.5}
                    strokeDasharray="6 5"
                    markerEnd="url(#route-arrow)"
                  />
                  {i === selected &&
                    !running &&
                    route.map((p, j) => (
                      <circle
                        key={j}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill={colors[i]}
                      />
                    ))}
                  <circle
                    cx={route.at(-1).x}
                    cy={route.at(-1).y}
                    r="9"
                    fill="none"
                    stroke={colors[i]}
                    strokeDasharray="3 3"
                  />
                </g>
              ),
          )}
        </g>
        <g pointerEvents="none">
          {defenders.map((p, i) => (
            <g
              key={i}
              transform={`translate(${p.x},${p.y})`}
              className="defender"
            >
              <circle r="14" fill="#304d42" stroke="#9fae9e" opacity=".8" />
              <path d="m-4-4 8 8m0-8-8 8" stroke="#c7cdbc" strokeWidth="2" />
            </g>
          ))}
        </g>
        {offense.map((p, i) => (
          <g
            key={i}
            transform={`translate(${p.x},${p.y})`}
            role="button"
            tabIndex={running ? -1 : 0}
            aria-label={`Player ${i + 1}: ${roster[i].name}${selected === i ? ", selected" : ""}`}
            aria-pressed={selected === i}
            onPointerDown={(e) => start(e, i)}
            onClick={(e) => {
              if (e.detail === 0 && !running) {
                setSelected(i);
                if (tool === "pass")
                  edit((p) => ({ ...p, passes: [...p.passes, i].slice(0, 8) }));
              }
            }}
            onKeyDown={(e) => {
              if (running) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(i);
                if (tool === "pass")
                  edit((p) => ({ ...p, passes: [...p.passes, i].slice(0, 8) }));
              }
              const moves = {
                ArrowUp: [0, -10],
                ArrowDown: [0, 10],
                ArrowLeft: [-10, 0],
                ArrowRight: [10, 0],
              };
              if (moves[e.key]) {
                e.preventDefault();
                setSelected(i);
                const [dx, dy] = moves[e.key],
                  base = tool === "route" ? play.routes[i].at(-1) || p : p;
                const pt = {
                  x: clamp(base.x + dx, 22, 478),
                  y: clamp(base.y + dy, 25, 445),
                };
                edit((s) =>
                  tool === "route"
                    ? {
                        ...s,
                        routes: s.routes.map((r, j) =>
                          j === i ? [...r, pt].slice(0, 24) : r,
                        ),
                      }
                    : {
                        ...s,
                        positions: s.positions.map((r, j) =>
                          j === i ? pt : r,
                        ),
                      },
                );
              }
            }}
            className="offensive-player"
          >
            <circle r="29" fill="transparent" pointerEvents="all" />
            {selected === i && (
              <circle
                r="24"
                fill="none"
                stroke={colors[i]}
                opacity=".55"
                strokeDasharray="3 4"
              />
            )}
            {play.starter === i && (
              <circle r="20" fill="none" stroke="#ee986e" strokeWidth="1.4" />
            )}
            <circle r="16" fill={colors[i]} stroke="#132d26" strokeWidth="2" />
            <text className="player-number" y="5">
              {i + 1}
            </text>
            <text className="player-court-name" y="34">
              {last(roster[i].name)}
            </text>
            {play.shooter === i && (
              <text className="shooter-star" x="21" y="-13">
                ★
              </text>
            )}
          </g>
        ))}
        <g pointerEvents="none">
          <circle
            cx={ballX}
            cy={ballY}
            r="6"
            fill="#f18c50"
            stroke="#2b3428"
            strokeWidth="1.2"
          />
          <path
            d={`M${ballX - 6} ${ballY}h12m-6-6v12`}
            stroke="#6b492e"
            strokeWidth=".8"
          />
          {ballLabel && (
            <g>
              <rect
                x="158"
                y="385"
                width="184"
                height="34"
                rx="4"
                fill="#f2e8d4"
              />
              <text x="250" y="407" className="animation-label">
                {ballLabel}
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
