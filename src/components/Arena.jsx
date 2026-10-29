import React, { useState } from "react";
import {
  Play,
  Move,
  Pencil,
  Undo2,
  RotateCcw,
  Trash2,
  ArrowRight,
  Check,
  Trophy,
  Navigation,
} from "lucide-react";
import { LEVELS, clearAllRoutes, resetPlay } from "../engine.js";
import {
  PLAYS,
  template,
  chooseRole,
  automatic,
  feedback,
} from "../game/playbook.js";
import { COLORS, last, Jersey } from "./Draft.jsx";
import Court from "./Court.jsx";
const COACH = [
  "Tap a jersey, then “Start with ball”. You decide who runs the offense.",
  "Draw from your shooter toward the basket. Or tap Cut to try one.",
  "Press Play. Your team handles the pass and finds the shot.",
];
export default function Arena({ g, onNewDraft, onDetails, onOpponentInfo }) {
  const { game, roster, scene, outcome, tutorial, status, running } = g,
    play = game.play,
    level = LEVELS[game.level];
  const [selected, setSelected] = useState(play.starter),
    [tool, setTool] = useState("route"),
    [activePlay, setActivePlay] = useState(""),
    [tip, setTip] = useState("");
  const locked =
    running || !!outcome || status !== "playing" || tutorial === "invite";
  const selectedPlayer = roster[selected];
  function edit(next, continuation) {
    g.edit(next, continuation);
    setActivePlay("");
    if (tutorial === 1) g.setTutorial(2);
  }
  function role(key) {
    g.edit((p) => chooseRole(p, key, selected));
    if (key === "starter" && tutorial === 0) {
      g.setTutorial(1);
      setSelected(play.shooter);
    }
    setTip(
      key === "starter"
        ? `${last(selectedPlayer.name)} starts with the ball.`
        : `${last(selectedPlayer.name)} takes the shot.`,
    );
  }
  function preset(id) {
    g.edit(template(id, play));
    setActivePlay(id);
    setTip(PLAYS.find((p) => p.id === id).tip);
    setTool("route");
    if (tutorial === 1) g.setTutorial(2);
  }
  function pass(to) {
    const order = play.mode === "passes" ? play.passes : [play.starter],
      from = order.at(-1);
    if (to === from) {
      setTip("Tap a different jersey to draw a pass.");
      return;
    }
    if (order.length >= 8) {
      setTip(
        "Seven passes is enough. Tap Auto passes to start a new connection.",
      );
      return;
    }
    g.edit({ ...play, mode: "passes", passes: [...order, to], shooter: to });
    setSelected(to);
    setTip(
      `${last(roster[from].name)} → ${last(roster[to].name)}. Last receiver takes the shot.`,
    );
  }
  if (game.victory)
    return (
      <main className="victory-screen">
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ "--i": i, "--player": COLORS[i % 5] }} />
          ))}
        </div>
        <Trophy size={76} strokeWidth={1.2} />
        <span className="eyebrow">FIVE TEAMS DOWN. ONE DYNASTY.</span>
        <h1>
          YOU BEAT
          <br />
          <em>THE SUPERTEAM.</em>
        </h1>
        <p>{game.totalAttempts} possessions. Five legends. Your playbook.</p>
        <div className="champions">
          {roster.map((p, i) => (
            <button key={p.key} onClick={() => onDetails(p)}>
              <Jersey color={COLORS[i]} number={i + 1} />
              <b>{last(p.name)}</b>
              <small>{p.position}</small>
            </button>
          ))}
        </div>
        <button className="primary" onClick={onNewDraft}>
          Build another dynasty <ArrowRight />
        </button>
      </main>
    );
  return (
    <main className="arena" data-level={game.level}>
      <ol className="ladder" aria-label="Challenge progress">
        {LEVELS.map((l, i) => (
          <li
            key={l.short}
            className={
              i < game.level ? "complete" : i === game.level ? "current" : ""
            }
            aria-current={i === game.level ? "step" : undefined}
          >
            <span>
              {i < game.level ? (
                <Check size={13} />
              ) : i === 4 ? (
                <Trophy size={13} />
              ) : (
                i + 1
              )}
            </span>
            <b>{i === 4 ? "SUPERTEAM" : l.short}</b>
          </li>
        ))}
      </ol>
      <section className="match-hud" aria-label="Scoreboard">
        <div className="matchup">
          <span className="eyebrow">
            {typeof tutorial === "number"
              ? "WARM-UP"
              : `MATCH ${game.level + 1} / 5`}
          </span>
          <h1>{level.team}</h1>
          {game.level === 4 ? (
            <button className="meet-five" onClick={onOpponentInfo}>
              Meet their five ↗
            </button>
          ) : (
            <p>
              {
                [
                  "Loose zone. Cut behind it.",
                  "They chase. Make a sharp cut.",
                  "They switch. Use the pick and roll.",
                  "Pressure defense. Keep your passes short.",
                  "All-time talent. Make them work together.",
                ][game.level]
              }
            </p>
          )}
        </div>
        <div className="score">
          <div>
            <b>{game.results.filter(Boolean).length}</b>
            <span>
              / 3 <small>BUCKETS</small>
            </span>
          </div>
          <div
            className="possession-pips"
            aria-label={`${game.results.length} of 5 possessions used`}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <i
                key={i}
                className={
                  game.results[i] === true
                    ? "made"
                    : game.results[i] === false
                      ? "missed"
                      : ""
                }
              >
                {game.results[i] === true
                  ? "✓"
                  : game.results[i] === false
                    ? "×"
                    : ""}
              </i>
            ))}
          </div>
        </div>
      </section>
      <div className="play-picker" aria-label="Editable plays">
        <span>TRY A PLAY</span>
        {PLAYS.map((p) => (
          <button
            key={p.id}
            aria-label={`Load ${p.name}`}
            aria-pressed={activePlay === p.id}
            disabled={locked}
            onClick={() => preset(p.id)}
          >
            {p.short}
          </button>
        ))}
      </div>
      <section className="court-stage">
        <aside className="arena-aside left-aside" aria-label="Your lineup">
          <span className="eyebrow">YOUR FIVE</span>
          {roster.map((p, i) => (
            <button
              key={p.key}
              disabled={locked}
              onClick={() => setSelected(i)}
              className={selected === i ? "selected" : ""}
              aria-label={`Select ${p.name}`}
            >
              <b style={{ background: COLORS[i] }}>{i + 1}</b>
              <span>
                {last(p.name)}
                <small>
                  {p.position} {play.starter === i ? "· BALL" : ""}{" "}
                  {play.shooter === i ? "· SHOT" : ""}
                </small>
              </span>
            </button>
          ))}
          <button
            className="quiet lineup-info"
            onClick={() => onDetails(selectedPlayer)}
          >
            Season stats ↗
          </button>
        </aside>
        <div className="court-center">
          <div className="court-toolbar" role="group" aria-label="Court tools">
            <div className="tool-group">
              {[
                ["route", Pencil, "Draw"],
                ["move", Move, "Move"],
                ["pass", Navigation, "Pass"],
              ].map(([key, Icon, name]) => (
                <button
                  key={key}
                  disabled={locked}
                  aria-label={
                    key === "route"
                      ? "Draw route"
                      : key === "move"
                        ? "Move players"
                        : "Draw pass"
                  }
                  aria-pressed={tool === key}
                  onClick={() => {
                    setTool(key);
                    setTip(
                      key === "route"
                        ? "Drag from a jersey, or tap points to draw a route."
                        : key === "move"
                          ? "Drag a jersey to change its starting spot."
                          : `Tap a receiver. The ball starts with ${last(roster[play.starter].name)}.`,
                    );
                  }}
                >
                  <Icon size={15} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <div className="tool-group">
              <button
                disabled={locked || !g.history.length}
                aria-label="Undo last edit"
                title="Undo last edit"
                onClick={g.undo}
              >
                <Undo2 size={16} />
              </button>
              <button
                disabled={locked}
                aria-label="Clear all routes"
                title="Clear routes, keep positions"
                onClick={() => {
                  g.edit(clearAllRoutes(play));
                  setTip("Routes cleared. Your starting positions are kept.");
                  setActivePlay("");
                }}
              >
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
              <button
                disabled={locked}
                aria-label="Full reset"
                title="Restore positions and clear routes"
                onClick={() => {
                  g.edit(resetPlay(play, roster));
                  setTip(
                    "Bigs inside. Wings outside. Point guard has the ball.",
                  );
                  setActivePlay("");
                }}
              >
                <RotateCcw size={15} />
                <span>Reset</span>
              </button>
            </div>
          </div>
          <div className="court-space">
            <Court
              play={play}
              roster={roster}
              selected={selected}
              onSelect={setSelected}
              tool={tool}
              onEdit={edit}
              locked={locked}
              scene={scene}
              level={game.level}
              onPass={pass}
            />
            {tutorial === "invite" && (
              <div className="on-court-overlay">
                <div className="warmup-card">
                  <span className="eyebrow">YOUR FIVE ARE READY</span>
                  <h2>
                    LET’S GET
                    <br />A BUCKET.
                  </h2>
                  <p>Choose a player. Draw a cut. Watch it happen.</p>
                  <button className="primary" onClick={() => g.setTutorial(0)}>
                    30-second warm-up <ArrowRight size={17} />
                  </button>
                  <button className="quiet" onClick={g.finishTutorial}>
                    Skip · I’m ready to play
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <aside className="arena-aside right-aside">
          <span className="eyebrow">THE GAME PLAN</span>
          <div
            className="opponent-symbol"
            style={{ "--opponent": level.color }}
          >
            {game.level === 4 ? (
              <Trophy size={48} />
            ) : (
              <span>0{game.level + 1}</span>
            )}
          </div>
          <h2>{level.subtitle}</h2>
          <p>{level.description}</p>
          <div className="arena-legend">
            <span>
              <i style={{ background: COLORS[0] }} /> Your legends
            </span>
            <span>
              <i className="defense-dot" /> Their defense
            </span>
            <span>★ Takes the shot</span>
          </div>
          <p className="round-tip">
            Three buckets in five tries.
            <br />
            Unlimited rematches.
          </p>
        </aside>
      </section>
      <div className="interaction-dock">
        {!outcome && status === "playing" && (
          <div className="player-actions" aria-label="Selected player actions">
            <button
              className="selected-name"
              disabled={running}
              onClick={() => onDetails(selectedPlayer)}
            >
              <b style={{ background: COLORS[selected] }}>{selected + 1}</b>
              <span>
                {last(selectedPlayer.name)}
                <small>{selectedPlayer.position} · stats ↗</small>
              </span>
            </button>
            <button
              disabled={locked}
              aria-pressed={play.starter === selected}
              onClick={() => role("starter")}
              aria-label="Start with ball"
            >
              <span className="tiny-ball">●</span>
              <span>
                {play.starter === selected ? "Has ball" : "Start with ball"}
              </span>
            </button>
            <button
              disabled={locked}
              aria-pressed={play.shooter === selected}
              onClick={() => role("shooter")}
              aria-label="Take the shot"
            >
              <span>★</span>
              <span>
                {play.shooter === selected ? "Shooter" : "Take the shot"}
              </span>
            </button>
          </div>
        )}
        <div className="action-dock">
          <div className="live-cue" aria-live="polite">
            {outcome ? (
              <>
                <strong className={outcome.made ? "positive" : ""}>
                  {outcome.practice
                    ? "Warm-up complete"
                    : status === "won"
                      ? "MATCH WON"
                      : status === "lost"
                        ? "RUN IT BACK"
                        : outcome.turnover
                          ? "PICKED OFF"
                          : outcome.made
                            ? "BUCKET!"
                            : "NEXT SHOT."}
                </strong>
                <span>
                  {outcome.practice
                    ? "You’ve got it. Your challenge starts now."
                    : feedback(outcome)}
                </span>
              </>
            ) : status !== "playing" ? (
              <>
                <strong>{status === "won" ? "MATCH WON" : "REMATCH?"}</strong>
                <span>
                  {status === "won"
                    ? "One step closer to the dynasty."
                    : "Keep your five. Try a different cut."}
                </span>
              </>
            ) : running ? (
              <>
                <strong>PLAY IN MOTION</strong>
                <span>Watch the cut. Follow the ball.</span>
              </>
            ) : typeof tutorial === "number" ? (
              <>
                <strong>COACH · {tutorial + 1} / 3</strong>
                <span>{COACH[tutorial]}</span>
              </>
            ) : (
              <>
                <strong>
                  {g.error
                    ? "FIX YOUR DRAWING"
                    : tip || "Draw your idea. Make it happen."}
                </strong>
                <span>
                  {g.error ||
                    (play.mode === "passes"
                      ? "Your pass arrows · timing is automatic."
                      : "Automatic passes · you choose the ball handler and shooter.")}
                </span>
              </>
            )}
          </div>
          <div className="main-action">
            {outcome?.practice ? (
              <button className="primary" onClick={g.nextPossession}>
                Start challenge <ArrowRight size={18} />
              </button>
            ) : status === "won" ? (
              <button className="primary" onClick={g.nextLevel}>
                {game.level === 4 ? "Claim the trophy" : "Next opponent"}{" "}
                <ArrowRight size={18} />
              </button>
            ) : status === "lost" ? (
              <button className="primary" onClick={g.retry}>
                Rematch <RotateCcw size={18} />
              </button>
            ) : outcome ? (
              <button className="primary" onClick={g.nextPossession}>
                Next possession <ArrowRight size={18} />
              </button>
            ) : (
              <button
                className="primary run-button"
                disabled={
                  running ||
                  !!g.error ||
                  tutorial === "invite" ||
                  tutorial === 0 ||
                  tutorial === 1
                }
                onClick={g.run}
              >
                <Play size={20} fill="currentColor" />
                {running ? "Playing…" : "PLAY"}
              </button>
            )}
          </div>
        </div>
        {!running && !outcome && status === "playing" && (
          <div className="dock-footer">
            {typeof tutorial === "number" ? (
              <button onClick={g.finishTutorial}>Skip warm-up</button>
            ) : (
              <span>Drag a jersey to draw · ★ shooter</span>
            )}
            <button
              disabled={locked}
              onClick={() => {
                g.edit(automatic(play));
                setTool("route");
                setTip(
                  "Automatic passing. Your ball handler and shooter stay the same.",
                );
              }}
              aria-label="Use automatic passing"
            >
              {play.mode === "passes" ? "Use auto passes" : "Auto passes ✓"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
