import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moodAt, effectiveUniforms } from "./mood.ts";
import { DEFAULT_CONFIG, hexToRgb, sanitizeConfig } from "./types.ts";
describe("hexToRgb", () => {
  it("parses 6-digit hex", () => {
    assert.deepEqual(hexToRgb("#ff0000"), [1, 0, 0]);
  });
  it("parses 3-digit hex", () => {
    assert.deepEqual(hexToRgb("#0f0"), [0, 1, 0]);
  });
  it("falls back on garbage", () => {
    assert.deepEqual(hexToRgb("nope"), [1, 1, 1]);
  });
});

describe("sanitizeConfig", () => {
  it("drops unknown keys and invalid enums", () => {
    const cfg = sanitizeConfig(
      JSON.parse('{"style":"not-a-style","material":"dither","light":"red","mood":"speaking","extra":"x"}'),
    );
    assert.equal(cfg.style, "volume");
    assert.equal(cfg.material, "dither");
    assert.equal(cfg.light, "#7ee0ff");
    assert.equal(cfg.mood, "speaking");
    assert.equal("extra" in cfg, false);
  });
  it("maps legacy crystallize, fractal, and voxel materials to ascii", () => {
    assert.equal(sanitizeConfig({ material: "crystallize" }).material, "ascii");
    assert.equal(sanitizeConfig({ material: "fractal" }).material, "ascii");
    assert.equal(sanitizeConfig({ material: "voxel" }).material, "ascii");
  });
  it("clamps numbers", () => {
    const cfg = sanitizeConfig({ scale: 99, grain: -1, matAmount: 0.2 });
    assert.equal(cfg.scale, 2);
    assert.equal(cfg.grain, 0);
    assert.equal(cfg.matAmount, 0.2);
  });
});

describe("scale lock", () => {
  it("defaults to 0.5", () => {
    assert.equal(DEFAULT_CONFIG.scale, 0.5);
    assert.equal(sanitizeConfig({}).scale, 0.5);
  });
});

describe("moodAt", () => {
  it("returns a pulse near 1", () => {
    const m = moodAt(0, "idle", "sine", "none", 1);
    assert.ok(m.pulse > 0.9 && m.pulse < 1.2);
  });
  it("speak pulse is larger than idle at peak", () => {
    const idle = moodAt(1 / 0.18 / 2, "idle", "sine", "none", 1);
    const speak = moodAt(1 / 0.22 / 2, "speaking", "sine", "none", 1);
    assert.ok(speak.pulse >= idle.pulse);
  });
});

describe("speed clock", () => {
  it("multiplies master speed by the active mood tempo", () => {
    const a = effectiveUniforms({ ...DEFAULT_CONFIG, speed: 1, mood: "idle", moodSpeed: { ...DEFAULT_CONFIG.moodSpeed, idle: 1 } }, 0, 0);
    const b = effectiveUniforms({ ...DEFAULT_CONFIG, speed: 2, mood: "idle", moodSpeed: { ...DEFAULT_CONFIG.moodSpeed, idle: 0.5 } }, 0, 0);
    assert.equal(a.clock, 1);
    assert.equal(b.clock, 1);
  });
});
