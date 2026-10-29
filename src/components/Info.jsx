import React, { useState } from "react";
import { ratings, superteam } from "../engine.js";
import { season, num } from "./Draft.jsx";
export function PlayerInfo({ player: p }) {
  const r = ratings(p);
  return (
    <>
      <p className="eyebrow">
        {p.teamName} · {season(p)} · {p.position}
      </p>
      <div className="stat-grid">
        {[
          ["points", "PTS"],
          ["rebounds", "REB"],
          ["assists", "AST"],
          ["steals", "STL"],
          ["blocks", "BLK"],
        ].map(([k, l]) => (
          <div key={k}>
            <b>{num(p[k])}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <p>
        Regular-season per-game averages across {p.games} games. “—” means the
        stat wasn’t recorded.
      </p>
      <div className="rating-list">
        {["rim", "range", "creation", "defense"].map((k) => (
          <div key={k}>
            <span>{k}</span>
            <meter min="0" max="100" value={r[k]} />
            <b>{Math.round(r[k])}</b>
          </div>
        ))}
      </div>
      <p className="muted">
        Ratings are game estimates derived from the season, not official
        measures of talent.
      </p>
      <a href={p.source} target="_blank" rel="noreferrer">
        View the season source ↗
      </a>
    </>
  );
}
export default function Info({ players }) {
  const [search, setSearch] = useState("");
  return (
    <>
      <p>Real seasons. Imagined matchups. Your basketball brain.</p>
      <h3>The roster</h3>
      <p>
        {new Set(players.map((p) => p.id)).size.toLocaleString()} players,{" "}
        {players.length.toLocaleString()} team-player seasons and{" "}
        {new Set(players.map((p) => `${p.era}-${p.team}`)).size} team–decade
        pools, from seasons ending 1960–2024. Each draft offers a real team from
        a different decade. One player per position; no duplicate identities.
        The top available seasons use this game’s rating, not an official
        ranking. Browse up to three different players per position using the
        arrows on each card. Short-lived historical teams sometimes have fewer
        eligible players.
      </p>
      <p>
        Season facts:{" "}
        <a
          href="https://github.com/sumitrodatta/bball-reference-datasets"
          target="_blank"
          rel="noreferrer"
        >
          Sumitro Datta’s public dataset
        </a>
        , originally compiled by Basketball-Reference / Sports Reference. The
        mirror has no explicit license notice. Only selected factual records are
        bundled, with links to each player’s source. Historical unrecorded
        steals and blocks remain unavailable.
      </p>
      <h3>The basketball</h3>
      <p>
        Routes determine movement, spacing and screens. A planted screen must
        actually catch a defender to help. Passes look for openings; long passes
        through defenders are riskier. Shot chances use the shooter’s season,
        distance, separation and spacing. Good decisions improve the odds; every
        shot can miss.
      </p>
      <p>
        Rim, range, creation and defense are game estimates. Pre-three-point and
        low-volume seasons use a conservative free-throw-based range estimate.
        Missing defensive stats use a neutral rating. This is an arcade strategy
        model, not a prediction of real NBA results.
      </p>
      <h3>The final five</h3>
      <p>
        One player per position, selected reproducibly using 32% rim, 22% range,
        20% creation and 26% defense; ties by player ID.
      </p>
      <div className="legend-list">
        {superteam(players).map((p) => (
          <div key={p.id}>
            <b>{p.slot}</b>
            <span>{p.name}</span>
            <small>{season(p)}</small>
          </div>
        ))}
      </div>
      <h3>Explore the seasons</h3>
      <input
        className="search"
        aria-label="Search source records"
        placeholder="Player, team or season…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="source-records">
        {players
          .filter((p) =>
            `${p.name} ${p.teamName} ${p.era} ${p.season}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .slice(0, 40)
          .map((p) => (
            <div key={p.key}>
              <a href={p.source} target="_blank" rel="noreferrer">
                {p.name}
              </a>
              <small>
                {p.team} · {season(p)}
              </small>
              <span>
                {num(p.points)} PTS · {num(p.steals)} STL · {num(p.blocks)} BLK
              </span>
            </div>
          ))}
      </div>
      <p>
        Showing up to 40 matches.{" "}
        <a href="/players.json" download>
          Download all records
        </a>
        .
      </p>
      <p className="muted">
        Original game, artwork and audio. Barlow Condensed typeface by Jeremy
        Tribby, under the SIL Open Font License (bundled with the game). Draft
        concept inspired by NBA 82-0. No copied branding, logos or portraits.
        Independent project, not affiliated with the NBA or its players.
        Progress saves in this browser; no account needed.
      </p>
    </>
  );
}

export function OpponentInfo({ players, onDetails }) {
  return (
    <>
      <p>
        Five all-time seasons. A balanced lineup selected by this game’s
        ratings. Beat them with movement, spacing and screens.
      </p>
      <div className="boss-lineup">
        {superteam(players).map((p) => (
          <button key={p.key} onClick={() => onDetails(p)}>
            <b>{p.slot}</b>
            <span>
              {p.name}
              <small>
                {season(p)} · {p.team}
              </small>
            </span>
            <span>
              {num(p.points)}
              <small>PTS / GAME</small>
            </span>
          </button>
        ))}
      </div>
      <p className="muted">
        Tap a player for their sourced season stats and game estimates.
      </p>
    </>
  );
}
