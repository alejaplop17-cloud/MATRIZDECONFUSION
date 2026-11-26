let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      audioCtx = new Ctor();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playGameTone(type: 'correct' | 'wrong' | 'levelUp', enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number, gainPeak = 0.08) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'wrong' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    if (type === 'correct') {
      playNote(523.25, now, 0.12);
      playNote(659.25, now + 0.09, 0.16);
    } else if (type === 'wrong') {
      playNote(240, now, 0.14, 0.07);
      playNote(195, now + 0.11, 0.18, 0.07);
    } else if (type === 'levelUp') {
      playNote(523.25, now, 0.12);
      playNote(659.25, now + 0.1, 0.12);
      playNote(783.99, now + 0.2, 0.14);
      playNote(1046.5, now + 0.32, 0.28, 0.1);
    }
  } catch {
    // Audio playback optional; fail silently
  }
}
