import {
  DEFAULT_CONFIG,
  type OrbConfig,
  type OrbMaterial,
  type OrbStyle,
} from "./types";

export interface OrbPreset {
  id: string;
  name: string;
  config: Partial<OrbConfig>;
}

export const PRESETS: OrbPreset[] = [
  {
    id: "lumen",
    name: "Lumen",
    config: {
      style: "volume",
      colorA: "#7ee0ff",
      colorB: "#4f8cff",
      colorC: "#0b1b3a",
      hue: 0,
      intensity: 1,
      glow: 0.42,
      bloom: 0.28,
      innerRadius: 0.42,
      noiseScale: 1.05,
      iridescence: 0.85,
    },
  },
  {
    id: "nova",
    name: "Nova",
    config: {
      style: "halo",
      colorA: "#c4a6ff",
      colorB: "#5ce1ff",
      colorC: "#1a1258",
      hue: 0,
      intensity: 1.04,
      glow: 0.55,
      bloom: 0.34,
      innerRadius: 0.55,
      noiseScale: 0.85,
      iridescence: 0.7,
      rotationSpeed: 0.22,
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    config: {
      style: "plasma",
      colorA: "#7dffc3",
      colorB: "#67e8f9",
      colorC: "#022c22",
      hue: 12,
      intensity: 1.02,
      glow: 0.4,
      bloom: 0.26,
      noiseScale: 1.35,
      noiseSpeed: 0.38,
      iridescence: 1.05,
    },
  },
  {
    id: "ember",
    name: "Ember",
    config: {
      style: "volume",
      colorA: "#ffb56b",
      colorB: "#ff6b4a",
      colorC: "#2a0c08",
      hue: 0,
      intensity: 1.08,
      glow: 0.48,
      bloom: 0.3,
      innerRadius: 0.36,
      noiseScale: 1.05,
      iridescence: 0.55,
    },
  },
  {
    id: "tide",
    name: "Tide",
    config: {
      style: "halo",
      colorA: "#5eead4",
      colorB: "#38bdf8",
      colorC: "#042f2e",
      hue: -8,
      intensity: 0.98,
      glow: 0.44,
      bloom: 0.28,
      innerRadius: 0.5,
      rotationSpeed: 0.16,
    },
  },
  {
    id: "prism",
    name: "Prism",
    config: {
      style: "iris",
      colorA: "#fde68a",
      colorB: "#c4b5fd",
      colorC: "#1e1b4b",
      hue: 0,
      intensity: 1.06,
      glow: 0.38,
      bloom: 0.24,
      innerRadius: 0.62,
      noiseScale: 0.7,
      iridescence: 1.2,
      rotationSpeed: 0.14,
    },
  },
  {
    id: "void",
    name: "Void",
    config: {
      style: "volume",
      colorA: "#e5e7eb",
      colorB: "#93c5fd",
      colorC: "#030712",
      hue: 0,
      intensity: 0.9,
      glow: 0.34,
      bloom: 0.22,
      innerRadius: 0.58,
      noiseScale: 0.9,
      iridescence: 0.95,
    },
  },
  {
    id: "pulse",
    name: "Pulse",
    config: {
      style: "iris",
      colorA: "#fb7185",
      colorB: "#38bdf8",
      colorC: "#111827",
      hue: 0,
      intensity: 1.08,
      glow: 0.46,
      bloom: 0.3,
      innerRadius: 0.48,
      noiseScale: 1.15,
      noiseSpeed: 0.4,
      iridescence: 1.1,
    },
  },
];

export const MATERIALS: {
  id: OrbMaterial;
  label: string;
  blurb: string;
  config: Partial<OrbConfig>;
}[] = [
  {
    id: "energy",
    label: "Energy",
    blurb: "Lit volume",
    config: { material: "energy", grain: 0.05, iridescence: 0.85, splay: 0.22, frost: 0 },
  },
  {
    id: "grain",
    label: "Grain",
    blurb: "Filmic dust",
    config: { material: "grain", grain: 0.08, frost: 0.04 },
  },
  {
    id: "glass",
    label: "Glass",
    blurb: "Clear rim",
    config: { material: "glass", grain: 0.02, iridescence: 1.15, distortion: 0.06, refraction: 0.62, depth: 0.38, frost: 0.04, fresnel: 1.15 },
  },
  {
    id: "frost",
    label: "Frost",
    blurb: "Soft scatter",
    config: { material: "frost", grain: 0.1, iridescence: 0.55, noiseScale: 0.85, frost: 0.72, refraction: 0.28, depth: 0.55 },
  },
  {
    id: "metal",
    label: "Metal",
    blurb: "Hard highlight",
    config: { material: "metal", grain: 0.03, iridescence: 0.4, distortion: 0.04, refraction: 0.18, frost: 0 },
  },
  {
    id: "silk",
    label: "Silk",
    blurb: "Smooth sheen",
    config: { material: "silk", grain: 0.018, iridescence: 1.05, noiseSpeed: 0.22, frost: 0.06, splay: 0.12 },
  },
  {
    id: "liquid",
    label: "Liquid",
    blurb: "Apple glass",
    config: { material: "liquid", grain: 0.012, iridescence: 0.9, distortion: 0.35, aberration: 0.4, refraction: 0.78, depth: 0.52, dispersion: 0.42, frost: 0.08, fresnel: 1.05 },
  },
  {
    id: "dither",
    label: "Dither",
    blurb: "Ordered overlay",
    config: { material: "dither" },
  },
  {
    id: "ascii",
    label: "ASCII",
    blurb: "Glyph print",
    config: {
      material: "ascii",
      grain: 0.02,
      iridescence: 0.35,
      distortion: 0.08,
      noiseScale: 0.85,
      fresnel: 0.7,
    },
  },
];

export const STYLE_META: Record<
  OrbStyle,
  { label: string; blurb: string }
> = {
  volume: { label: "Volume", blurb: "Lit sphere with inner noise" },
  halo: { label: "Halo", blurb: "Energy ring, dark core" },
  plasma: { label: "Plasma", blurb: "Filaments and flow" },
  iris: { label: "Iris", blurb: "Concentric rings" },
};

export const MOOD_META: Record<
  OrbConfig["mood"],
  { label: string; blurb: string }
> = {
  idle: { label: "Idle", blurb: "Slow drift" },
  listening: { label: "Listen", blurb: "Soft size ease" },
  thinking: { label: "Think", blurb: "Breathe, spin faster" },
  speaking: { label: "Speak", blurb: "Soft slow swell" },
};

export const NOISE_META: { id: OrbConfig["noiseAlgo"]; label: string }[] = [
  { id: "simplex", label: "Simplex" },
  { id: "value", label: "Value" },
  { id: "perlin", label: "Perlin" },
  { id: "worley", label: "Worley" },
  { id: "ridged", label: "Ridged" },
  { id: "fbm", label: "FBM" },
];

export function applyPreset(base: OrbConfig, preset: OrbPreset): OrbConfig {
  return { ...base, ...preset.config, mood: base.mood, material: base.material, grain: base.grain };
}

export function applyMaterial(base: OrbConfig, id: OrbMaterial): OrbConfig {
  const mat = MATERIALS.find((m) => m.id === id);
  if (!mat) return base;
  return { ...base, ...mat.config, material: id };
}

export function randomizeColors(): Pick<OrbConfig, "colorA" | "colorB" | "colorC"> {
  const palettes = PRESETS.map((p) => ({
    colorA: p.config.colorA ?? DEFAULT_CONFIG.colorA,
    colorB: p.config.colorB ?? DEFAULT_CONFIG.colorB,
    colorC: p.config.colorC ?? DEFAULT_CONFIG.colorC,
  }));
  return palettes[Math.floor(Math.random() * palettes.length)]!;
}

function r(min: number, max: number, step = 0.01) {
  const n = min + Math.random() * (max - min);
  const inv = 1 / step;
  return Math.round(n * inv) / inv;
}

export function randomizeShape(): Pick<
  OrbConfig,
  "glow" | "bloom" | "aberration" | "innerRadius" | "grain"
> {
  return {
    glow: r(0.22, 1.15),
    bloom: r(0.12, 0.68),
    aberration: r(0.08, 0.85),
    innerRadius: r(0.2, 0.7),
    grain: r(0, 0.1, 0.005),
  };
}

export function randomizeGlass(): Pick<
  OrbConfig,
  "refraction" | "depth" | "dispersion" | "frost" | "splay" | "fresnel"
> {
  return {
    refraction: r(0.12, 1.05),
    depth: r(0.18, 0.72),
    dispersion: r(0.06, 0.72),
    frost: r(0, 0.42),
    splay: r(0.04, 0.62),
    fresnel: r(0.45, 1.45),
  };
}

export function randomizeMotion(): Pick<
  OrbConfig,
  "speed" | "rotationSpeed" | "noiseScale" | "noiseSpeed" | "distortion" | "iridescence"
> {
  return {
    speed: r(0.45, 1.7),
    rotationSpeed: r(-0.42, 0.52),
    noiseScale: r(0.55, 2.05),
    noiseSpeed: r(0.12, 0.82),
    distortion: r(0.1, 0.82),
    iridescence: r(0.42, 1.22),
  };
}

export function randomizeLook(): Partial<OrbConfig> {
  const styles: OrbStyle[] = ["volume", "halo", "plasma", "iris"];
  const mats = MATERIALS.map((m) => m.id);
  const noises = NOISE_META.map((n) => n.id);
  return {
    ...randomizeColors(),
    ...randomizeShape(),
    ...randomizeGlass(),
    ...randomizeMotion(),
    style: styles[Math.floor(Math.random() * styles.length)],
    material: mats[Math.floor(Math.random() * mats.length)],
    noiseAlgo: noises[Math.floor(Math.random() * noises.length)],
    hue: Math.round((Math.random() - 0.5) * 48),
    intensity: r(0.72, 1.55),
    matAmount: r(0.55, 1.25),
  };
}
