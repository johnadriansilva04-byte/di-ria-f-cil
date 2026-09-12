/**
 * Sons do caixa, gerados na hora com a Web Audio API.
 *
 * Sem arquivo de áudio no projeto: toca offline, é leve e não precisa
 * baixar nada. Ganho = "ka-ching" (sinos subindo + moedinhas).
 * Gasto = "quáem" (tom descendo + baque seco).
 *
 * O navegador só libera áudio depois de um toque/clique, por isso o
 * formulário chama `primeAudio()` no clique e `playGain`/`playSpend`
 * logo depois do lançamento ser salvo.
 */

const SOUND_KEY = "caixa_sound";

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    /* storage bloqueado */
  }
}

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Prepara o áudio dentro do gesto do usuário (obrigatório em vários navegadores). */
export function primeAudio(): void {
  audio();
}

type ToneOptions = {
  freq: number;
  to?: number;
  start?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
};

function tone(ac: AudioContext, options: ToneOptions): void {
  const at = ac.currentTime + (options.start ?? 0);
  const osc = ac.createOscillator();
  const vol = ac.createGain();

  osc.type = options.type ?? "triangle";
  osc.frequency.setValueAtTime(options.freq, at);
  if (options.to) osc.frequency.exponentialRampToValueAtTime(options.to, at + options.dur);

  const peak = options.gain ?? 0.2;
  vol.gain.setValueAtTime(0.0001, at);
  vol.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, at + options.dur);

  osc.connect(vol).connect(ac.destination);
  osc.start(at);
  osc.stop(at + options.dur + 0.03);
}

function noise(
  ac: AudioContext,
  options: { dur: number; freq: number; start?: number; gain?: number; q?: number },
): void {
  const at = ac.currentTime + (options.start ?? 0);
  const length = Math.max(1, Math.floor(ac.sampleRate * options.dur));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }

  const source = ac.createBufferSource();
  source.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = options.freq;
  filter.Q.value = options.q ?? 1;

  const vol = ac.createGain();
  const peak = options.gain ?? 0.14;
  vol.gain.setValueAtTime(peak, at);
  vol.gain.exponentialRampToValueAtTime(0.0001, at + options.dur);

  source.connect(filter).connect(vol).connect(ac.destination);
  source.start(at);
}

/** Dinheiro entrando: "ka-ching" brilhante subindo + moedinhas. */
export function playGain(): void {
  if (!isSoundEnabled()) return;
  const ac = audio();
  if (!ac) return;

  tone(ac, { freq: 1046.5, dur: 0.16, type: "triangle", gain: 0.16 }); // dó agudo
  tone(ac, { freq: 1568, dur: 0.55, type: "sine", gain: 0.15, start: 0.07 }); // sol
  tone(ac, { freq: 2093, dur: 0.42, type: "sine", gain: 0.07, start: 0.07 }); // brilho
  noise(ac, { start: 0.01, dur: 0.16, gain: 0.1, freq: 5200, q: 0.9 });
  noise(ac, { start: 0.1, dur: 0.3, gain: 0.055, freq: 7800, q: 0.7 });
}

/** Dinheiro saindo: "quáem" — tom caindo e um baque seco no fim. */
export function playSpend(): void {
  if (!isSoundEnabled()) return;
  const ac = audio();
  if (!ac) return;

  tone(ac, { freq: 640, to: 150, dur: 0.28, type: "sawtooth", gain: 0.1 });
  tone(ac, { freq: 240, to: 62, dur: 0.44, type: "sine", gain: 0.16, start: 0.02 });
  noise(ac, { start: 0.24, dur: 0.32, gain: 0.17, freq: 150, q: 0.8 }); // baque
  tone(ac, { freq: 96, to: 46, dur: 0.34, type: "sine", gain: 0.18, start: 0.26 });
}

/** Confirmação curta (usada ao ligar o som). */
export function playTick(): void {
  const ac = audio();
  if (!ac) return;
  tone(ac, { freq: 1320, dur: 0.09, type: "sine", gain: 0.12 });
}

/** Fanfarra de vitória: arpejo crescente que sobe e termina com acorde brilhante. */
export function playSuccess(): void {
  if (!isSoundEnabled()) return;
  const ac = audio();
  if (!ac) return;

  // arpejo C5 – E5 – G5 – C6 (crescente)
  tone(ac, { freq: 523.25, dur: 0.18, type: "triangle", gain: 0.18 });
  tone(ac, { freq: 659.25, dur: 0.18, type: "triangle", gain: 0.18, start: 0.11 });
  tone(ac, { freq: 783.99, dur: 0.18, type: "triangle", gain: 0.18, start: 0.22 });
  tone(ac, { freq: 1046.5, dur: 0.5, type: "triangle", gain: 0.18, start: 0.33 });
  // acorde final C major brilhante
  tone(ac, { freq: 523.25, dur: 0.9, type: "sine", gain: 0.08, start: 0.4 });
  tone(ac, { freq: 659.25, dur: 0.9, type: "sine", gain: 0.08, start: 0.4 });
  tone(ac, { freq: 783.99, dur: 0.9, type: "sine", gain: 0.08, start: 0.4 });
  // faísca no ataque final
  noise(ac, { start: 0.36, dur: 0.4, gain: 0.05, freq: 8600, q: 0.6 });
}

/** Comemoração leve para meta batida (sem fanfarra: algo mais sutil). */
export function playCelebrate(): void {
  if (!isSoundEnabled()) return;
  const ac = audio();
  if (!ac) return;

  // dois "pops" alegres, tipo coração batendo de felicidade
  tone(ac, { freq: 880, dur: 0.12, type: "sine", gain: 0.16 });
  tone(ac, { freq: 1174.66, dur: 0.7, type: "sine", gain: 0.14 });
  tone(ac, { freq: 1760, dur: 0.5, type: "sine", gain: 0.05, start: 0.18 });
  noise(ac, { start: 0.02, dur: 0.2, gain: 0.045, freq: 7200, q: 0.7 });
}
