import React, { useMemo, useState } from "react";
import {
  Check,
  ArrowRight,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { POSITIONS, draftOptions, draftPools, ratings } from "../engine.js";
export const season = (p) => `${p.season - 1}–${String(p.season).slice(-2)}`;
export const num = (n) => (n === null ? "—" : n.toFixed(1));
export const last = (n) => n.split(" ").at(-1);
export const COLORS = ["#6df0c2", "#78c7ff", "#c4a0ff", "#ffbf69", "#ff8d9a"];
export function Jersey({ number, color, className = "" }) {
  return (
    <svg
      className={`jersey ${className}`}
      viewBox="0 0 100 110"
      aria-hidden="true"
    >
      <path
        d="M30 8 40 4Q50 20 60 4L70 8 91 30 77 48 70 40V101H30V40L23 48 9 30Z"
        fill={color}
      />
      <path
        d="M30 8 34 36V101M70 8 66 36V101M42 9Q50 24 58 9"
        fill="none"
        stroke="#0a161d"
        strokeOpacity=".25"
        strokeWidth="3"
      />
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fill="#0b1920"
        fontSize="38"
        fontWeight="900"
      >
        {number}
      </text>
    </svg>
  );
}
export default function Draft({ game, players, onPick, onDetails, onReset }) {
  const roster = game.roster.map((id) => players.find((p) => p.key === id));
  const pick = roster.length;
  const offers = useMemo(
    () =>
      draftOptions(
        players,
        game.eras[pick],
        game.roster,
        game.draftTeams[pick],
      ),
    [game],
  );
  const pool = draftPools(players, game.eras[pick]).find(
    (p) => p.team === game.draftTeams[pick],
  );
  return (
    <main className="draft-screen">
      <div className="draft-intro">
        <span className="eyebrow">THE ALL-ERA CHALLENGE</span>
        <h1>
          BUILD YOUR FIVE.
          <br />
          <em>BEAT THE BEST.</em>
        </h1>
        <p>Draft legends. Draw a play. Take down five defenses.</p>
      </div>
      <section className="draft-room" aria-labelledby="draft-title">
        <div className="draft-heading">
          <div>
            <span className="eyebrow">
              PICK {pick + 1} / 5 · NEW TEAM. NEW DECADE.
            </span>
            <h2 id="draft-title">
              <span>{game.eras[pick]}s</span> {pool?.teamName}
            </h2>
          </div>
          <button className="quiet" onClick={onReset}>
            Restart draft
          </button>
        </div>
        <div className="lineup-slots" aria-label="Your starting five">
          {POSITIONS.map((pos, i) => {
            const p = roster.find((p) => p.position === pos);
            return (
              <div key={pos} className={p ? "filled" : ""}>
                <b style={{ color: COLORS[i] }}>{pos}</b>
                <span>{p ? last(p.name) : "Open"}</span>
                {p && <Check size={14} />}
              </div>
            );
          })}
        </div>
        <p className="draft-cue" role="status">
          {game.draftPositionNotice ||
            `Browse each position, then draft your favorite. ${5 - pick} ${5 - pick === 1 ? "spot" : "spots"} left.`}
        </p>
        <div
          className="draft-cards"
          key={`${pick}-${game.eras[pick]}-${game.draftTeams[pick]}`}
        >
          {POSITIONS.map((position, index) => (
            <DraftCard
              key={position}
              candidates={offers.filter((p) => p.position === position)}
              index={index}
              onPick={onPick}
              onDetails={onDetails}
            />
          ))}
        </div>
        <p className="draft-source">
          {new Set(players.map((p) => p.id)).size.toLocaleString()} players · 7
          decades · One PG, SG, SF, PF & C{" "}
          <span>Single-season averages. Tap ⓘ for the story.</span>
        </p>
      </section>
    </main>
  );
}

function DraftCard({ candidates, index, onPick, onDetails }) {
  const [choice, setChoice] = useState(0);
  const p = candidates[choice] ?? candidates[0];
  if (!p) return null;
  const r = ratings(p),
    trait =
      p.assists >= 7
        ? "FLOOR GENERAL"
        : r.range >= 80
          ? "DEEP THREAT"
          : p.rebounds >= 11
            ? "GLASS CLEANER"
            : p.points >= 22
              ? "BUCKET GETTER"
              : "ALL-AROUND";
  function browse(delta) {
    setChoice((i) => (i + delta + candidates.length) % candidates.length);
  }
  return (
    <article
      className={`draft-card ${p.draftBlockedReason ? "locked" : ""}`}
      style={{ "--player": COLORS[index] }}
      aria-label={`${p.position} candidates`}
    >
      <div className="card-top">
        <b>{p.position}</b>
        <small>{season(p)}</small>
        <button
          className="info-button"
          aria-label={`Details for ${p.name}`}
          onClick={() => onDetails(p)}
        >
          <Info size={16} />
        </button>
      </div>
      <div className="card-art">
        <span className="era-watermark">
          {String(p.era).slice(2)}
          <small>s</small>
        </span>
        <Jersey color={COLORS[index]} number={p.position} />
        <span className="team-code">{p.team}</span>
      </div>
      <div className="card-identity">
        <span className="player-trait">{trait}</span>
        <h3 aria-live="polite" aria-atomic="true">
          {p.name}
        </h3>
        <div className="headline-stats">
          <span>
            <b>{num(p.points)}</b> PTS
          </span>
          <span>
            <b>{num(p.rebounds)}</b> REB
          </span>
          <span>
            <b>{num(p.assists)}</b> AST
          </span>
        </div>
      </div>
      <div
        className="candidate-picker"
        role="group"
        aria-label={`${p.position} player choices`}
      >
        <button
          onClick={() => browse(-1)}
          disabled={candidates.length < 2 || !!p.draftBlockedReason}
          aria-label={`Previous ${p.position} player`}
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          {candidates.length === 1 ? (
            "Only eligible player"
          ) : (
            <>
              OPTION <b>{choice + 1}</b> / {candidates.length}
            </>
          )}
        </span>
        <button
          onClick={() => browse(1)}
          disabled={candidates.length < 2 || !!p.draftBlockedReason}
          aria-label={`Next ${p.position} player`}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <button
        className="draft-button"
        disabled={!!p.draftBlockedReason}
        aria-label={
          p.draftBlockedReason
            ? `${p.draftBlockedReason}: ${p.name}`
            : `Draft ${p.name}`
        }
        onClick={() => onPick(p.key)}
      >
        {p.draftBlockedReason ? (
          <>
            <Check size={17} /> Position filled
          </>
        ) : (
          <>
            DRAFT <ArrowRight size={18} />
          </>
        )}
      </button>
    </article>
  );
}
