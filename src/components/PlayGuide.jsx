import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Play, Pause, RotateCcw } from "lucide-react";
import { simulate } from "../engine.js";
import { LESSONS, lessonPlay } from "../game/lessons.js";
import { COLORS } from "./Draft.jsx";

export default function PlayGuide({ roster, onTry, onWarmup }) {
  const [index, setIndex] = useState(0);
  return (
    <div className="play-guide">
      <p className="guide-intro">
        Four quick basketball ideas. Watch one, then make it yours.
      </p>
      <div className="lesson-tabs" role="group" aria-label="Basketball lessons">
        {LESSONS.map((lesson, i) => (
          <button
            key={lesson.id}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            {lesson.label}
          </button>
        ))}
      </div>
      <Lesson
        key={index}
        lesson={LESSONS[index]}
        roster={roster}
        onTry={onTry}
      />
      <div className="guide-footer">
        <span>
          {index + 1} / {LESSONS.length} · Each example takes 6 seconds
        </span>
        <button
          className="quiet"
          onClick={() => setIndex((index + 1) % LESSONS.length)}
        >
          {index === LESSONS.length - 1 ? "Back to cuts" : "Next tip"}{" "}
          <ArrowRight size={16} />
        </button>
      </div>
      <details className="guide-basics">
        <summary>The game & controls</summary>
        <p>
          Draft one PG, SG, SF, PF and C. Browse the player arrows, or use one
          of your two team reshuffles. Make three baskets in five tries to beat
          each defense. Rematches keep your team.
        </p>
        <p>
          Tap a jersey to choose the starter or shooter. Draw adds routes; Move
          changes starting spots. Clear erases routes but keeps positions. Reset
          puts the bigs in the key, the wings outside and the ball with your PG.
          Undo reverses an edit.
        </p>
        <p>
          Keyboard: Tab to a jersey and press Enter to select. Arrow keys draw
          points or move the player. A good look can still miss—keep a good play
          and try again.
        </p>
        {onWarmup && (
          <button className="secondary" onClick={onWarmup}>
            Try the warm-up <ArrowRight size={16} />
          </button>
        )}
      </details>
    </div>
  );
}

function Lesson({ lesson, roster, onTry }) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const elapsed = useRef(0);
  const play = useMemo(
    () => lessonPlay(lesson.id, roster),
    [lesson.id, roster],
  );
  // Use real movement, screen contact and pass events. Stop at the shot setup;
  // the guide does not promise a make or alter the player's challenge progress.
  const result = useMemo(
    () => simulate(roster, play, 1, () => 0.99),
    [roster, play],
  );
  useEffect(() => {
    if (!playing) return;
    let frame, previous;
    function tick(now) {
      if (previous !== undefined)
        elapsed.current += Math.min(100, now - previous);
      previous = now;
      const p = Math.min(1, elapsed.current / 6000);
      setProgress(p);
      if (p === 1) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  function watch() {
    if (progress === 1) {
      elapsed.current = 0;
      setProgress(0);
    }
    setPlaying(!playing);
  }
  return (
    <section className="lesson" aria-label={lesson.title}>
      <div className="lesson-visual">
        <LessonCourt
          play={play}
          result={result}
          roster={roster}
          progress={progress}
          title={lesson.title}
        />
        <div className="lesson-caption" aria-live="polite">
          {lesson.cues[Math.min(2, Math.floor(progress * 3))]}
        </div>
        <button className="secondary lesson-watch" onClick={watch}>
          {playing ? (
            <Pause size={15} />
          ) : progress === 1 ? (
            <RotateCcw size={15} />
          ) : (
            <Play size={15} />
          )}
          {playing
            ? "Pause example"
            : progress === 1
              ? "Replay example"
              : "Watch example"}
        </button>
      </div>
      <div className="lesson-copy">
        <h3>{lesson.title}</h3>
        <p>{lesson.tip}</p>
        <span className="eyebrow">ON YOUR COURT</span>
        <p>{lesson.draw}</p>
        {onTry ? (
          <button className="primary" onClick={() => onTry(play)}>
            Try this play <ArrowRight size={16} />
          </button>
        ) : (
          <p className="guide-hint">
            Draft your five, then open the playbook between possessions to try
            an example.
          </p>
        )}
      </div>
    </section>
  );
}

function LessonCourt({ play, result, roster, progress, title }) {
  const t = progress * result.shotT,
    at = t * 48;
  const lo = Math.min(48, Math.floor(at)),
    hi = Math.min(48, lo + 1),
    f = at - lo;
  const lerp = (a, b, q) => ({
    x: a.x + (b.x - a.x) * q,
    y: a.y + (b.y - a.y) * q,
  });
  const frame = result.frames[lo];
  const offense = frame.offense.map((p, i) =>
    lerp(p, result.frames[hi].offense[i], f),
  );
  let holder = play.starter,
    ball;
  for (const pass of result.passEvents) {
    if (t >= pass.arrive) holder = pass.to;
    else if (t >= pass.t) {
      ball = lerp(
        result.frames[Math.round(pass.t * 48)].offense[pass.from],
        result.frames[Math.round(pass.arrive * 48)].offense[pass.to],
        (t - pass.t) / (pass.arrive - pass.t),
      );
      break;
    }
  }
  ball ??= { x: offense[holder].x + 15, y: offense[holder].y - 17 };
  return (
    <svg
      className="lesson-court"
      viewBox="0 0 500 440"
      role="img"
      aria-label={`${title} Animated example. Colored circles are your players; crosses are defenders.`}
      data-progress={progress.toFixed(2)}
    >
      <rect width="500" height="440" rx="12" fill="#d4a36e" />
      <g fill="none" stroke="#815e3f" strokeWidth="2">
        <path d="M24 418V22H476V418ZM176 22V210H324V22M42 22V90A210 210 0 0 0 458 90V22" />
        <circle cx="250" cy="210" r="62" />
        <path d="M226 42H274" />
        <circle cx="250" cy="55" r="12" stroke="#a84d2e" strokeWidth="4" />
      </g>
      {play.routes.map(
        (route, i) =>
          route.length > 0 && (
            <polyline
              key={i}
              points={[play.positions[i], ...route]
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              stroke="#214a50"
              opacity=".6"
              strokeWidth="3"
              strokeDasharray="6 6"
              fill="none"
            />
          ),
      )}
      {frame.defenders.map((d, i) => (
        <path
          key={i}
          d={`M${d.x - 6} ${d.y - 6}l12 12m0 -12l-12 12`}
          stroke="#93452f"
          strokeWidth="4"
          opacity=".8"
        />
      ))}
      {frame.activeScreens.map((s) => (
        <circle
          key={`${s.screener}-${s.cutter}`}
          cx={offense[s.screener].x}
          cy={offense[s.screener].y}
          r="27"
          fill="none"
          stroke="#254e48"
          strokeWidth="4"
        />
      ))}
      {offense.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <circle r="19" fill={COLORS[i]} stroke="#17343b" strokeWidth="2.5" />
          <text
            textAnchor="middle"
            y="5"
            fill="#13272e"
            fontSize="13"
            fontWeight="900"
          >
            {roster[i].position}
          </text>
        </g>
      ))}
      <circle
        className="lesson-ball"
        cx={ball.x}
        cy={ball.y}
        r="9"
        fill="#f48430"
        stroke="#582b17"
        strokeWidth="2"
      />
    </svg>
  );
}
