import React, { useMemo, useRef } from "react";
import { clamp, distance, planPlay, initialDefenders, RIM } from "../engine.js";
import { COLORS, last } from "./Draft.jsx";
const lerp = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export default function Court({
  play,
  roster,
  selected,
  onSelect,
  tool,
  onEdit,
  locked,
  scene,
  level,
  onPass,
}) {
  const svg = useRef(),
    drag = useRef(null);
  const plan = useMemo(() => planPlay(play, level), [play, level]);
  const result = scene?.result,
    progress = scene?.progress ?? 0;
  const end = result?.turnover
    ? (result.turnover.t + result.turnover.arrive) / 2
    : (result?.shotT ?? 1);
  const t = clamp(progress / 0.72, 0, 1) * end;
  const index = t * 48,
    low = Math.min(48, Math.floor(index)),
    high = Math.min(48, low + 1),
    mix = index - low;
  const frame = result?.frames[low];
  const offense = frame
    ? frame.offense.map((p, i) => lerp(p, result.frames[high].offense[i], mix))
    : play.positions;
  const defenders = frame
    ? frame.defenders.map((p, i) =>
        lerp(p, result.frames[high].defenders[i], mix),
      )
    : initialDefenders(play, level);
  const screens = frame?.activeScreens ?? plan.screens;
  function point(e) {
    const r = svg.current.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 500, 22, 478),
      y: clamp(((e.clientY - r.top) / r.height) * 470, 25, 445),
    };
  }
  function append(pt, index, continuation = false, replace = false) {
    onEdit(
      (p) => ({
        ...p,
        routes: p.routes.map((r, i) =>
          i === index ? (replace ? [pt] : [...r, pt]).slice(0, 24) : r,
        ),
      }),
      continuation,
    );
  }
  function start(e, i) {
    if (locked || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (i !== undefined) {
      if (tool === "pass") {
        onPass(i);
        return;
      }
      onSelect(i);
      drag.current = { i, type: tool, last: point(e), started: false };
    } else if (tool === "route") {
      append(point(e), selected);
      drag.current = {
        i: selected,
        type: "route",
        last: point(e),
        started: true,
      };
    }
    if (drag.current) svg.current.setPointerCapture(e.pointerId);
  }
  function move(e) {
    const d = drag.current;
    if (!d || locked) return;
    const pt = point(e);
    if (distance(pt, d.last) < (d.started ? 14 : 7)) return;
    if (d.type === "move")
      onEdit(
        (p) => ({
          ...p,
          positions: p.positions.map((a, i) => (i === d.i ? pt : a)),
        }),
        d.started,
      );
    else append(pt, d.i, d.started, !d.started);
    d.started = true;
    d.last = pt;
  }
  function finish(e) {
    const d = drag.current;
    if (!d) return;
    move(e);
    if (d.started && distance(point(e), d.last) > 1) {
      if (d.type === "route") append(point(e), d.i, true);
      else
        onEdit(
          (p) => ({
            ...p,
            positions: p.positions.map((a, i) => (i === d.i ? point(e) : a)),
          }),
          true,
        );
    }
    drag.current = null;
  }
  function keyboard(e, i) {
    if (locked) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tool === "pass" ? onPass(i) : onSelect(i);
      return;
    }
    const delta = {
      ArrowUp: [0, -12],
      ArrowDown: [0, 12],
      ArrowLeft: [-12, 0],
      ArrowRight: [12, 0],
    }[e.key];
    if (!delta || tool === "pass") return;
    e.preventDefault();
    onSelect(i);
    const a =
      tool === "route"
        ? (play.routes[i].at(-1) ?? play.positions[i])
        : play.positions[i];
    const pt = {
      x: clamp(a.x + delta[0], 22, 478),
      y: clamp(a.y + delta[1], 25, 445),
    };
    if (tool === "route") append(pt, i);
    else
      onEdit((p) => ({
        ...p,
        positions: p.positions.map((v, j) => (j === i ? pt : v)),
      }));
  }
  let holder = play.starter,
    ball = offense[holder],
    flying = false;
  if (result) {
    for (const pass of result.passEvents) {
      if (t >= pass.arrive) holder = pass.to;
      else if (t >= pass.t) {
        ball = lerp(
          result.frames[Math.round(pass.t * 48)].offense[pass.from],
          result.frames[Math.round(pass.arrive * 48)].offense[pass.to],
          (t - pass.t) / (pass.arrive - pass.t),
        );
        holder = -1;
        flying = true;
        break;
      }
    }
    if (holder >= 0) ball = offense[holder];
    if (result.turnover && t >= result.turnover.t) {
      const steal = result.turnover;
      const origin =
        result.frames[Math.round(steal.t * 48)].offense[steal.from];
      const destination =
        result.frames[Math.round(end * 48)].defenders[steal.by];
      ball = lerp(
        origin,
        destination,
        clamp((t - steal.t) / (end - steal.t), 0, 1),
      );
      holder = -1;
      flying = true;
    }
    if (!result.turnover && progress > 0.72) {
      const q = clamp((progress - 0.72) / 0.23, 0, 1),
        target = result.made ? RIM : { x: 278, y: 85 };
      ball = lerp(result.spot, target, q);
      ball.y -= Math.sin(Math.PI * q) * 40;
      flying = true;
      holder = -1;
      if (q === 1 && result.made)
        ball.y += clamp((progress - 0.95) / 0.05, 0, 1) * 17;
    }
  }
  const bx = ball.x + (flying ? 0 : 13),
    by = ball.y - (flying ? 0 : 10);
  const passLine = play.mode === "passes" ? play.passes : [];
  const final = result && progress >= 0.96;
  return (
    <div
      className={`court-wrap ${result ? "in-motion" : ""} ${final && result.made ? "scored" : ""}`}
    >
      <svg
        ref={svg}
        className={`court tool-${tool}`}
        viewBox="0 0 500 470"
        role="group"
        aria-label="Basketball court. Select a jersey. Drag to draw; arrow keys add route points."
        onPointerDown={(e) => start(e)}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={() => (drag.current = null)}
      >
        <defs>
          <linearGradient id="floor" x2="0" y2="1">
            <stop stopColor="#dba66d" />
            <stop offset="1" stopColor="#ba7d48" />
          </linearGradient>
          <pattern
            id="planks"
            width="84"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0H84M0 24H84M42 0V24"
              stroke="#744d2c"
              strokeOpacity=".18"
              strokeWidth=".6"
            />
            <path
              d="M4 7H35M47 18H79M7 19H29"
              stroke="#ffe7bf"
              strokeOpacity=".12"
              strokeWidth=".6"
            />
          </pattern>
          {COLORS.map((c, i) => (
            <marker
              key={i}
              id={`arrow-${i}`}
              markerWidth="6"
              markerHeight="6"
              refX="4"
              refY="3"
              orient="auto"
            >
              <path d="M0 0 5 3 0 6" fill="none" stroke={c} strokeWidth="1.7" />
            </marker>
          ))}
          <marker
            id="pass-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0 0 6 3 0 6Z" fill="#fff" />
          </marker>
          <filter id="shadow" x="-70%" y="-60%" width="240%" height="250%">
            <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity=".35" />
          </filter>
        </defs>
        <rect width="500" height="470" rx="8" fill="#102c34" />
        <rect x="17" y="18" width="466" height="434" fill="url(#floor)" />
        <rect x="17" y="18" width="466" height="434" fill="url(#planks)" />
        <path d="M176 20V210H324V20Z" fill="#11444a" fillOpacity=".92" />
        <g className="court-lines" pointerEvents="none">
          <path d="M20 20H480V450H20Z M176 20V210H324V20 M176 210a74 74 0 0 0 148 0 M42 20v70a210 210 0 0 0 416 0V20 M192 450a58 58 0 0 1 116 0" />
          <path
            d="M176 210a74 74 0 0 1 148 0"
            strokeDasharray="7 7"
            opacity=".45"
          />
          <path d="M212 55v14a38 38 0 0 0 76 0V55" opacity=".5" />
        </g>
        <g pointerEvents="none" className="floor-brand">
          <text x="250" y="339">
            CHALK & DYNASTY
          </text>
          <path
            d="m235 365 15-12 15 12-15 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="250" y="432" className="baseline-word">
            MAKE YOUR OWN HISTORY
          </text>
        </g>
        {!result && (
          <g pointerEvents="none">
            {passLine.slice(1).map((to, i) => {
              const a = play.positions[passLine[i]],
                b = play.positions[to];
              return (
                <path
                  key={i}
                  className="pass-arrow"
                  d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
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
                <g key={i} opacity={result ? 0.18 : i === selected ? 1 : 0.68}>
                  <path
                    className="route-shadow"
                    d={`M${play.positions[i].x} ${play.positions[i].y} ${route.map((p) => `L${p.x} ${p.y}`).join(" ")}`}
                  />
                  <path
                    className="drawn-route"
                    stroke={COLORS[i]}
                    d={`M${play.positions[i].x} ${play.positions[i].y} ${route.map((p) => `L${p.x} ${p.y}`).join(" ")}`}
                    markerEnd={`url(#arrow-${i})`}
                  />
                  <circle
                    cx={route.at(-1).x}
                    cy={route.at(-1).y}
                    r="7"
                    stroke={COLORS[i]}
                    fill="#10242c"
                    strokeWidth="1.5"
                  />
                  {i === selected &&
                    !result &&
                    route.map((p, j) => (
                      <circle
                        key={j}
                        cx={p.x}
                        cy={p.y}
                        r="2.5"
                        fill={COLORS[i]}
                      />
                    ))}
                </g>
              ),
          )}
        </g>
        <g pointerEvents="none">
          {screens.map((s) => (
            <g
              key={`${s.screener}-${s.cutter}`}
              data-screener={s.screener}
              data-cutter={s.cutter}
              className="screen-marker"
              transform={`translate(${s.point.x},${s.point.y})`}
            >
              <path
                d="M-20-9V9M-20 0H20M20-9V9"
                fill="none"
                stroke="#fff8c3"
                strokeWidth="4"
              />
              <text y="-15">{s.roll?.length ? "PICK + ROLL" : "PICK"}</text>
            </g>
          ))}
        </g>
        <g pointerEvents="none">
          {defenders.map((p, i) => (
            <g
              key={i}
              data-defender={i}
              transform={`translate(${p.x},${p.y})`}
              className={`defender ${frame?.blocked.includes(i) ? "caught" : ""}`}
            >
              <ellipse cy="17" rx="16" ry="5" fill="#1a1719" opacity=".25" />
              <path
                d="M-8-16-17-9-13 1-9-2V17H9V-2L13 1 17-9 8-16Q0-9-8-16Z"
                fill="#572d40"
                stroke="#f7a0ad"
                strokeWidth="1.5"
              />
              <text y="9">×</text>
            </g>
          ))}
        </g>
        {offense.map((p, i) => (
          <g
            key={i}
            data-player={i}
            data-ball={holder === i ? "true" : undefined}
            transform={`translate(${p.x},${p.y})`}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-label={`Player ${i + 1}: ${roster[i].name}${play.starter === i ? ", starts with ball" : ""}${play.shooter === i ? ", shooter" : ""}`}
            aria-pressed={selected === i}
            onPointerDown={(e) => start(e, i)}
            onKeyDown={(e) => keyboard(e, i)}
            onClick={(e) => {
              if (!locked && e.detail === 0)
                tool === "pass" ? onPass(i) : onSelect(i);
            }}
            className={`court-player ${selected === i ? "selected" : ""}`}
          >
            <circle r="28" fill="transparent" pointerEvents="all" />
            <ellipse
              cy="20"
              rx="19"
              ry="6"
              fill="#1a1719"
              opacity=".3"
              pointerEvents="none"
            />
            {selected === i && !result && (
              <circle
                r="25"
                fill="none"
                stroke="#fff"
                strokeWidth="1.6"
                strokeDasharray="3 4"
                pointerEvents="none"
              />
            )}
            <path
              d="M-8-17-19-9-14 2-10-1V18H10V-1L14 2 19-9 8-17Q0-9-8-17Z"
              fill={COLORS[i]}
              stroke="#12252e"
              strokeWidth="1.8"
              filter="url(#shadow)"
              pointerEvents="none"
            />
            <text className="jersey-number" y="10" pointerEvents="none">
              {i + 1}
            </text>
            <text className="court-name" y="35" pointerEvents="none">
              {last(roster[i].name)}
            </text>
            {play.shooter === i && (
              <text
                className="shooter-star"
                x="23"
                y="-16"
                pointerEvents="none"
              >
                ★
              </text>
            )}
          </g>
        ))}
        <g pointerEvents="none">
          <rect x="222" y="39" width="56" height="6" rx="2" fill="#f0f0e4" />
          <path
            className={final && result.made ? "net swish" : "net"}
            d="m241 57 3 17h12l3-17M245 58l2 15m8-15-2 15M243 64h14M244 69h12"
          />
          <ellipse
            cx="250"
            cy="55"
            rx="10"
            ry="7"
            fill="none"
            stroke="#ff7149"
            strokeWidth="3"
          />
          <g className="basketball" transform={`translate(${bx},${by})`}>
            <circle r="7" fill="#ff8c37" stroke="#432a22" strokeWidth="1.3" />
            <path
              d="M-7 0H7M0-7V7M-5-5Q3 0-5 5M5-5Q-3 0 5 5"
              fill="none"
              stroke="#633321"
              strokeWidth=".8"
            />
          </g>
        </g>
        {final && (
          <text
            className={`court-result ${result.made ? "make" : "miss"}`}
            x="250"
            y="225"
            pointerEvents="none"
          >
            {result.turnover
              ? "PICKED OFF"
              : result.made
                ? "BUCKET!"
                : "SO CLOSE"}
          </text>
        )}
      </svg>
    </div>
  );
}
