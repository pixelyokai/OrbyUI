export const ORB_STYLES = ["volume", "halo", "plasma", "iris"] as const;
export type OrbStyle = (typeof ORB_STYLES)[number];

export const ORB_MOODS = ["idle", "listening", "thinking", "speaking"] as const;
export type OrbMood = (typeof ORB_MOODS)[number];

export const ORB_MATERIALS = ["energy", "grain", "glass", "frost", "metal", "silk", "liquid", "dither", "ascii"] as const;
export type OrbMaterial = (typeof ORB_MATERIALS)[number];

export const NOISE_ALGOS = ["simplex", "value", "perlin", "worley", "ridged", "fbm"] as const;
export type NoiseAlgo = (typeof NOISE_ALGOS)[number];

export const EASINGS = ["sine", "linear", "cubic", "quart", "expo", "back", "circ"] as const;
export type EasingId = (typeof EASINGS)[number];

export const SPRINGS = ["none", "smooth", "snappy", "bouncy", "gentle", "wobbly"] as const;
export type SpringId = (typeof SPRINGS)[number];

export const STYLE_INDEX: Record<OrbStyle, number> = {
  volume: 0,
  halo: 1,
  plasma: 2,
  iris: 3,
};

export const MATERIAL_INDEX: Record<OrbMaterial, number> = {
  energy: 0,
  grain: 1,
  glass: 2,
  frost: 3,
  metal: 4,
  silk: 5,
  liquid: 6,
  dither: 7,
  ascii: 8,
};

export const NOISE_INDEX: Record<NoiseAlgo, number> = {
  simplex: 0,
  value: 1,
  perlin: 2,
  worley: 3,
  ridged: 4,
  fbm: 5,
};

export interface OrbConfig {
  style: OrbStyle;
  material: OrbMaterial;
  light: string;
  body: string;
  core: string;
  background: string;
  hue: number;
  intensity: number;
  glow: number;
  bloom: number;
  scale: number;
  innerRadius: number;
  noiseScale: number;
  noiseSpeed: number;
  rotationSpeed: number;
  distortion: number;
  iridescence: number;
  grain: number;
  aberration: number;
  refraction: number;
  depth: number;
  dispersion: number;
  frost: number;
  splay: number;
  speed: number;
  fresnel: number;
  matAmount: number;
  noiseAlgo: NoiseAlgo;
  easing: EasingId;
  spring: SpringId;
  moodSpeed: Record<OrbMood, number>;
  interactivity: boolean;
  mood: OrbMood;
}

export const DEFAULT_MOOD_SPEED: Record<OrbMood, number> = {
  idle: 1,
  listening: 1,
  thinking: 1.15,
  speaking: 1,
};

export const DEFAULT_CONFIG: OrbConfig = {
  style: "volume",
  material: "energy",
  light: "#7ee0ff",
  body: "#4f8cff",
  core: "#0b1b3a",
  background: "#08080a",
  hue: 0,
  intensity: 1,
  glow: 0.55,
  bloom: 0.4,
  scale: 0.5,
  innerRadius: 0.42,
  noiseScale: 1.05,
  noiseSpeed: 0.32,
  rotationSpeed: 0.18,
  distortion: 0.42,
  iridescence: 0.85,
  grain: 0.03,
  aberration: 0.45,
  refraction: 0.42,
  depth: 0.4,
  dispersion: 0.28,
  frost: 0,
  splay: 0.18,
  speed: 1,
  fresnel: 0.85,
  matAmount: 1,
  noiseAlgo: "simplex",
  easing: "sine",
  spring: "smooth",
  moodSpeed: { ...DEFAULT_MOOD_SPEED },
  interactivity: true,
  mood: "idle",
};

export function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function asHex(v: unknown, fallback: string) {
  return typeof v === "string" && HEX_RE.test(v.trim()) ? v.trim() : fallback;
}

function asNum(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

function asBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Drop unknown keys / invalid enums from persisted or user config. */
export function sanitizeConfig(raw: unknown): OrbConfig {
  const p = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const msRaw =
    p.moodSpeed && typeof p.moodSpeed === "object" && !Array.isArray(p.moodSpeed)
      ? (p.moodSpeed as Record<string, unknown>)
      : {};
  return {
    style: asEnum(p.style, ORB_STYLES, DEFAULT_CONFIG.style),
    material: asEnum(
      p.material === "crystallize" || p.material === "fractal" || p.material === "voxel"
        ? "ascii"
        : p.material,
      ORB_MATERIALS,
      DEFAULT_CONFIG.material,
    ),
    // `colorA/B/C` are the pre-rename key names; still read so a config saved
    // before the rename keeps its palette instead of silently resetting.
    light: asHex(p.light ?? p.colorA, DEFAULT_CONFIG.light),
    body: asHex(p.body ?? p.colorB, DEFAULT_CONFIG.body),
    core: asHex(p.core ?? p.colorC, DEFAULT_CONFIG.core),
    background: asHex(p.background, DEFAULT_CONFIG.background),
    hue: asNum(p.hue, DEFAULT_CONFIG.hue, -180, 180),
    intensity: asNum(p.intensity, DEFAULT_CONFIG.intensity, 0, 3),
    glow: asNum(p.glow, DEFAULT_CONFIG.glow, 0, 3),
    bloom: asNum(p.bloom, DEFAULT_CONFIG.bloom, 0, 2),
    scale: asNum(p.scale, DEFAULT_CONFIG.scale, 0.2, 2),
    innerRadius: asNum(p.innerRadius, DEFAULT_CONFIG.innerRadius, 0, 1),
    noiseScale: asNum(p.noiseScale, DEFAULT_CONFIG.noiseScale, 0.1, 4),
    noiseSpeed: asNum(p.noiseSpeed, DEFAULT_CONFIG.noiseSpeed, 0, 4),
    rotationSpeed: asNum(p.rotationSpeed, DEFAULT_CONFIG.rotationSpeed, -3, 3),
    distortion: asNum(p.distortion, DEFAULT_CONFIG.distortion, 0, 2),
    iridescence: asNum(p.iridescence, DEFAULT_CONFIG.iridescence, 0, 2),
    grain: asNum(p.grain, DEFAULT_CONFIG.grain, 0, 0.5),
    aberration: asNum(p.aberration, DEFAULT_CONFIG.aberration, 0, 2),
    refraction: asNum(p.refraction, DEFAULT_CONFIG.refraction, 0, 2),
    depth: asNum(p.depth, DEFAULT_CONFIG.depth, 0, 1),
    dispersion: asNum(p.dispersion, DEFAULT_CONFIG.dispersion, 0, 2),
    frost: asNum(p.frost, DEFAULT_CONFIG.frost, 0, 1),
    splay: asNum(p.splay, DEFAULT_CONFIG.splay, 0, 2),
    speed: asNum(p.speed, DEFAULT_CONFIG.speed, 0, 3),
    fresnel: asNum(p.fresnel, DEFAULT_CONFIG.fresnel, 0, 2),
    matAmount: asNum(p.matAmount, DEFAULT_CONFIG.matAmount, 0, 2),
    noiseAlgo: asEnum(p.noiseAlgo, NOISE_ALGOS, DEFAULT_CONFIG.noiseAlgo),
    easing: asEnum(p.easing, EASINGS, DEFAULT_CONFIG.easing),
    spring: asEnum(p.spring, SPRINGS, DEFAULT_CONFIG.spring),
    moodSpeed: {
      idle: asNum(msRaw.idle, DEFAULT_MOOD_SPEED.idle, 0, 3),
      listening: asNum(msRaw.listening, DEFAULT_MOOD_SPEED.listening, 0, 3),
      thinking: asNum(msRaw.thinking, DEFAULT_MOOD_SPEED.thinking, 0, 3),
      speaking: asNum(msRaw.speaking, DEFAULT_MOOD_SPEED.speaking, 0, 3),
    },
    interactivity: asBool(p.interactivity, DEFAULT_CONFIG.interactivity),
    mood: asEnum(p.mood, ORB_MOODS, DEFAULT_CONFIG.mood),
  };
}
