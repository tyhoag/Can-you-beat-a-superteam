// Short original synth cues, entirely local and opt-in.
let context;
export function sound(kind, enabled) {
  if (!enabled) return;
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === "suspended") context.resume();
    const tones =
      kind === "win"
        ? [440, 554, 659, 880]
        : kind === "make"
          ? [523, 784]
          : kind === "miss"
            ? [196, 147]
            : kind === "play"
              ? [330]
              : [440];
    tones.forEach((hz, i) => {
      const osc = context.createOscillator(),
        gain = context.createGain(),
        t = context.currentTime + i * 0.09;
      osc.type = "sine";
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  } catch {
    /* Sound never blocks a possession. */
  }
}
