import type { EasingId, OrbConfig, OrbMood, SpringId } from "./types";

export interface MoodMul {
  intensity: number;
  rot: number;
  distortion: number;
  noise: number;
  pulseAmp: number;
  pulseHz: number;
  pulseBias: number;
  hover: number;
}

export const MOOD_MUL: Record<OrbMood, MoodMul> = {
  idle: {
    intensity: 0.96,
    rot: 0.55,
    distortion: 0.9,
    noise: 0.8,
    pulseAmp: 0.008,
    pulseHz: 0.18,
    pulseBias: 0.5,
    hover: 0.12,
  },
  listening: {
    intensity: 1.02,
    rot: 0.72,
    distortion: 1.1,
    noise: 1.0,
    pulseAmp: 0.07,
    pulseHz: 0.32,
    pulseBias: 0.72,
    hover: 0.4,
  },
  thinking: {
    intensity: 1.05,
    rot: 2.35,
    distortion: 1.05,
    noise: 1.3,
    pulseAmp: 0.06,
    pulseHz: 0.32,
    pulseBias: 0.72,
    hover: 0.22,
  },
  speaking: {
    intensity: 1.03,
    rot: 0.68,
    distortion: 0.95,
    noise: 1.0,
    pulseAmp: 0.055,
    pulseHz: 0.22,
    pulseBias: 0.28,
    hover: 0.32,
  },
};

export const EASING_META: { id: EasingId; label: string }[] = [
  { id: "sine", label: "Sine" },
  { id: "linear", label: "Linear" },
  { id: "cubic", label: "Cubic" },
  { id: "quart", label: "Quart" },
  { id: "expo", label: "Expo" },
  { id: "back", label: "Back" },
  { id: "circ", label: "Circ" },
];

export const SPRING_META: { id: SpringId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "smooth", label: "Smooth" },
  { id: "snappy", label: "Snappy" },
  { id: "bouncy", label: "Bouncy" },
  { id: "gentle", label: "Gentle" },
  { id: "wobbly", label: "Wobbly" },
];

export function easeInOut(t: number, kind: EasingId) {
  const x = Math.min(1, Math.max(0, t));
  switch (kind) {
    case "linear":
      return x;
    case "cubic":
      return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    case "quart":
      return x < 0.5 ? 8 * x * x * x * x : 1 - (-2 * x + 2) ** 4 / 2;
    case "expo":
      if (x === 0 || x === 1) return x;
      return x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2;
    case "back": {
      const c1 = 1.70158;
      const c2 = c1 * 1.525;
      return x < 0.5
        ? ((2 * x) ** 2 * ((c2 + 1) * 2 * x - c2)) / 2
        : ((2 * x - 2) ** 2 * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
    }
    case "circ":
      return x < 0.5
        ? (1 - Math.sqrt(1 - (2 * x) ** 2)) / 2
        : (Math.sqrt(1 - (-2 * x + 2) ** 2) + 1) / 2;
    default:
      return 0.5 - 0.5 * Math.cos(x * Math.PI);
  }
}

export function springWave(e: number, kind: SpringId, phase: number) {
  const s = Math.sin(phase);
  switch (kind) {
    case "snappy":
      return e + 0.07 * Math.sin(phase * 2) * (1 - Math.abs(e - 0.5) * 2);
    case "bouncy":
      return e + 0.16 * Math.sin(phase * 3) * s * 0.5 + 0.04;
    case "gentle":
      return e * 0.82 + 0.09;
    case "wobbly":
      return e + 0.2 * Math.sin(phase * 5) * e * (1 - e);
    case "smooth":
      return e * 0.92 + 0.04;
    default:
      return e;
  }
}

export function moodAt(
  time: number,
  mood: OrbMood,
  easing: EasingId = "sine",
  spring: SpringId = "none",
  speed = 1,
) {
  const m = MOOD_MUL[mood];
  const hz = m.pulseHz * Math.max(speed, 0);
  const phase = time * hz * Math.PI * 2;
  const u = time * hz - Math.floor(time * hz);
  const ping = u < 0.5 ? u * 2 : 2 - u * 2;
  let e = easeInOut(ping, easing);
  e = springWave(e, spring, phase);
  e = Math.min(1.15, Math.max(0, e));
  const pulse = 1 + m.pulseAmp * (m.pulseBias + (1 - m.pulseBias) * e);
  return { ...m, pulse, rot: m.rot * Math.max(speed, 0.15) };
}

export function effectiveUniforms(config: OrbConfig, time: number, hover: number) {
  const moodMul = Math.max(config.moodSpeed?.[config.mood] ?? 1, 0);
  const clock = Math.max(config.speed, 0) * moodMul;
  const m = moodAt(time, config.mood, config.easing, config.spring, clock);
  return {
    intensity: config.intensity * m.intensity,
    glow: config.glow,
    bloom: config.bloom,
    scale: config.scale,
    innerRadius: config.innerRadius,
    noiseScale: config.noiseScale,
    noiseSpeed: config.noiseSpeed * m.noise,
    distortion: config.distortion * m.distortion,
    iridescence: config.iridescence,
    pulse: m.pulse,
    hover: Math.max(hover, m.hover * 0.35),
    rotMul: m.rot,
    clock,
  };
}
