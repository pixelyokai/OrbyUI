const VERT = `
precision highp float;
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const ADVECT = `
precision highp float;
uniform sampler2D uSrc;
uniform sampler2D uVel;
uniform vec2 uRes;
uniform float uDt;
uniform float uDissipation;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 vel = texture2D(uVel, uv).xy;
  vec2 prev = uv - vel * uDt * 0.14;
  gl_FragColor = texture2D(uSrc, clamp(prev, 0.002, 0.998)) * uDissipation;
}
`;

const DIVERGENCE = `
precision highp float;
uniform sampler2D uVel;
uniform vec2 uRes;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 px = 1.0 / uRes;
  float L = texture2D(uVel, uv - vec2(px.x, 0.0)).x;
  float R = texture2D(uVel, uv + vec2(px.x, 0.0)).x;
  float B = texture2D(uVel, uv - vec2(0.0, px.y)).y;
  float T = texture2D(uVel, uv + vec2(0.0, px.y)).y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

const PRESSURE = `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDiv;
uniform vec2 uRes;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 px = 1.0 / uRes;
  float L = texture2D(uPressure, uv - vec2(px.x, 0.0)).x;
  float R = texture2D(uPressure, uv + vec2(px.x, 0.0)).x;
  float B = texture2D(uPressure, uv - vec2(0.0, px.y)).x;
  float T = texture2D(uPressure, uv + vec2(0.0, px.y)).x;
  float d = texture2D(uDiv, uv).x;
  gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}
`;

const GRADIENT = `
precision highp float;
uniform sampler2D uVel;
uniform sampler2D uPressure;
uniform vec2 uRes;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 px = 1.0 / uRes;
  float L = texture2D(uPressure, uv - vec2(px.x, 0.0)).x;
  float R = texture2D(uPressure, uv + vec2(px.x, 0.0)).x;
  float B = texture2D(uPressure, uv - vec2(0.0, px.y)).x;
  float T = texture2D(uPressure, uv + vec2(0.0, px.y)).x;
  vec2 v = texture2D(uVel, uv).xy;
  v -= vec2(R - L, T - B) * 0.5;
  gl_FragColor = vec4(v, 0.0, 1.0);
}
`;

const SPLAT = `
precision highp float;
uniform sampler2D uTarget;
uniform vec2 uRes;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
uniform float uIsDye;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 base = texture2D(uTarget, uv);
  float d = distance(uv, uPoint);
  float g = exp(-d * d / max(uRadius, 0.0001));
  if (uIsDye > 0.5) {
    gl_FragColor = vec4(mix(base.rgb, uValue, clamp(g, 0.0, 1.0)), 1.0);
  } else {
    gl_FragColor = vec4(base.xy + uValue.xy * g, 0.0, 1.0);
  }
}
`;

const VERTS = new Float32Array([-1, -1, 3, -1, -1, 3]);

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture };

export interface IFluid {
  ok: boolean;
  step(
    dt: number,
    mouse: { x: number; y: number },
    hover: number,
    colorA: [number, number, number],
    colorB: [number, number, number],
    speed: number,
  ): void;
  bindDye(gl: WebGLRenderingContext, unit: number): boolean;
  destroy(): void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || "compile failed";
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

function link(gl: WebGLRenderingContext, fs: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram();
  if (!p) throw new Error("program");
  gl.attachShader(p, vs);
  gl.attachShader(p, frag);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) || "link failed");
  }
  return p;
}

function makeTarget(
  gl: WebGLRenderingContext,
  n: number,
  format: number,
  type: number,
  internal: number,
): Target | null {
  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  if (!tex || !fbo) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, n, n, 0, format, type, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
    return null;
  }
  return { fbo, tex };
}

function probeFloat(gl: WebGLRenderingContext): { internal: number; format: number; type: number } | null {
  const is2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  if (!is2) return null;
  const gl2 = gl as WebGL2RenderingContext;
  gl2.getExtension("EXT_color_buffer_float");
  gl2.getExtension("EXT_color_buffer_half_float");
  const t = makeTarget(gl2, 2, gl2.RGBA, gl2.HALF_FLOAT, gl2.RGBA16F);
  if (!t) return null;
  gl2.deleteTexture(t.tex);
  gl2.deleteFramebuffer(t.fbo);
  return { internal: gl2.RGBA16F, format: gl2.RGBA, type: gl2.HALF_FLOAT };
}

function locMap(gl: WebGLRenderingContext, p: WebGLProgram, names: string[]) {
  const o: Record<string, WebGLUniformLocation | null> = {};
  for (const n of names) o[n] = gl.getUniformLocation(p, n);
  return o;
}

export class FluidSim implements IFluid {
  ok = false;
  private gl: WebGLRenderingContext;
  private n: number;
  private buf: WebGLBuffer | null = null;
  private velA: Target | null = null;
  private velB: Target | null = null;
  private dyeA: Target | null = null;
  private dyeB: Target | null = null;
  private div: Target | null = null;
  private presA: Target | null = null;
  private presB: Target | null = null;
  private advect: WebGLProgram | null = null;
  private divergence: WebGLProgram | null = null;
  private pressure: WebGLProgram | null = null;
  private gradient: WebGLProgram | null = null;
  private splat: WebGLProgram | null = null;
  private t = 0;
  private jacobi = 8;
  private splatL: Record<string, WebGLUniformLocation | null> = {};
  private advectL: Record<string, WebGLUniformLocation | null> = {};
  private divL: Record<string, WebGLUniformLocation | null> = {};
  private presL: Record<string, WebGLUniformLocation | null> = {};
  private gradL: Record<string, WebGLUniformLocation | null> = {};
  private attrib = 0;

  constructor(gl: WebGLRenderingContext, n = 96) {
    this.gl = gl;
    this.n = n;
    this.jacobi = n <= 64 ? 5 : 8;
    try {
      this.init();
    } catch {
      this.ok = false;
    }
  }

  get dyeTex() {
    return this.dyeA?.tex ?? null;
  }

  bindDye(gl: WebGLRenderingContext, unit: number) {
    if (!this.ok || !this.dyeA) return false;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.dyeA.tex);
    return true;
  }

  private init() {
    const gl = this.gl;
    const n = this.n;
    const fmt = probeFloat(gl);
    if (!fmt) return;
    const mk = () => makeTarget(gl, n, fmt.format, fmt.type, fmt.internal);
    this.velA = mk();
    this.velB = mk();
    this.dyeA = mk();
    this.dyeB = mk();
    this.div = mk();
    this.presA = mk();
    this.presB = mk();
    if (!this.velA || !this.velB || !this.dyeA || !this.dyeB || !this.div || !this.presA || !this.presB) return;

    this.advect = link(gl, ADVECT);
    this.divergence = link(gl, DIVERGENCE);
    this.pressure = link(gl, PRESSURE);
    this.gradient = link(gl, GRADIENT);
    this.splat = link(gl, SPLAT);
    this.splatL = locMap(gl, this.splat!, ["uTarget", "uRes", "uPoint", "uValue", "uRadius", "uIsDye"]);
    this.advectL = locMap(gl, this.advect!, ["uSrc", "uVel", "uRes", "uDt", "uDissipation"]);
    this.divL = locMap(gl, this.divergence!, ["uVel", "uRes"]);
    this.presL = locMap(gl, this.pressure!, ["uPressure", "uDiv", "uRes"]);
    this.gradL = locMap(gl, this.gradient!, ["uVel", "uPressure", "uRes"]);
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, VERTS, gl.STATIC_DRAW);
    this.attrib = gl.getAttribLocation(this.advect!, "position");
    this.ok = true;
  }

  private bindAttrib(_prog: WebGLProgram) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(this.attrib);
    gl.vertexAttribPointer(this.attrib, 2, gl.FLOAT, false, 0, 0);
  }

  private blit(dst: Target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, this.n, this.n);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private swapVel() {
    const t = this.velA;
    this.velA = this.velB;
    this.velB = t;
  }

  private swapDye() {
    const t = this.dyeA;
    this.dyeA = this.dyeB;
    this.dyeB = t;
  }

  private swapPres() {
    const t = this.presA;
    this.presA = this.presB;
    this.presB = t;
  }

  step(
    dt: number,
    mouse: { x: number; y: number },
    hover: number,
    colorA: [number, number, number],
    colorB: [number, number, number],
    speed: number,
  ) {
    if (!this.ok || !this.velA || !this.velB || !this.dyeA || !this.dyeB) return;
    const gl = this.gl;
    this.t += dt;
    const n = this.n;

    const splatForce = (px: number, py: number, fx: number, fy: number, dye: [number, number, number], radius: number) => {
      if (!this.splat || !this.velA || !this.velB || !this.dyeA || !this.dyeB) return;
      const splat = this.splat;
      const L = this.splatL;
      gl.useProgram(splat);
      this.bindAttrib(splat);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velA.tex);
      gl.uniform1i(L.uTarget, 0);
      gl.uniform2f(L.uRes, n, n);
      gl.uniform2f(L.uPoint, px, py);
      gl.uniform3f(L.uValue, fx, fy, 0);
      gl.uniform1f(L.uRadius, radius);
      gl.uniform1f(L.uIsDye, 0);
      this.blit(this.velB);
      this.swapVel();

      gl.bindTexture(gl.TEXTURE_2D, this.dyeA.tex);
      gl.uniform3f(L.uValue, dye[0], dye[1], dye[2]);
      gl.uniform1f(L.uIsDye, 1);
      this.blit(this.dyeB);
      this.swapDye();
    };

    const swirl = this.t * 0.2 * (0.45 + speed * 0.55);
    const px = 0.5 + Math.cos(swirl) * 0.2;
    const py = 0.5 + Math.sin(swirl * 0.9) * 0.2;
    const tx = -Math.sin(swirl) * 0.09 * (0.55 + speed * 0.4);
    const ty = Math.cos(swirl) * 0.09 * (0.55 + speed * 0.4);
    splatForce(px, py, tx, ty, colorA, 0.02);

    const px2 = 0.5 + Math.cos(swirl + 2.2) * 0.16;
    const py2 = 0.5 + Math.sin(swirl * 1.05 + 1.3) * 0.16;
    splatForce(px2, py2, -tx * 0.55, -ty * 0.55, colorB, 0.016);

    if (hover > 0.05) {
      const mx = mouse.x * 0.5 + 0.5;
      const my = mouse.y * 0.5 + 0.5;
      splatForce(mx, my, mouse.x * 0.07 * hover, mouse.y * 0.07 * hover, colorA, 0.022);
    }

    if (this.advect && this.velA && this.velB) {
      const advect = this.advect;
      const L = this.advectL;
      gl.useProgram(advect);
      this.bindAttrib(advect);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velA.tex);
      gl.uniform1i(L.uSrc, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.velA.tex);
      gl.uniform1i(L.uVel, 1);
      gl.uniform2f(L.uRes, n, n);
      gl.uniform1f(L.uDt, dt);
      gl.uniform1f(L.uDissipation, 0.994);
      this.blit(this.velB);
      this.swapVel();
    }

    if (this.divergence && this.div && this.velA) {
      gl.useProgram(this.divergence);
      this.bindAttrib(this.divergence);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velA.tex);
      gl.uniform1i(this.divL.uVel, 0);
      gl.uniform2f(this.divL.uRes, n, n);
      this.blit(this.div);
    }

    if (this.pressure && this.presA && this.presB && this.div) {
      gl.useProgram(this.pressure);
      this.bindAttrib(this.pressure);
      gl.uniform1i(this.presL.uPressure, 0);
      gl.uniform1i(this.presL.uDiv, 1);
      gl.uniform2f(this.presL.uRes, n, n);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.div.tex);
      for (let i = 0; i < this.jacobi; i++) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.presA.tex);
        this.blit(this.presB);
        this.swapPres();
      }
    }

    if (this.gradient && this.velA && this.velB && this.presA) {
      gl.useProgram(this.gradient);
      this.bindAttrib(this.gradient);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velA.tex);
      gl.uniform1i(this.gradL.uVel, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.presA.tex);
      gl.uniform1i(this.gradL.uPressure, 1);
      gl.uniform2f(this.gradL.uRes, n, n);
      this.blit(this.velB);
      this.swapVel();
    }

    if (this.advect && this.dyeA && this.dyeB && this.velA) {
      const advect = this.advect;
      const L = this.advectL;
      gl.useProgram(advect);
      this.bindAttrib(advect);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.dyeA.tex);
      gl.uniform1i(L.uSrc, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.velA.tex);
      gl.uniform1i(L.uVel, 1);
      gl.uniform2f(L.uRes, n, n);
      gl.uniform1f(L.uDt, dt);
      gl.uniform1f(L.uDissipation, 0.997);
      this.blit(this.dyeB);
      this.swapDye();
    }
  }

  destroy() {
    const gl = this.gl;
    const targets = [this.velA, this.velB, this.dyeA, this.dyeB, this.div, this.presA, this.presB];
    for (const t of targets) {
      if (!t) continue;
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    for (const p of [this.advect, this.divergence, this.pressure, this.gradient, this.splat]) {
      if (p) gl.deleteProgram(p);
    }
    if (this.buf) gl.deleteBuffer(this.buf);
    this.ok = false;
  }
}
