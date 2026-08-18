export type BeepKind = "phase" | "end";

/**
 * Small oscillator-based beep, shared by the Practice tracker's timer and the
 * session nudge banner so both cues sound identical. Caller owns the
 * `AudioContext` (creation needs a user gesture) — pass a getter that creates
 * one on first use and reuses it after.
 */
export function playBeep(getCtx: () => AudioContext, kind: BeepKind): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const tones: [number, number][] = kind === "end" ? [[660, 0], [880, 0.16], [1100, 0.32]] : [[820, 0]];
    tones.forEach(([freq, t]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.22, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.3);
      osc.start(now + t);
      osc.stop(now + t + 0.32);
    });
  } catch {
    /* ignore */
  }
}
