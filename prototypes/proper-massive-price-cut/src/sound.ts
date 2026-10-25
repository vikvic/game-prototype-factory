export class Soundtrack {
  private context: AudioContext | null = null;
  private lastLaugh = -10;
  private lastPass = -10;
  muted = false;
  unlock() { try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* Visual play remains available. */ } }
  private tone(f: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0, end?: number) {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    try {
      const c = this.context, t = c.currentTime + delay, osc = c.createOscillator(), gain = c.createGain();
      osc.type = type; osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end ?? f), t + duration);
      gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(volume, t + .008); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      osc.connect(gain); gain.connect(c.destination); osc.start(t); osc.stop(t + duration + .02);
    } catch { this.muted = true; /* Unavailable audio must never interrupt the game loop. */ }
  }
  cut() { this.tone(1500, .055, .055, 'triangle', 0, 180); this.tone(230, .105, .065, 'square', .025, 65); }
  pass(amount: number) { const t = this.context?.currentTime ?? 0; if (t - this.lastPass < .09) return; this.lastPass = t; this.tone(480 + amount * 80, .1, .035, 'sine', 0, 850); }
  combo(amount: number) { for (let i = 0; i < Math.min(4, amount); i++) this.tone(440 * 2 ** (i / 4), .13, .045, 'triangle', i * .045); }
  laugh() {
    const t = this.context?.currentTime ?? 0; if (t - this.lastLaugh < .35) return; this.lastLaugh = t;
    const voice = 115 + Math.random() * 90;
    for (let i = 0; i < 3; i++) { this.tone(voice, .105, .065, 'sawtooth', i * .13, voice * .55); this.tone(voice * 2.1, .08, .025, 'sine', i * .13); }
  }
}
