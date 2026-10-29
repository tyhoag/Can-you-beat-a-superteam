import { useEffect, useRef, useState } from "react";
import {
  freshGame,
  restoreGame,
  selectDraftPlayer,
  simulate,
  superteam,
  recordResult,
  roundStatus,
  advance,
  validatePlay,
} from "../engine.js";
import { firstPlay, automatic } from "./playbook.js";
import { sound } from "./audio.js";
export const SAVE_KEY = "chalk-dynasty-v2";
export function useGame(players) {
  const [game, setGame] = useState(() => {
    try {
      return (
        restoreGame(localStorage.getItem(SAVE_KEY), players) ||
        freshGame(players)
      );
    } catch {
      return freshGame(players);
    }
  });
  const [history, setHistory] = useState([]),
    [scene, setScene] = useState(null),
    [outcome, setOutcome] = useState(null),
    [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("chalk-sound") !== "on";
    } catch {
      return true;
    }
  });
  const [tutorial, setTutorial] = useState(null);
  const animation = useRef(null),
    runningRef = useRef(false);
  const roster = game.roster.map((k) => players.find((p) => p.key === k));
  const status = roundStatus(game.results),
    error = roster.length === 5 ? validatePlay(game.play) : null;
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch {
      setNotice(
        "Progress can’t be saved here. You can still play in this tab.",
      );
    }
  }, [game]);
  useEffect(() => () => cancelAnimationFrame(animation.current), []);
  function edit(next, continuation = false) {
    if (runningRef.current || outcome) return;
    if (!continuation)
      setHistory((h) => [...h.slice(-29), structuredClone(game.play)]);
    setGame((g) => ({
      ...g,
      play: typeof next === "function" ? next(g.play) : next,
    }));
  }
  function undo() {
    if (runningRef.current || outcome || !history.length) return;
    setGame((g) => ({ ...g, play: history.at(-1) }));
    setHistory((h) => h.slice(0, -1));
  }
  function pick(key) {
    const next = selectDraftPlayer(game, key, players);
    if (next === game) return;
    if (next.stage === "game") {
      next.play = firstPlay(
        next.roster.map((k) => players.find((p) => p.key === k)),
      );
      try {
        if (!localStorage.getItem("chalk-coach-done")) setTutorial("invite");
      } catch {
        setTutorial("invite");
      }
    }
    setGame(next);
    sound("pick", !muted);
  }
  function finishTutorial() {
    setTutorial(null);
    try {
      localStorage.setItem("chalk-coach-done", "yes");
    } catch {}
  }
  function run() {
    if (error || runningRef.current || outcome || status !== "playing") return;
    const result = simulate(
      roster,
      game.play,
      game.level,
      Math.random,
      superteam(players),
    );
    const practice = typeof tutorial === "number";
    result.practice = practice;
    runningRef.current = true;
    sound("play", !muted);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const duration = reduced ? 850 : 3400;
    let start;
    function tick(now) {
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      setScene({ result, progress });
      if (progress < 1) animation.current = requestAnimationFrame(tick);
      else {
        runningRef.current = false;
        setOutcome(result);
        if (!practice) setGame((g) => recordResult(g, result.made));
        sound(result.made ? "make" : "miss", !muted);
      }
    }
    animation.current = requestAnimationFrame(tick);
  }
  function nextPossession() {
    setScene(null);
    setOutcome(null);
    if (outcome?.practice) finishTutorial();
  }
  function retry() {
    setGame((g) => ({ ...g, results: [], round: g.round + 1 }));
    setScene(null);
    setOutcome(null);
  }
  function nextLevel() {
    setGame((g) => advance(g));
    setScene(null);
    setOutcome(null);
    setHistory([]);
    sound("win", !muted);
  }
  function reset() {
    cancelAnimationFrame(animation.current);
    runningRef.current = false;
    setGame(freshGame(players));
    setHistory([]);
    setScene(null);
    setOutcome(null);
    setTutorial(null);
  }
  function toggleSound() {
    setMuted((v) => {
      const n = !v;
      try {
        localStorage.setItem("chalk-sound", n ? "off" : "on");
      } catch {}
      sound("pick", !n);
      return n;
    });
  }
  function coach() {
    if (runningRef.current) return;
    setScene(null);
    setOutcome(null);
    setTutorial(0);
  }
  // Earlier saved manual routes can have an unfinished pass order. Keep their drawing,
  // handler and shooter, and recover automatic delivery rather than locking out play.
  useEffect(() => {
    if (
      error &&
      game.play.mode === "passes" &&
      !validatePlay(automatic(game.play))
    )
      setGame((g) => ({ ...g, play: automatic(g.play) }));
  }, [error]);
  return {
    game,
    roster,
    history,
    scene,
    outcome,
    notice,
    muted,
    tutorial,
    setTutorial,
    finishTutorial,
    status,
    error,
    running: !!scene && !outcome,
    edit,
    undo,
    pick,
    run,
    nextPossession,
    retry,
    nextLevel,
    reset,
    toggleSound,
    coach,
  };
}
