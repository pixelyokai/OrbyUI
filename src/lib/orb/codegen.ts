import { MOOD_MUL } from "./mood";
import { BLUR_SRC, COMP_SRC, FRAG_SRC, VERT_SRC } from "./shaders";
import { MATERIAL_INDEX, NOISE_INDEX, STYLE_INDEX, sanitizeConfig, type OrbConfig } from "./types";

function lit(config: OrbConfig) {
  return `{
  style: ${JSON.stringify(config.style)},
  material: ${JSON.stringify(config.material)},
  light: ${JSON.stringify(config.light)},
  body: ${JSON.stringify(config.body)},
  core: ${JSON.stringify(config.core)},
  background: ${JSON.stringify(config.background)},
  hue: ${config.hue},
  intensity: ${config.intensity},
  glow: ${config.glow},
  bloom: ${config.bloom},
  scale: ${config.scale},
  innerRadius: ${config.innerRadius},
  noiseScale: ${config.noiseScale},
  noiseSpeed: ${config.noiseSpeed},
  rotationSpeed: ${config.rotationSpeed},
  distortion: ${config.distortion},
  iridescence: ${config.iridescence},
  grain: ${config.grain},
  aberration: ${config.aberration},
  refraction: ${config.refraction},
  depth: ${config.depth},
  dispersion: ${config.dispersion},
  frost: ${config.frost},
  splay: ${config.splay},
  speed: ${config.speed},
  fresnel: ${config.fresnel},
  matAmount: ${config.matAmount},
  noiseAlgo: ${JSON.stringify(config.noiseAlgo)},
  easing: ${JSON.stringify(config.easing)},
  spring: ${JSON.stringify(config.spring)},
  moodSpeed: ${JSON.stringify(config.moodSpeed)},
  interactivity: ${config.interactivity},
  mood: ${JSON.stringify(config.mood)},
}`;
}

const RUNTIME = `const VERT = ${JSON.stringify(VERT_SRC)};
const FRAG = ${JSON.stringify(FRAG_SRC)};
const BLUR = ${JSON.stringify(BLUR_SRC)};
const COMP = ${JSON.stringify(COMP_SRC)};
const STYLE_INDEX = ${JSON.stringify(STYLE_INDEX)};
const MATERIAL_INDEX = ${JSON.stringify(MATERIAL_INDEX)};
const NOISE_INDEX = ${JSON.stringify(NOISE_INDEX)};
const MOOD_MUL = ${JSON.stringify(MOOD_MUL)};

function easePulse(t, kind, spring) {
  var x = t < 0 ? 0 : t > 1 ? 1 : t;
  var e;
  if (kind === "linear") e = x;
  else if (kind === "cubic") e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  else if (kind === "quart") e = x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
  else if (kind === "expo") e = x === 0 || x === 1 ? x : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
  else if (kind === "back") {
    var c2 = 1.70158 * 1.525;
    e = x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  } else if (kind === "circ") e = x < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
  else e = 0.5 - 0.5 * Math.cos(x * Math.PI);
  var phase = t * Math.PI * 2;
  if (spring === "snappy") e += 0.07 * Math.sin(phase * 2) * (1 - Math.abs(e - 0.5) * 2);
  else if (spring === "bouncy") e += 0.16 * Math.sin(phase * 3) * Math.sin(phase) * 0.5 + 0.04;
  else if (spring === "gentle") e = e * 0.82 + 0.09;
  else if (spring === "wobbly") e += 0.2 * Math.sin(phase * 5) * e * (1 - e);
  else if (spring === "smooth") e = e * 0.92 + 0.04;
  if (e < 0) e = 0;
  if (e > 1.15) e = 1.15;
  return e;
}

function hexToRgb(hex) {
  const raw = String(hex).replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

var HEX_OK = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
var STYLE_OK = { volume:1, halo:1, plasma:1, iris:1 };
var MAT_OK = { energy:1, grain:1, glass:1, frost:1, metal:1, silk:1, liquid:1, dither:1, ascii:1 };
var MOOD_OK = { idle:1, listening:1, thinking:1, speaking:1 };
var NOISE_OK = { simplex:1, value:1, perlin:1, worley:1, ridged:1, fbm:1 };
var EASE_OK = { sine:1, linear:1, cubic:1, quart:1, expo:1, back:1, circ:1 };
var SPRING_OK = { none:1, smooth:1, snappy:1, bouncy:1, gentle:1, wobbly:1 };
function clampNum(v, d, lo, hi) {
  var n = typeof v === "number" ? v : Number(v);
  if (!isFinite(n)) return d;
  return Math.min(hi, Math.max(lo, n));
}
function applyPartial(cfg, partial) {
  if (!partial || typeof partial !== "object") return;
  var next;
  try { next = JSON.parse(JSON.stringify(partial)); } catch (e) { return; }
  if (next.style && STYLE_OK[next.style]) cfg.style = next.style;
  if (next.material === "crystallize" || next.material === "fractal" || next.material === "voxel") next.material = "ascii";
  if (next.material && MAT_OK[next.material]) cfg.material = next.material;
  if (next.mood && MOOD_OK[next.mood]) cfg.mood = next.mood;
  if (next.noiseAlgo && NOISE_OK[next.noiseAlgo]) cfg.noiseAlgo = next.noiseAlgo;
  if (next.easing && EASE_OK[next.easing]) cfg.easing = next.easing;
  if (next.spring && SPRING_OK[next.spring]) cfg.spring = next.spring;
  ["light","body","core","background"].forEach(function (k) {
    if (typeof next[k] === "string" && HEX_OK.test(next[k])) cfg[k] = next[k];
  });
  if (typeof next.interactivity === "boolean") cfg.interactivity = next.interactivity;
  cfg.hue = next.hue != null ? clampNum(next.hue, cfg.hue, -180, 180) : cfg.hue;
  cfg.intensity = next.intensity != null ? clampNum(next.intensity, cfg.intensity, 0, 3) : cfg.intensity;
  cfg.glow = next.glow != null ? clampNum(next.glow, cfg.glow, 0, 3) : cfg.glow;
  cfg.bloom = next.bloom != null ? clampNum(next.bloom, cfg.bloom, 0, 2) : cfg.bloom;
  cfg.scale = next.scale != null ? clampNum(next.scale, cfg.scale, 0.2, 2) : cfg.scale;
  cfg.innerRadius = next.innerRadius != null ? clampNum(next.innerRadius, cfg.innerRadius, 0, 1) : cfg.innerRadius;
  cfg.noiseScale = next.noiseScale != null ? clampNum(next.noiseScale, cfg.noiseScale, 0.1, 4) : cfg.noiseScale;
  cfg.noiseSpeed = next.noiseSpeed != null ? clampNum(next.noiseSpeed, cfg.noiseSpeed, 0, 4) : cfg.noiseSpeed;
  cfg.rotationSpeed = next.rotationSpeed != null ? clampNum(next.rotationSpeed, cfg.rotationSpeed, -3, 3) : cfg.rotationSpeed;
  cfg.distortion = next.distortion != null ? clampNum(next.distortion, cfg.distortion, 0, 2) : cfg.distortion;
  cfg.iridescence = next.iridescence != null ? clampNum(next.iridescence, cfg.iridescence, 0, 2) : cfg.iridescence;
  cfg.grain = next.grain != null ? clampNum(next.grain, cfg.grain, 0, 0.5) : cfg.grain;
  cfg.aberration = next.aberration != null ? clampNum(next.aberration, cfg.aberration, 0, 2) : cfg.aberration;
  cfg.refraction = next.refraction != null ? clampNum(next.refraction, cfg.refraction, 0, 2) : cfg.refraction;
  cfg.depth = next.depth != null ? clampNum(next.depth, cfg.depth, 0, 1) : cfg.depth;
  cfg.dispersion = next.dispersion != null ? clampNum(next.dispersion, cfg.dispersion, 0, 2) : cfg.dispersion;
  cfg.frost = next.frost != null ? clampNum(next.frost, cfg.frost, 0, 1) : cfg.frost;
  cfg.splay = next.splay != null ? clampNum(next.splay, cfg.splay, 0, 2) : cfg.splay;
  cfg.speed = next.speed != null ? clampNum(next.speed, cfg.speed, 0, 3) : cfg.speed;
  cfg.fresnel = next.fresnel != null ? clampNum(next.fresnel, cfg.fresnel, 0, 2) : cfg.fresnel;
  cfg.matAmount = next.matAmount != null ? clampNum(next.matAmount, cfg.matAmount, 0, 2) : cfg.matAmount;
}

var __orbyLive = 0;

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
  }
  return shader;
}

function link(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "program link failed");
  }
  return program;
}

function makeTarget(gl, w, h) {
  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  if (!ok) return null;
  return { fbo, tex, w, h };
}

export function createOrbyUI(el, options) {
  if (!el) throw new Error("mount element required");
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  el.appendChild(canvas);

  const config = Object.assign({
    style: "volume", material: "energy", light: "#7ee0ff", body: "#4f8cff", core: "#0b1b3a",
    background: "#08080a", hue: 0, intensity: 1,
    glow: 0.55, bloom: 0.4, scale: 0.5, innerRadius: 0.42, noiseScale: 1.05,
    noiseSpeed: 0.32, rotationSpeed: 0.18, distortion: 0.42, iridescence: 0.85,
    grain: 0.03, aberration: 0.45, refraction: 0.42, depth: 0.4, dispersion: 0.28,
    frost: 0, splay: 0.18, speed: 1, fresnel: 0.85, matAmount: 1, noiseAlgo: "simplex",
    easing: "sine", spring: "smooth",
    moodSpeed: { idle: 1, listening: 1, thinking: 1.15, speaking: 1 },
    interactivity: true, mood: "idle",
  }, options || {});

  function cssFallback() {
    canvas.remove();
    const fb = document.createElement("div");
    fb.setAttribute("aria-label", "AI orb");
    fb.style.width = "42%";
    fb.style.height = "42%";
    fb.style.margin = "auto";
    fb.style.borderRadius = "50%";
    fb.style.background = "radial-gradient(circle at 35% 32%, " + (HEX_OK.test(config.light) ? config.light : "#7ee0ff") + ", " + (HEX_OK.test(config.body) ? config.body : "#4f8cff") + " 50%, " + (HEX_OK.test(config.core) ? config.core : "#0b1b3a") + " 78%)";
    el.appendChild(fb);
    return {
      setMood: function () {},
      setConfig: function () {},
      capture: function () { return null; },
      destroy: function () { fb.remove(); },
    };
  }

  const opts = { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false };
  const gl = canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts);
  if (!gl) return cssFallback();

  let orbProg, blurProg, compProg;
  try {
    orbProg = link(gl, VERT, FRAG);
    blurProg = link(gl, VERT, BLUR);
    compProg = link(gl, VERT, COMP);
  } catch (err) {
    return cssFallback();
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const attrib = gl.getAttribLocation(orbProg, "position");
  function bindAttrib() {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(attrib);
    gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
  }
  __orbyLive += 1;

  const loc = {};
  [
    "uResolution","uTime","uColorA","uColorB","uColorC","uHue",
    "uIntensity","uGlow","uBloom","uScale","uInnerRadius","uNoiseScale","uNoiseSpeed",
    "uRot","uDistortion","uIridescence","uMouse","uHover","uStyle","uPulse","uGrain","uMaterial","uMatAmt","uAberration","uRefraction","uDepth","uDispersion","uFrost","uSplay","uSpeed","uFresnel","uNoiseType","uFluid","uHasFluid",
  ].forEach((n) => { loc[n] = gl.getUniformLocation(orbProg, n); });
  const bLoc = {
    uTex: gl.getUniformLocation(blurProg, "uTex"),
    uOutRes: gl.getUniformLocation(blurProg, "uOutRes"),
    uDir: gl.getUniformLocation(blurProg, "uDir"),
    uThresh: gl.getUniformLocation(blurProg, "uThresh"),
  };
  const cLoc = {
    uScene: gl.getUniformLocation(compProg, "uScene"),
    uBloom: gl.getUniformLocation(compProg, "uBloom"),
    uResolution: gl.getUniformLocation(compProg, "uResolution"),
    uBg: gl.getUniformLocation(compProg, "uBg"),
    uTransparent: gl.getUniformLocation(compProg, "uTransparent"),
    uBloomAmt: gl.getUniformLocation(compProg, "uBloomAmt"),
    uAberration: gl.getUniformLocation(compProg, "uAberration"),
  };

  const dummy = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, dummy);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));

  let dyeTex = dummy;
  let hasFluid = 0;
  let fluidStep = function () {};
  let fluidDestroy = function () {};
  (function setupFluid() {
    if (__orbyLive > 4) return;
    const is2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    if (!is2) return;
    const n = (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) ? 64 : 96;
    const gl2 = gl;
    gl2.getExtension("EXT_color_buffer_float");
    gl2.getExtension("EXT_color_buffer_half_float");
    function mk() {
      const tex = gl2.createTexture();
      const fbo = gl2.createFramebuffer();
      gl2.bindTexture(gl2.TEXTURE_2D, tex);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, gl2.LINEAR);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MAG_FILTER, gl2.LINEAR);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
      gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA16F, n, n, 0, gl2.RGBA, gl2.HALF_FLOAT, null);
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, fbo);
      gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, tex, 0);
      const ok = gl2.checkFramebufferStatus(gl2.FRAMEBUFFER) === gl2.FRAMEBUFFER_COMPLETE;
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
      if (!ok) { gl2.deleteTexture(tex); gl2.deleteFramebuffer(fbo); return null; }
      return { tex: tex, fbo: fbo };
    }
    const dyeA = mk();
    const dyeB = mk();
    if (!dyeA || !dyeB) return;
    const advSrc = "precision highp float;uniform sampler2D uSrc,uVel;uniform vec2 uRes;uniform float uDt,uDiss;void main(){vec2 uv=gl_FragCoord.xy/uRes;vec2 vel=texture2D(uVel,uv).xy;gl_FragColor=texture2D(uSrc,clamp(uv-vel*uDt*0.14,0.002,0.998))*uDiss;}";
    const splSrc = "precision highp float;uniform sampler2D uTarget;uniform vec2 uRes,uPoint;uniform vec3 uValue;uniform float uRadius,uIsDye;void main(){vec2 uv=gl_FragCoord.xy/uRes;vec4 base=texture2D(uTarget,uv);float g=exp(-distance(uv,uPoint)*distance(uv,uPoint)/max(uRadius,0.0001));gl_FragColor=uIsDye>0.5?vec4(mix(base.rgb,uValue,clamp(g,0.0,1.0)),1.0):vec4(base.xy+uValue.xy*g,0.0,1.0);}";
    let adv, spl;
    try { adv = link(gl2, VERT, advSrc); spl = link(gl2, VERT, splSrc); } catch (e) { return; }
    const splLoc = {
      uTarget: gl2.getUniformLocation(spl, "uTarget"),
      uRes: gl2.getUniformLocation(spl, "uRes"),
      uPoint: gl2.getUniformLocation(spl, "uPoint"),
      uValue: gl2.getUniformLocation(spl, "uValue"),
      uRadius: gl2.getUniformLocation(spl, "uRadius"),
      uIsDye: gl2.getUniformLocation(spl, "uIsDye"),
    };
    const advLoc = {
      uSrc: gl2.getUniformLocation(adv, "uSrc"),
      uVel: gl2.getUniformLocation(adv, "uVel"),
      uRes: gl2.getUniformLocation(adv, "uRes"),
      uDt: gl2.getUniformLocation(adv, "uDt"),
      uDiss: gl2.getUniformLocation(adv, "uDiss"),
    };
    let a = dyeA, b = dyeB, t = 0;
    dyeTex = a.tex;
    hasFluid = 1;
    fluidStep = function (dt, speed) {
      t += dt;
      const swirl = t * 0.2 * (0.45 + speed * 0.55);
      function splat(px, py, fx, fy, rgb, radius, isDye) {
        gl2.useProgram(spl);
        bindAttrib();
        gl2.activeTexture(gl2.TEXTURE0);
        gl2.bindTexture(gl2.TEXTURE_2D, a.tex);
        gl2.uniform1i(splLoc.uTarget, 0);
        gl2.uniform2f(splLoc.uRes, n, n);
        gl2.uniform2f(splLoc.uPoint, px, py);
        if (isDye) gl2.uniform3f(splLoc.uValue, rgb[0], rgb[1], rgb[2]);
        else gl2.uniform3f(splLoc.uValue, fx, fy, 0);
        gl2.uniform1f(splLoc.uRadius, radius);
        gl2.uniform1f(splLoc.uIsDye, isDye ? 1 : 0);
        gl2.bindFramebuffer(gl2.FRAMEBUFFER, b.fbo);
        gl2.viewport(0, 0, n, n);
        gl2.drawArrays(gl2.TRIANGLES, 0, 3);
        const tmp = a; a = b; b = tmp;
      }
      const px = 0.5 + Math.cos(swirl) * 0.2;
      const py = 0.5 + Math.sin(swirl * 0.9) * 0.2;
      splat(px, py, -Math.sin(swirl) * 0.08, Math.cos(swirl) * 0.08, hexToRgb(config.light), 0.02, 0);
      splat(px, py, 0, 0, hexToRgb(config.light), 0.02, 1);
      gl2.useProgram(adv);
      bindAttrib();
      gl2.activeTexture(gl2.TEXTURE0);
      gl2.bindTexture(gl2.TEXTURE_2D, a.tex);
      gl2.uniform1i(advLoc.uSrc, 0);
      gl2.activeTexture(gl2.TEXTURE1);
      gl2.bindTexture(gl2.TEXTURE_2D, a.tex);
      gl2.uniform1i(advLoc.uVel, 1);
      gl2.uniform2f(advLoc.uRes, n, n);
      gl2.uniform1f(advLoc.uDt, dt);
      gl2.uniform1f(advLoc.uDiss, 0.996);
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, b.fbo);
      gl2.viewport(0, 0, n, n);
      gl2.drawArrays(gl2.TRIANGLES, 0, 3);
      const tmp = a; a = b; b = tmp;
      dyeTex = a.tex;
    };
    fluidDestroy = function () {
      gl2.deleteTexture(dyeA.tex); gl2.deleteFramebuffer(dyeA.fbo);
      gl2.deleteTexture(dyeB.tex); gl2.deleteFramebuffer(dyeB.fbo);
      gl2.deleteProgram(adv); gl2.deleteProgram(spl);
    };
  })();

  let scene = null, bloomA = null, bloomB = null, post = true, resizeQueued = false;
  let time = 0, rot = 0, hover = 0, targetHover = 0, last = 0, raf = 0, running = true;
  const mouse = { x: 0, y: 0 };
  const targetMouse = { x: 0, y: 0 };

  function alloc(w, h) {
    if (scene && scene.w === w && scene.h === h) return;
    [scene, bloomA, bloomB].forEach((t) => {
      if (!t) return;
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    });
    const bw = Math.max(1, Math.floor(w / 4));
    const bh = Math.max(1, Math.floor(h / 4));
    scene = makeTarget(gl, w, h);
    bloomA = makeTarget(gl, bw, bh);
    bloomB = makeTarget(gl, bw, bh);
    post = !!(scene && bloomA && bloomB);
  }

  function resize() {
    const mobile = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    alloc(w, h);
  }
  const ro = new ResizeObserver(function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () { resizeQueued = false; resize(); });
  });
  ro.observe(canvas);
  resize();

  function onMove(e) {
    if (!config.interactivity) return;
    const rect = canvas.getBoundingClientRect();
    targetMouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetMouse.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    targetHover = 1;
  }
  function onLeave() { targetHover = 0; }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);

  function drawOrb() {
    const m = MOOD_MUL[config.mood] || MOOD_MUL.idle;
    const clock = Math.max(config.speed == null ? 1 : config.speed, 0) * Math.max((config.moodSpeed && config.moodSpeed[config.mood]) || 1, 0);
    const hz = (m.pulseHz || 0.2) * clock;
    const u = time * hz - Math.floor(time * hz);
    const ping = u < 0.5 ? u * 2 : 2 - u * 2;
    const eased = easePulse(ping, config.easing || "sine", config.spring || "none");
    const bias = m.pulseBias == null ? 0.5 : m.pulseBias;
    const pulse = 1 + (m.pulseAmp || 0) * (bias + (1 - bias) * eased);
    gl.useProgram(orbProg);
    bindAttrib();
    gl.uniform2f(loc.uResolution, canvas.width, canvas.height);
    gl.uniform1f(loc.uTime, time);
    gl.uniform3fv(loc.uColorA, hexToRgb(config.light));
    gl.uniform3fv(loc.uColorB, hexToRgb(config.body));
    gl.uniform3fv(loc.uColorC, hexToRgb(config.core));
    gl.uniform1f(loc.uHue, config.hue || 0);
    gl.uniform1f(loc.uIntensity, config.intensity * m.intensity);
    gl.uniform1f(loc.uGlow, config.glow);
    gl.uniform1f(loc.uBloom, config.bloom);
    gl.uniform1f(loc.uScale, config.scale);
    gl.uniform1f(loc.uInnerRadius, config.innerRadius);
    gl.uniform1f(loc.uNoiseScale, config.noiseScale);
    gl.uniform1f(loc.uNoiseSpeed, config.noiseSpeed * m.noise);
    gl.uniform1f(loc.uRot, rot);
    gl.uniform1f(loc.uDistortion, config.distortion * m.distortion);
    gl.uniform1f(loc.uIridescence, config.iridescence);
    gl.uniform2f(loc.uMouse, mouse.x, mouse.y);
    gl.uniform1f(loc.uHover, Math.max(hover, m.hover * 0.35));
    gl.uniform1f(loc.uStyle, STYLE_INDEX[config.style] || 0);
    gl.uniform1f(loc.uPulse, pulse);
    gl.uniform1f(loc.uGrain, config.grain || 0);
    gl.uniform1f(loc.uMaterial, MATERIAL_INDEX[config.material] || 0);
    gl.uniform1f(loc.uMatAmt, config.matAmount == null ? 1 : config.matAmount);
    gl.uniform1f(loc.uAberration, config.aberration || 0);
    gl.uniform1f(loc.uRefraction, config.refraction || 0);
    gl.uniform1f(loc.uDepth, config.depth || 0);
    gl.uniform1f(loc.uDispersion, config.dispersion || 0);
    gl.uniform1f(loc.uFrost, config.frost || 0);
    gl.uniform1f(loc.uSplay, config.splay || 0);
    gl.uniform1f(loc.uSpeed, clock);
    gl.uniform1f(loc.uFresnel, config.fresnel == null ? 0.85 : config.fresnel);
    gl.uniform1f(loc.uNoiseType, NOISE_INDEX[config.noiseAlgo] || 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, dyeTex);
    gl.uniform1i(loc.uFluid, 2);
    gl.uniform1f(loc.uHasFluid, hasFluid);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function blur(src, dst, dx, dy, thresh) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.useProgram(blurProg);
    bindAttrib();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(bLoc.uTex, 0);
    gl.uniform2f(bLoc.uOutRes, dst.w, dst.h);
    gl.uniform2f(bLoc.uDir, dx, dy);
    gl.uniform1f(bLoc.uThresh, thresh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function draw(now, schedule) {
    if (!running && schedule !== false) return;
    const t = now * 0.001;
    const dt = last ? Math.min(t - last, 0.1) : 0.016;
    last = t;
    if (document.visibilityState === "hidden") {
      if (schedule !== false && running) raf = requestAnimationFrame(function (t) { draw(t, true); });
      return;
    }
    time += dt;
    const m = MOOD_MUL[config.mood] || MOOD_MUL.idle;
    const clock = Math.max(config.speed == null ? 1 : config.speed, 0) * Math.max((config.moodSpeed && config.moodSpeed[config.mood]) || 1, 0);
    rot += (config.rotationSpeed || 0) * m.rot * clock * dt;
    const k = 1 - Math.exp(-dt * 4.2);
    hover += (targetHover - hover) * k;
    mouse.x += (targetMouse.x - mouse.x) * k;
    mouse.y += (targetMouse.y - mouse.y) * k;
    if (hasFluid) fluidStep(dt, config.noiseSpeed * clock);
    const w = canvas.width, h = canvas.height;

    if (post && scene && bloomA && bloomB) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawOrb();
      blur(scene.tex, bloomA, 1.6, 0, 0.62);
      blur(bloomA.tex, bloomB, 0, 1.6, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(compProg);
      bindAttrib();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene.tex);
      gl.uniform1i(cLoc.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bloomB.tex);
      gl.uniform1i(cLoc.uBloom, 1);
      gl.uniform2f(cLoc.uResolution, w, h);
      gl.uniform3fv(cLoc.uBg, hexToRgb(config.background));
      gl.uniform1f(cLoc.uTransparent, 0);
      gl.uniform1f(cLoc.uBloomAmt, config.bloom);
      gl.uniform1f(cLoc.uAberration, config.aberration || 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawOrb();
    }
    if (schedule !== false && running) raf = requestAnimationFrame(function (t) { draw(t, true); });
  }
  raf = requestAnimationFrame(function (t) { draw(t, true); });

  function onLost(e) { e.preventDefault(); running = false; cancelAnimationFrame(raf); }
  function onRestored() { running = true; last = 0; resize(); draw(performance.now(), false); raf = requestAnimationFrame(function (t) { draw(t, true); }); }
  function onVis() {
    if (document.visibilityState === "hidden") { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; last = 0; raf = requestAnimationFrame(function (t) { draw(t, true); }); }
  }
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  document.addEventListener("visibilitychange", onVis);

  return {
    setMood(mood) { if (MOOD_OK[mood]) config.mood = mood; },
    setConfig(partial) { applyPartial(config, partial); },
    capture() {
      draw(performance.now(), false);
      try { return canvas.toDataURL("image/png"); } catch (e) { return null; }
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", onVis);
      fluidDestroy();
      [scene, bloomA, bloomB].forEach(function (t) {
        if (!t) return;
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      });
      gl.deleteProgram(orbProg);
      gl.deleteProgram(blurProg);
      gl.deleteProgram(compProg);
      gl.deleteBuffer(buf);
      gl.deleteTexture(dummy);
      canvas.remove();
      __orbyLive = Math.max(0, __orbyLive - 1);
    },
  };
}`;

export function generateVanilla(config: OrbConfig) {
  return `/** OrbyUI orb — drop into any site. Zero dependencies. */
${RUNTIME}

const mount = document.querySelector("#orby-ui");
const orb = mount ? createOrbyUI(mount, ${lit(config)}) : null;

// orb.setMood("listening" | "thinking" | "speaking" | "idle");
// orb.setConfig({ light: "#7ee0ff" });
`;
}

export function generateReact(config: OrbConfig) {
  return `/** OrbyUI orb — React component, peer: react. */
import { useEffect, useRef, type CSSProperties } from "react";

${RUNTIME}

export type OrbyUIProps = {
  className?: string;
  style?: CSSProperties;
  mood?: "idle" | "listening" | "thinking" | "speaking";
  light?: string;
  body?: string;
  core?: string;
  [key: string]: unknown;
};

export function OrbyUI({
  className,
  style,
  ...opts
}: OrbyUIProps) {
  const ref = useRef<HTMLDivElement>(null);
  const orbRef = useRef<{
    setMood: (mood: string) => void;
    setConfig: (partial: Record<string, unknown>) => void;
    destroy: () => void;
  } | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const orb = createOrbyUI(el, { ...${lit(config)}, ...optsRef.current });
    orbRef.current = orb;
    return () => orb.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    orbRef.current?.setConfig(opts);
    if (opts.mood) orbRef.current?.setMood(opts.mood);
  }, [opts]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}

/* Usage:
  <div style={{ width: 420, height: 420 }}>
    <OrbyUI mood="idle" light="${config.light}" body="${config.body}" core="${config.core}" />
  </div>
*/
`;
}

export function generateHtml(config: OrbConfig) {
  const bg = config.background;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OrbyUI</title>
  <style>
    html, body { height: 100%; margin: 0; background: ${bg}; }
    #orby-ui { width: min(100vw, 100vh); height: min(100vw, 100vh); margin: 0 auto; }
  </style>
</head>
<body>
  <div id="orby-ui"></div>
  <script type="module">
${generateVanilla(config)
  .split("\n")
  .map((l) => "    " + l)
  .join("\n")}
  </script>
</body>
</html>
`;
}

export type ExportKind = "react" | "js" | "html" | "types";

export function generateTypes() {
  return `export type OrbStyle = "volume" | "halo" | "plasma" | "iris";
export type OrbMood = "idle" | "listening" | "thinking" | "speaking";
export type OrbMaterial =
  | "energy" | "grain" | "glass" | "frost" | "metal" | "silk" | "liquid" | "dither" | "ascii";
export type NoiseAlgo = "simplex" | "value" | "perlin" | "worley" | "ridged" | "fbm";
export type EasingId = "sine" | "linear" | "cubic" | "quart" | "expo" | "back" | "circ";
export type SpringId = "none" | "smooth" | "snappy" | "bouncy" | "gentle" | "wobbly";

export interface OrbyUIConfig {
  style?: OrbStyle;
  material?: OrbMaterial;
  light?: string;
  body?: string;
  core?: string;
  background?: string;
  hue?: number;
  intensity?: number;
  glow?: number;
  bloom?: number;
  scale?: number;
  innerRadius?: number;
  noiseScale?: number;
  noiseSpeed?: number;
  rotationSpeed?: number;
  distortion?: number;
  iridescence?: number;
  grain?: number;
  aberration?: number;
  refraction?: number;
  depth?: number;
  dispersion?: number;
  frost?: number;
  splay?: number;
  speed?: number;
  fresnel?: number;
  matAmount?: number;
  noiseAlgo?: NoiseAlgo;
  easing?: EasingId;
  spring?: SpringId;
  moodSpeed?: Record<OrbMood, number>;
  interactivity?: boolean;
  mood?: OrbMood;
}

export interface OrbyUIHandle {
  setMood(mood: OrbMood): void;
  setConfig(partial: OrbyUIConfig): void;
  capture(): string | null;
  destroy(): void;
}

export function createOrbyUI(el: HTMLElement, options?: OrbyUIConfig): OrbyUIHandle;

export function OrbyUI(
  props: OrbyUIConfig & { className?: string; style?: React.CSSProperties },
): JSX.Element;
`;
}

export function generateCode(kind: ExportKind, config: OrbConfig) {
  const safe = sanitizeConfig(config);
  if (kind === "react") return generateReact(safe);
  if (kind === "html") return generateHtml(safe);
  if (kind === "types") return generateTypes();
  return generateVanilla(safe);
}

export const EXPORT_META: Record<
  ExportKind,
  { label: string; filename: string; mime: string }
> = {
  react: { label: "React", filename: "OrbyUI.tsx", mime: "text/plain" },
  js: { label: "JavaScript", filename: "orby-ui.js", mime: "text/javascript" },
  html: { label: "HTML", filename: "orby-ui.html", mime: "text/html" },
  types: { label: "Types", filename: "orby-ui.d.ts", mime: "text/plain" },
};


