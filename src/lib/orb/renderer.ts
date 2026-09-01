import { FluidSim, type IFluid } from "./fluid";
import { acquireOrb, orbBudgetTight, releaseOrb } from "./live";
import { effectiveUniforms } from "./mood";
import { BLUR_SRC, COMP_SRC, FRAG_SRC, VERT_SRC } from "./shaders";
import { hexToRgb, MATERIAL_INDEX, NOISE_INDEX, STYLE_INDEX, sanitizeConfig, type OrbConfig } from "./types";

const VERTS = new Float32Array([-1, -1, 3, -1, -1, 3]);
const COMPLETION_KHR = 0x91b1;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || "shader compile failed";
    gl.deleteShader(shader);
    throw new Error(`${type === gl.VERTEX_SHADER ? "vertex" : "fragment"}: ${log}`);
  }
  return shader;
}

function assertCompiled(gl: WebGLRenderingContext, shader: WebGLShader, kind: string) {
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || "shader compile failed";
    gl.deleteShader(shader);
    throw new Error(`${kind}: ${log}`);
  }
}

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

function makeTarget(gl: WebGLRenderingContext, w: number, h: number): Target | null {
  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  if (!tex || !fbo) return null;
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
  if (!ok) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
    return null;
  }
  return { fbo, tex, w, h };
}

function destroyTarget(gl: WebGLRenderingContext, t: Target | null) {
  if (!t) return;
  gl.deleteTexture(t.tex);
  gl.deleteFramebuffer(t.fbo);
}

function fillRgb(out: Float32Array, hex: string) {
  const rgb = hexToRgb(hex);
  out[0] = rgb[0];
  out[1] = rgb[1];
  out[2] = rgb[2];
}

export class OrbRenderer {
  private gl: WebGLRenderingContext | null = null;
  private orbProg: WebGLProgram | null = null;
  private pendingProg: WebGLProgram | null = null;
  private parallelLink = false;
  private blurProg: WebGLProgram | null = null;
  private compProg: WebGLProgram | null = null;
  private buf: WebGLBuffer | null = null;
  private orbLocs: Record<string, WebGLUniformLocation | null> = {};
  private blurLocs: Record<string, WebGLUniformLocation | null> = {};
  private compLocs: Record<string, WebGLUniformLocation | null> = {};
  private scene: Target | null = null;
  private bloomA: Target | null = null;
  private bloomB: Target | null = null;
  private post = false;
  private fluid: IFluid | null = null;
  private dummyTex: WebGLTexture | null = null;
  private dead = false;
  private raf = 0;
  private running = false;
  private time = 0;
  private rot = 0;
  private hover = 0;
  private targetHover = 0;
  private mouse = { x: 0, y: 0 };
  private targetMouse = { x: 0, y: 0 };
  private last = 0;
  private ro?: ResizeObserver;
  private reduced = false;
  private attrib = 0;
  private slowFrames = 0;
  private dprCap = 1.5;
  private software = false;
  private resizeRaf = 0;
  private onLost?: (e: Event) => void;
  private onRestored?: () => void;
  private onVis?: () => void;
  private onReady?: () => void;
  private readyNotified = false;
  private previewBg: [number, number, number] | null = null;
  private rgbA = new Float32Array(3);
  private rgbB = new Float32Array(3);
  private rgbC = new Float32Array(3);
  private rgbBg = new Float32Array(3);
  private colorKey = "";
  config: OrbConfig;
  readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, config: OrbConfig, opts?: { onReady?: () => void }) {
    this.canvas = canvas;
    this.config = sanitizeConfig(config);
    this.syncColors();
    this.onReady = opts?.onReady;
    this.reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.onLost = (e: Event) => {
      e.preventDefault();
      this.stop();
      this.fluid = null;
      this.gl = null;
      this.orbProg = null;
      this.pendingProg = null;
      this.blurProg = null;
      this.compProg = null;
      this.buf = null;
      this.scene = null;
      this.bloomA = null;
      this.bloomB = null;
      this.dummyTex = null;
    };
    this.onRestored = () => {
      try {
        this.initContext();
        this.start();
      } catch {
        /* fallback handled by host */
      }
    };
    this.onVis = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") this.stop();
      else this.start();
    };
    this.canvas.addEventListener("webglcontextlost", this.onLost);
    this.canvas.addEventListener("webglcontextrestored", this.onRestored);
    document.addEventListener("visibilitychange", this.onVis);
    acquireOrb();
    this.initContext();
    this.ro = new ResizeObserver(() => {
      if (this.resizeRaf) return;
      this.resizeRaf = requestAnimationFrame(() => {
        this.resizeRaf = 0;
        this.resize();
      });
    });
    this.ro.observe(this.canvas);
  }

  private initContext() {
    const ios =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const opts: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: ios ? "low-power" : "high-performance",
      failIfMajorPerformanceCaveat: false,
      desynchronized: true,
    };
    const gl =
      (this.canvas.getContext("webgl2", opts) as WebGLRenderingContext | null) ||
      this.canvas.getContext("webgl", opts);
    if (!gl) throw new Error("WebGL is not available in this browser");
    this.gl = gl;
    this.parallelLink = Boolean(gl.getExtension("KHR_parallel_shader_compile"));
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbg) {
      const name = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
      this.software = /swiftshader|llvmpipe|softpipe|microsoft basic render|virtualbox/i.test(name);
    }
    if (this.software || orbBudgetTight()) {
      this.dprCap = 1;
      this.post = false;
      this.reduced = true;
    }
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, VERTS, gl.STATIC_DRAW);
    gl.disable(gl.BLEND);
    this.dummyTex = gl.createTexture();
    if (this.dummyTex) {
      gl.bindTexture(gl.TEXTURE_2D, this.dummyTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    }
    this.resize();
  }

  private beginOrbProgram() {
    const gl = this.gl;
    if (!gl || this.pendingProg || this.orbProg) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.pendingProg = program;
    gl.flush();
  }

  private finishOrbProgram(): boolean {
    const gl = this.gl;
    const program = this.pendingProg;
    if (!gl || !program) return Boolean(this.orbProg);
    if (this.parallelLink) {
      const done = gl.getProgramParameter(program, COMPLETION_KHR);
      if (!done) return false;
    }
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "program link failed";
      gl.deleteProgram(program);
      this.pendingProg = null;
      throw new Error(log);
    }
    this.orbProg = program;
    this.pendingProg = null;
    this.attrib = gl.getAttribLocation(program, "position");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(this.attrib);
    gl.vertexAttribPointer(this.attrib, 2, gl.FLOAT, false, 0, 0);

    const orbNames = [
      "uResolution",
      "uTime",
      "uColorA",
      "uColorB",
      "uColorC",
      "uHue",
      "uIntensity",
      "uGlow",
      "uBloom",
      "uScale",
      "uInnerRadius",
      "uNoiseScale",
      "uNoiseSpeed",
      "uRot",
      "uDistortion",
      "uIridescence",
      "uMouse",
      "uHover",
      "uStyle",
      "uPulse",
      "uGrain",
      "uMaterial",
      "uMatAmt",
      "uAberration",
      "uRefraction",
      "uDepth",
      "uDispersion",
      "uFrost",
      "uSplay",
      "uSpeed",
      "uFresnel",
      "uNoiseType",
      "uFluid",
      "uHasFluid",
    ];
    this.orbLocs = {};
    for (const n of orbNames) this.orbLocs[n] = gl.getUniformLocation(program, n);
    return true;
  }

  private setupPost() {
    const gl = this.gl;
    if (!gl || this.dead || this.blurProg) return;
    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
      const bfs = compile(gl, gl.FRAGMENT_SHADER, BLUR_SRC);
      const cfs = compile(gl, gl.FRAGMENT_SHADER, COMP_SRC);
      assertCompiled(gl, vs, "vertex");
      assertCompiled(gl, bfs, "fragment");
      assertCompiled(gl, cfs, "fragment");
      const blur = gl.createProgram();
      const comp = gl.createProgram();
      if (!blur || !comp) return;
      gl.attachShader(blur, vs);
      gl.attachShader(blur, bfs);
      gl.linkProgram(blur);
      gl.attachShader(comp, vs);
      gl.attachShader(comp, cfs);
      gl.linkProgram(comp);
      gl.deleteShader(vs);
      gl.deleteShader(bfs);
      gl.deleteShader(cfs);
      if (!gl.getProgramParameter(blur, gl.LINK_STATUS) || !gl.getProgramParameter(comp, gl.LINK_STATUS)) {
        gl.deleteProgram(blur);
        gl.deleteProgram(comp);
        return;
      }
      this.blurProg = blur;
      this.compProg = comp;
      this.blurLocs = {
        uTex: gl.getUniformLocation(blur, "uTex"),
        uOutRes: gl.getUniformLocation(blur, "uOutRes"),
        uDir: gl.getUniformLocation(blur, "uDir"),
        uThresh: gl.getUniformLocation(blur, "uThresh"),
      };
      this.compLocs = {
        uScene: gl.getUniformLocation(comp, "uScene"),
        uBloom: gl.getUniformLocation(comp, "uBloom"),
        uResolution: gl.getUniformLocation(comp, "uResolution"),
        uBg: gl.getUniformLocation(comp, "uBg"),
        uTransparent: gl.getUniformLocation(comp, "uTransparent"),
        uBloomAmt: gl.getUniformLocation(comp, "uBloomAmt"),
        uAberration: gl.getUniformLocation(comp, "uAberration"),
      };
      this.post = !this.software && !this.reduced && Boolean(this.scene && this.bloomA && this.bloomB);
    } catch {
      this.post = false;
    }
  }

  private setupFluid() {
    const gl = this.gl;
    if (!gl || this.dead || this.reduced || this.fluid) return;
    try {
      const n =
        typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
          ? 64
          : 80;
      this.fluid = new FluidSim(gl, n);
      if (!this.fluid.ok) this.fluid = null;
    } catch {
      this.fluid = null;
    }
  }

  setConfig(config: OrbConfig) {
    if (this.config === config) return;
    this.config = config;
    this.syncColors();
  }

  private syncColors() {
    const key = `${this.config.colorA}|${this.config.colorB}|${this.config.colorC}|${this.config.background}`;
    if (key === this.colorKey) return;
    this.colorKey = key;
    fillRgb(this.rgbA, this.config.colorA);
    fillRgb(this.rgbB, this.config.colorB);
    fillRgb(this.rgbC, this.config.colorC);
    fillRgb(this.rgbBg, this.config.background);
  }

  setPreviewBg(hex: string | null) {
    this.previewBg = hex ? hexToRgb(hex) : null;
  }

  setPointer(nx: number, ny: number, over: boolean) {
    if (!this.config.interactivity) {
      this.targetHover = 0;
      this.targetMouse.x = 0;
      this.targetMouse.y = 0;
      return;
    }
    this.targetHover = over ? 1 : 0;
    this.targetMouse.x = nx;
    this.targetMouse.y = ny;
  }

  private allocTargets(w: number, h: number) {
    const gl = this.gl;
    if (!gl) return;
    if (this.scene && this.scene.w === w && this.scene.h === h) return;
    destroyTarget(gl, this.scene);
    destroyTarget(gl, this.bloomA);
    destroyTarget(gl, this.bloomB);
    const bw = Math.max(1, Math.floor(w / 4));
    const bh = Math.max(1, Math.floor(h / 4));
    this.scene = makeTarget(gl, w, h);
    this.bloomA = makeTarget(gl, bw, bh);
    this.bloomB = makeTarget(gl, bw, bh);
    this.post = Boolean(this.scene && this.bloomA && this.bloomB) && !this.software && !this.reduced;
  }

  private resize() {
    const gl = this.gl;
    if (!gl) return;
    const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
    const cap = mobile ? Math.min(1.25, this.dprCap) : this.dprCap;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, cap);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    this.allocTargets(w, h);
  }

  private bindAttrib() {
    const gl = this.gl;
    if (!gl || !this.buf) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(this.attrib);
    gl.vertexAttribPointer(this.attrib, 2, gl.FLOAT, false, 0, 0);
  }

  private drawOrb(u: ReturnType<typeof effectiveUniforms>) {
    const gl = this.gl;
    const program = this.orbProg;
    if (!gl || !program) return;
    gl.useProgram(program);
    this.bindAttrib();
    gl.uniform2f(this.orbLocs.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.orbLocs.uTime, this.time);
    gl.uniform3fv(this.orbLocs.uColorA, this.rgbA);
    gl.uniform3fv(this.orbLocs.uColorB, this.rgbB);
    gl.uniform3fv(this.orbLocs.uColorC, this.rgbC);
    gl.uniform1f(this.orbLocs.uHue, this.config.hue);
    gl.uniform1f(this.orbLocs.uIntensity, u.intensity);
    gl.uniform1f(this.orbLocs.uGlow, u.glow);
    gl.uniform1f(this.orbLocs.uBloom, u.bloom);
    gl.uniform1f(this.orbLocs.uScale, u.scale);
    gl.uniform1f(this.orbLocs.uInnerRadius, u.innerRadius);
    gl.uniform1f(this.orbLocs.uNoiseScale, u.noiseScale);
    gl.uniform1f(this.orbLocs.uNoiseSpeed, u.noiseSpeed);
    gl.uniform1f(this.orbLocs.uRot, this.rot);
    gl.uniform1f(this.orbLocs.uDistortion, u.distortion);
    gl.uniform1f(this.orbLocs.uIridescence, u.iridescence);
    gl.uniform2f(this.orbLocs.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.orbLocs.uHover, u.hover);
    gl.uniform1f(this.orbLocs.uStyle, STYLE_INDEX[this.config.style]);
    gl.uniform1f(this.orbLocs.uPulse, u.pulse);
    gl.uniform1f(this.orbLocs.uGrain, this.config.grain);
    gl.uniform1f(this.orbLocs.uMaterial, MATERIAL_INDEX[this.config.material]);
    gl.uniform1f(this.orbLocs.uMatAmt, this.config.matAmount);
    gl.uniform1f(this.orbLocs.uAberration, this.config.aberration);
    gl.uniform1f(this.orbLocs.uRefraction, this.config.refraction);
    gl.uniform1f(this.orbLocs.uDepth, this.config.depth);
    gl.uniform1f(this.orbLocs.uDispersion, this.config.dispersion);
    gl.uniform1f(this.orbLocs.uFrost, this.config.frost);
    gl.uniform1f(this.orbLocs.uSplay, this.config.splay);
    gl.uniform1f(this.orbLocs.uSpeed, u.clock);
    gl.uniform1f(this.orbLocs.uFresnel, this.config.fresnel);
    gl.uniform1f(this.orbLocs.uNoiseType, NOISE_INDEX[this.config.noiseAlgo] ?? 0);
    const hasFluid = this.fluid?.bindDye(gl, 2) ? 1 : 0;
    if (!hasFluid) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.dummyTex);
    }
    gl.uniform1i(this.orbLocs.uFluid, 2);
    gl.uniform1f(this.orbLocs.uHasFluid, hasFluid);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private blurPass(src: WebGLTexture, dst: Target, dirX: number, dirY: number, thresh: number) {
    const gl = this.gl;
    const prog = this.blurProg;
    if (!gl || !prog) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.useProgram(prog);
    this.bindAttrib();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(this.blurLocs.uTex, 0);
    gl.uniform2f(this.blurLocs.uOutRes, dst.w, dst.h);
    gl.uniform2f(this.blurLocs.uDir, dirX, dirY);
    gl.uniform1f(this.blurLocs.uThresh, thresh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private draw = (now: number) => {
    this.frame(now, true);
  };

  private frame(now: number, schedule: boolean) {
    if (!this.running && schedule) return;
    const gl = this.gl;
    if (!gl) return;

    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    if (!this.orbProg) {
      try {
        if (!this.pendingProg) this.beginOrbProgram();
        if (!this.finishOrbProgram()) {
          if (schedule && this.running) this.raf = requestAnimationFrame(this.draw);
          return;
        }
      } catch (err) {
        console.error(err);
        this.stop();
        return;
      }
    }

    const t = now * 0.001;
    let dt = this.last ? Math.min(t - this.last, 0.1) : 0.016;
    this.last = t;
    if (this.reduced) dt *= 0.12;
    if (dt > 0.028) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 2);
    if (this.slowFrames > 45) {
      this.dprCap = 1.25;
      this.post = false;
    }

    this.time += dt;
    const u = effectiveUniforms(this.config, this.time, this.hover);
    this.rot += this.config.rotationSpeed * u.rotMul * dt;

    const k = 1 - Math.exp(-dt * 4.2);
    this.hover += (this.targetHover - this.hover) * k;
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * k;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * k;

    if (this.fluid?.ok && !this.reduced && !this.software) {
      this.fluid.step(
        dt,
        this.mouse,
        this.hover,
        this.rgbA as unknown as [number, number, number],
        this.rgbB as unknown as [number, number, number],
        this.config.noiseSpeed * u.clock * (0.6 + this.config.distortion),
      );
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (u.bloom > 0.02 && !this.blurProg && !this.software && !this.reduced) {
      this.setupPost();
    }
    if (this.config.interactivity && this.hover > 0.05) {
      this.setupFluid();
    }
    const usePost = this.post && u.bloom > 0.02 && this.scene && this.bloomA && this.bloomB && this.compProg;

    if (usePost && this.scene && this.bloomA && this.bloomB && this.compProg) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawOrb(u);

      this.blurPass(this.scene.tex, this.bloomA, 1.6, 0, 0.62);
      this.blurPass(this.bloomA.tex, this.bloomB, 0, 1.6, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(this.compProg);
      this.bindAttrib();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.scene.tex);
      gl.uniform1i(this.compLocs.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
      gl.uniform1i(this.compLocs.uBloom, 1);
      gl.uniform2f(this.compLocs.uResolution, w, h);
      gl.uniform3fv(this.compLocs.uBg, this.previewBg ?? this.rgbBg);
      gl.uniform1f(this.compLocs.uTransparent, 0);
      gl.uniform1f(this.compLocs.uBloomAmt, u.bloom);
      gl.uniform1f(this.compLocs.uAberration, this.config.aberration);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawOrb(u);
    }

    if (schedule && this.running) this.raf = requestAnimationFrame(this.draw);
    this.notifyReady();
  }

  private notifyReady() {
    if (this.readyNotified || this.dead) return;
    this.readyNotified = true;
    this.onReady?.();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this.draw);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.dead = true;
    this.stop();
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
    this.ro?.disconnect();
    if (this.onLost) this.canvas.removeEventListener("webglcontextlost", this.onLost);
    if (this.onRestored) this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    if (this.onVis) document.removeEventListener("visibilitychange", this.onVis);
    const gl = this.gl;
    if (gl) {
      destroyTarget(gl, this.scene);
      destroyTarget(gl, this.bloomA);
      destroyTarget(gl, this.bloomB);
      if (this.buf) gl.deleteBuffer(this.buf);
      if (this.orbProg) gl.deleteProgram(this.orbProg);
      if (this.pendingProg) gl.deleteProgram(this.pendingProg);
      if (this.blurProg) gl.deleteProgram(this.blurProg);
      if (this.compProg) gl.deleteProgram(this.compProg);
      if (this.dummyTex) gl.deleteTexture(this.dummyTex);
    }
    this.fluid?.destroy();
    this.fluid = null;
    this.gl = null;
    releaseOrb();
    this.orbProg = null;
    this.pendingProg = null;
    this.blurProg = null;
    this.compProg = null;
    this.buf = null;
    this.scene = null;
    this.bloomA = null;
    this.bloomB = null;
  }
}
