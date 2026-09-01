import { create } from "zustand";
import {
  applyMaterial,
  applyPreset,
  PRESETS,
  randomizeColors,
  randomizeGlass as rollGlass,
  randomizeLook,
  randomizeMotion as rollMotion,
  randomizeShape as rollShape,
} from "./presets";
import {
  DEFAULT_CONFIG,
  ORB_MOODS,
  sanitizeConfig,
  type OrbConfig,
  type OrbMaterial,
  type OrbMood,
} from "./types";

const STORAGE_KEY = "orbyui-orb-v14";
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const COLOR_KEYS = ["light", "body", "core", "background"] as const;

function loadStored(): OrbConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeConfig(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function persist(config: OrbConfig) {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(sanitizeConfig(config));
    if (json.length > 12_000) return;
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* ignore quota */
  }
}

let persistTimer: number | null = null;
let persistQueued: OrbConfig | null = null;

function persistSoon(config: OrbConfig) {
  persistQueued = config;
  if (typeof window === "undefined") return;
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    if (persistQueued) persist(persistQueued);
  }, 240);
}

function persistNow(config: OrbConfig) {
  persistQueued = null;
  if (persistTimer != null && typeof window !== "undefined") {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  persist(config);
}

function mergePatch(base: OrbConfig, partial: Partial<OrbConfig>): OrbConfig {
  const nextPartial = partial.moodSpeed
    ? { ...partial, moodSpeed: { ...base.moodSpeed, ...partial.moodSpeed } }
    : partial;
  const keys = Object.keys(nextPartial);
  const colorOnly =
    keys.length > 0 && keys.every((k) => (COLOR_KEYS as readonly string[]).includes(k));
  if (colorOnly) {
    const next = { ...base };
    for (const k of COLOR_KEYS) {
      const v = nextPartial[k];
      if (typeof v === "string" && HEX_RE.test(v.trim())) next[k] = v.trim();
    }
    return next;
  }
  return sanitizeConfig({ ...base, ...nextPartial });
}

interface OrbState {
  config: OrbConfig;
  hydrated: boolean;
  previewReady: boolean;
  setPreviewReady: (ready: boolean) => void;
  hydrate: () => void;
  patch: (partial: Partial<OrbConfig>) => void;
  patchLive: (partial: Partial<OrbConfig>) => void;
  applyPresetId: (id: string) => void;
  applyMaterialId: (id: OrbMaterial) => void;
  setMood: (mood: OrbMood) => void;
  cycleMood: () => void;
  randomize: () => void;
  randomizePalette: () => void;
  randomizeShape: () => void;
  randomizeGlass: () => void;
  randomizeMotion: () => void;
  reset: () => void;
}

let liveRaf = 0;
let livePartial: Partial<OrbConfig> | null = null;

let persistFlushBound = false;

function bindPersistFlush() {
  if (persistFlushBound || typeof window === "undefined") return;
  persistFlushBound = true;
  const flush = () => {
    if (persistQueued) persistNow(persistQueued);
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export const useOrbStore = create<OrbState>((set, get) => ({
  config: DEFAULT_CONFIG,
  hydrated: false,
  previewReady: false,
  setPreviewReady: (previewReady) => set({ previewReady }),
  hydrate: () => {
    bindPersistFlush();
    if (get().hydrated) return;
    const stored = loadStored();
    set({ config: stored ?? DEFAULT_CONFIG, hydrated: true });
  },
  patch: (partial) => {
    const config = mergePatch(get().config, partial);
    persistSoon(config);
    set({ config });
  },
  patchLive: (partial) => {
    livePartial = { ...livePartial, ...partial };
    if (liveRaf) return;
    const apply = () => {
      liveRaf = 0;
      const pending = livePartial;
      livePartial = null;
      if (!pending) return;
      const config = mergePatch(get().config, pending);
      persistSoon(config);
      set({ config });
    };
    if (typeof window === "undefined") {
      apply();
      return;
    }
    liveRaf = window.requestAnimationFrame(apply);
  },
  applyPresetId: (id) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const config = sanitizeConfig(applyPreset(get().config, preset));
    persistSoon(config);
    set({ config });
  },
  applyMaterialId: (id) => {
    const config = sanitizeConfig(applyMaterial(get().config, id));
    persistSoon(config);
    set({ config });
  },
  setMood: (mood) => get().patch({ mood }),
  cycleMood: () => {
    const i = ORB_MOODS.indexOf(get().config.mood);
    const next = ORB_MOODS[(i + 1) % ORB_MOODS.length]!;
    get().patch({ mood: next });
  },
  randomize: () => {
    get().patch(randomizeLook());
  },
  randomizePalette: () => {
    const colors = randomizeColors();
    get().patch({ ...colors, hue: Math.round((Math.random() - 0.5) * 48) });
  },
  randomizeShape: () => get().patch(rollShape()),
  randomizeGlass: () => get().patch(rollGlass()),
  randomizeMotion: () => get().patch(rollMotion()),
  reset: () => {
    const config = sanitizeConfig({ ...DEFAULT_CONFIG, moodSpeed: { ...DEFAULT_CONFIG.moodSpeed } });
    persistNow(config);
    set({ config });
  },
}));
