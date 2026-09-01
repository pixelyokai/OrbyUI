export const VERT_SRC = `
precision highp float;
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FRAG_SRC = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uHue;
uniform float uIntensity;
uniform float uGlow;
uniform float uBloom;
uniform float uScale;
uniform float uInnerRadius;
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uRot;
uniform float uDistortion;
uniform float uIridescence;
uniform vec2 uMouse;
uniform float uHover;
uniform float uStyle;
uniform float uPulse;
uniform float uGrain;
uniform float uMaterial;
uniform float uMatAmt;
uniform float uAberration;
uniform float uRefraction;
uniform float uDepth;
uniform float uDispersion;
uniform float uFrost;
uniform float uSplay;
uniform float uSpeed;
uniform float uFresnel;
uniform float uNoiseType;
uniform sampler2D uFluid;
uniform float uHasFluid;

vec3 rgb2yiq(vec3 c) {
  float y = dot(c, vec3(0.299, 0.587, 0.114));
  float i = dot(c, vec3(0.596, -0.274, -0.322));
  float q = dot(c, vec3(0.211, -0.523, 0.312));
  return vec3(y, i, q);
}

vec3 yiq2rgb(vec3 c) {
  return vec3(
    c.x + 0.956 * c.y + 0.621 * c.z,
    c.x - 0.272 * c.y - 0.647 * c.z,
    c.x - 1.106 * c.y + 1.703 * c.z
  );
}

vec3 applyHue(vec3 color, float hueDeg) {
  float h = hueDeg * 3.14159265 / 180.0;
  vec3 yiq = rgb2yiq(color);
  float cs = cos(h);
  float sn = sin(h);
  float i2 = yiq.y * cs - yiq.z * sn;
  float q2 = yiq.y * sn + yiq.z * cs;
  yiq.y = i2;
  yiq.z = q2;
  return clamp(yiq2rgb(yiq), 0.0, 1.0);
}

float asciiGlyph(float n, vec2 p) {
  p = floor(p * vec2(4.0, -4.0) + 2.5);
  if (p.x < 0.0 || p.x > 4.0 || p.y < 0.0 || p.y > 4.0) return 0.0;
  float bit = p.x + 5.0 * p.y;
  return step(0.5, mod(floor(n / exp2(bit)), 2.0));
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = fract(sin(dot(i, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n100 = fract(sin(dot(i + vec3(1.0, 0.0, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n010 = fract(sin(dot(i + vec3(0.0, 1.0, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n110 = fract(sin(dot(i + vec3(1.0, 1.0, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n001 = fract(sin(dot(i + vec3(0.0, 0.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n101 = fract(sin(dot(i + vec3(1.0, 0.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n011 = fract(sin(dot(i + vec3(0.0, 1.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float n111 = fract(sin(dot(i + vec3(1.0, 1.0, 1.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
  float nx00 = mix(n000, n100, u.x);
  float nx10 = mix(n010, n110, u.x);
  float nx01 = mix(n001, n101, u.x);
  float nx11 = mix(n011, n111, u.x);
  return mix(mix(nx00, nx10, u.y), mix(nx01, nx11, u.y), u.z) * 2.0 - 1.0;
}

float pnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = dot(hash33(i), f);
  float n100 = dot(hash33(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(hash33(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(hash33(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(hash33(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(hash33(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(hash33(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(hash33(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

float wnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float md = 8.0;
  for (int n = 0; n < 27; n++) {
    float fn = float(n);
    vec3 g = vec3(mod(fn, 3.0), mod(floor(fn / 3.0), 3.0), floor(fn / 9.0)) - 1.0;
    vec3 o = hash33(i + g) * 0.5 + 0.5;
    vec3 r = g + o - f;
    md = min(md, dot(r, r));
  }
  return 1.0 - 2.0 * clamp(sqrt(md), 0.0, 1.0);
}

float primNoise(vec3 p) {
  if (uNoiseType < 0.5) return snoise(p);
  if (uNoiseType < 1.5) return vnoise(p);
  if (uNoiseType < 2.5) return pnoise(p);
  if (uNoiseType < 3.5) return wnoise(p);
  if (uNoiseType < 4.5) return 1.0 - 2.0 * abs(snoise(p));
  return snoise(p);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  vec3 q = p;
  for (int i = 0; i < 4; i++) {
    v += a * primNoise(q);
    q = q * 2.03 + vec3(0.17, 0.31, 0.11);
    a *= 0.5;
  }
  return v;
}

float noise3(vec3 p) {
  if (uNoiseType > 4.5) return fbm(p * 0.85);
  if (uNoiseType > 3.5 && uNoiseType < 4.5) return primNoise(p * 1.15);
  if (uNoiseType > 2.5 && uNoiseType < 3.5) return primNoise(p * 1.35);
  return primNoise(p);
}

vec2 curlFluid(vec3 p) {
  float e = 0.12;
  float n1 = primNoise(p + vec3(0.0, e, 0.0));
  float n2 = primNoise(p - vec3(0.0, e, 0.0));
  float n3 = primNoise(p + vec3(e, 0.0, 0.0));
  float n4 = primNoise(p - vec3(e, 0.0, 0.0));
  return vec2(n1 - n2, n4 - n3) * (0.5 / e);
}

vec3 rotX(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 res = uResolution;
  float minSide = min(res.x, res.y);
  vec2 uv = (frag - 0.5 * res) / max(minSide, 1.0);
  uv /= max(uScale, 0.2);

  float sphR = 0.5 * max(uPulse, 0.2);
  float r = length(uv);
  float px = 1.75 / max(minSide, 1.0) / max(uScale, 0.2);
  float sphereMask = 1.0 - smoothstep(sphR - px, sphR + px, r);
  if (sphereMask < 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float t = uTime;
  float z = sqrt(max(sphR * sphR - r * r, 0.0));
  vec3 pos = vec3(uv, z);
  vec3 nrm = normalize(pos + vec3(0.0, 0.0, 0.0001));

  float pitch = uMouse.y * 0.48 * uHover;
  float yaw = uMouse.x * 0.48 * uHover;
  vec3 tp = rotY(rotX(pos, pitch), yaw);
  vec3 tn = normalize(rotY(rotX(nrm, pitch), yaw));

  float cs = cos(uRot);
  float sn = sin(uRot);
  mat2 rm = mat2(cs, -sn, sn, cs);
  vec3 qp = tp;
  qp.xy = rm * qp.xy;
  float cs2 = cos(uRot * 0.63);
  float sn2 = sin(uRot * 0.63);
  qp.xz = mat2(cs2, -sn2, sn2, cs2) * qp.xz;

  float ns = uNoiseScale;
  float nt = t * uNoiseSpeed * max(uSpeed, 0.0);

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float ior = mix(1.0, 1.52, clamp(uRefraction, 0.0, 1.5) / 1.5);
  float eta = 1.0 / max(ior, 1.01);
  vec3 rd = refract(-viewDir, tn, eta);
  if (dot(rd, rd) < 0.001) rd = reflect(-viewDir, tn);

  float splayK = uSplay * (r / max(sphR, 0.001));
  qp.xy *= 1.0 + splayK * 0.48;
  float qang = atan(qp.y, qp.x);
  float qrad = length(qp.xy);
  qang += uSplay * 0.32 * qp.z;
  qp.xy = vec2(cos(qang), sin(qang)) * qrad;

  float thick = mix(0.04, 0.48, clamp(uDepth, 0.0, 1.0));
  qp += rd * thick;

  float flowAmt = uDistortion * (0.55 + 0.45 * uHover);
  vec3 qf = qp;
  if (flowAmt > 0.002) {
    vec2 vel = curlFluid(qp * ns * 0.85 + vec3(0.0, nt * 0.22, nt * 0.08));
    qf += vec3(vel * flowAmt * 0.085, vel.x * flowAmt * 0.04);
    vec2 vel2 = curlFluid(qf * ns * 1.6 + vec3(nt * 0.13, 0.0, -nt * 0.1));
    qf += vec3(vel2 * flowAmt * 0.04, 0.0);
  }

  float n1 = noise3(qf * ns * 1.7 + vec3(nt, 0.12, -nt * 0.35));
  float n2 = noise3(qf * ns * 3.4 + vec3(-nt * 0.55, nt * 0.28, 0.2));
  float n3 = noise3(qf * ns * 0.9 + vec3(0.0, nt * 0.18, 0.0));
  float nMix = n1 * 0.46 + n2 * 0.28 + n3 * 0.26;

  float dispAmt = uDispersion * 0.16;
  float nR = n1;
  float nB = n1;
  if (dispAmt > 0.001) {
    float etaR = eta * (1.0 - dispAmt);
    float etaB = eta * (1.0 + dispAmt);
    vec3 rdR = refract(-viewDir, tn, etaR);
    vec3 rdB = refract(-viewDir, tn, etaB);
    if (dot(rdR, rdR) < 0.001) rdR = rd;
    if (dot(rdB, rdB) < 0.001) rdB = rd;
    nR = noise3((qf + (rdR - rd) * (0.12 + thick)) * ns * 1.7 + vec3(nt, 0.12, -nt * 0.35));
    nB = noise3((qf + (rdB - rd) * (0.12 + thick)) * ns * 1.7 + vec3(nt, 0.12, -nt * 0.35));
  }

  vec2 fuv = (uv + rd.xy * uRefraction * 0.07) / max(sphR, 0.001) * 0.48 + 0.5;
  vec3 dye = texture2D(uFluid, clamp(fuv, 0.002, 0.998)).rgb * uHasFluid;

  float ndv = clamp(tn.z, 0.0, 1.0);
  float fresPow = mix(1.2, 3.9, clamp(uFresnel, 0.0, 2.0) / 2.0);
  float fres = pow(1.0 - ndv, mix(fresPow, fresPow + 0.6, clamp(uIridescence, 0.0, 1.5) / 1.5));
  float ang = atan(uv.y, uv.x);

  vec3 cA = applyHue(uColorA, uHue);
  vec3 cB = applyHue(uColorB, uHue);
  vec3 cC = applyHue(uColorC, uHue);

  float specPow0 = 32.0;
  float glassAmt0 = 0.9;
  float gAmt = max(uGrain, 0.0);
  float bodyMul0 = 1.0;
  float specPowM = specPow0;
  float glassAmtM = glassAmt0;
  float gMul = 1.0;
  float bodyM = 1.0;
  if (uMaterial > 0.5 && uMaterial < 1.5) {
    gMul = 1.65;
    specPowM = 18.0;
    glassAmtM = 0.55;
  } else if (uMaterial > 1.5 && uMaterial < 2.5) {
    gMul = 0.35;
    specPowM = 48.0;
    glassAmtM = 1.28;
  } else if (uMaterial > 2.5 && uMaterial < 3.5) {
    gMul = 1.15;
    specPowM = 10.0;
    glassAmtM = 0.52;
    bodyM = 0.94;
  } else if (uMaterial > 3.5 && uMaterial < 4.5) {
    gMul = 0.55;
    specPowM = 64.0;
    glassAmtM = 0.3;
    bodyM = 0.84;
  } else if (uMaterial > 4.5 && uMaterial < 5.5) {
    gMul = 0.18;
    specPowM = 22.0;
    glassAmtM = 1.0;
  } else if (uMaterial > 5.5 && uMaterial < 6.5) {
    gMul = 0.1;
    specPowM = 72.0;
    glassAmtM = 1.6;
    bodyM = 0.9;
  } else if (uMaterial > 7.5) {
    gMul = 0.28;
    specPowM = 26.0;
    glassAmtM = 0.95;
    bodyM = 0.96;
  }
  float k = clamp(uMatAmt, 0.0, 1.5);
  float specPow = mix(specPow0, specPowM, clamp(k, 0.0, 1.0));
  float glassAmt = mix(glassAmt0, glassAmtM, clamp(k, 0.0, 1.0));
  float bodyMul = mix(bodyMul0, bodyM, clamp(k, 0.0, 1.0));
  gAmt *= mix(1.0, gMul, clamp(k, 0.0, 1.0));

  vec3 light = normalize(vec3(0.35 + uMouse.x * 0.25 * uHover, 0.48, 0.82));
  vec3 light2 = normalize(vec3(-0.55, -0.15, 0.55));
  float spec = pow(max(0.0, dot(tn, light)), specPow);
  float spec2 = pow(max(0.0, dot(tn, light2)), specPow * 0.45);
  float wrap = 0.42 + 0.58 * ndv;
  float live = uPulse;

  vec3 deep = mix(mix(cA, cB, 0.45) * 0.34, cC, 0.22);
  vec3 volumeCol;
  {
    vec3 base = mix(deep, cA, nMix * 0.5 + 0.5);
    base = mix(base, cB, 0.22 + 0.2 * n3);
    base = mix(base, dye, uHasFluid * 0.55);
    float film = 0.5 + 0.5 * n1;
    vec3 oil = 0.5 + 0.5 * cos(6.28318 * (film + vec3(0.0, 0.33, 0.67)) + uIridescence);
    base = mix(base, mix(base, oil * mix(cA, cB, 0.5), 0.55), uIridescence * 0.42 * (0.35 + fres));
    float core = smoothstep(uInnerRadius * sphR, sphR * 0.78, r);
    base *= mix(0.7, 1.0, core);
    base *= wrap;
    base += cA * fres * 0.42;
    base += cB * spec * 0.7;
    base += vec3(1.0) * spec2 * 0.18;
    base += vec3(1.0) * pow(ndv, 18.0) * 0.22 * live;
    volumeCol = base * uIntensity;
  }

  vec3 haloCol;
  {
    float inner = mix(0.16, 0.46, uInnerRadius);
    float ringPos = mix(inner, sphR, 0.58);
    float ring = abs(r - ringPos);
    float band = 1.0 - smoothstep(0.0, 0.12, ring);
    band *= 0.5 + 0.5 * (nMix * 0.5 + 0.5);
    float hole = smoothstep(inner * 0.7, inner + 0.05, r);
    vec3 colh = mix(cA, cB, 0.5 + 0.5 * sin(ang + t * 0.7 + n1));
    colh *= band * 1.7 * hole;
    vec2 blob = vec2(cos(t * 0.55), sin(t * 0.55)) * ringPos;
    float blobL = 1.0 / (1.0 + dot(uv - blob, uv - blob) * 22.0);
    colh += cA * blobL * hole * 1.15;
    colh += deep * (1.0 - hole) * 0.45;
    float rim = (1.0 - smoothstep(sphR * 0.86, sphR, r));
    colh += mix(cA, cB, 0.5) * rim * 0.4;
    haloCol = colh * uIntensity;
  }

  vec3 plasmaCol;
  {
    float filaments = pow(max(abs(n1), 0.0001), 1.7);
    vec3 colp = mix(mix(cA, cB, 0.4) * 0.4, cA, 0.5 + 0.5 * n3);
    colp = mix(colp, cB, filaments);
    colp *= wrap;
    colp += cA * filaments * 0.85;
    colp += cB * fres * 0.48;
    colp += spec * vec3(1.0) * 0.22;
    plasmaCol = colp * uIntensity * 1.08;
  }

  vec3 irisCol;
  {
    float rings = 0.5 + 0.5 * sin(r * (10.0 + 16.0 * uInnerRadius) - t * 0.85 + n1 * 2.2);
    rings = pow(clamp(rings, 0.0, 1.0), 2.15);
    float spokes = 0.5 + 0.5 * sin(ang * 4.0 + t * 0.4 + n2);
    float m = rings * mix(0.55, 1.0, spokes);
    m *= 1.0 - smoothstep(sphR * 0.9, sphR, r);
    m *= smoothstep(0.02, 0.1, r);
    vec3 coli = mix(cA, cB, spokes * 0.5 + 0.5);
    coli *= m;
    coli += cA * pow(m, 2.0) * 0.65;
    coli += deep * (1.0 - m) * 0.35;
    irisCol = coli * uIntensity;
  }

  vec3 col = volumeCol;
  if (uStyle > 0.5 && uStyle < 1.5) col = haloCol;
  else if (uStyle > 1.5 && uStyle < 2.5) col = plasmaCol;
  else if (uStyle > 2.5) col = irisCol;

  col *= bodyMul;

  float coreAmt = (0.5 + 0.65 * uGlow + 0.35 * uBloom) * live;
  float ft = t * max(uSpeed, 0.0);
  vec2 pCw = mat2(cos(ft * 0.28), -sin(ft * 0.28), sin(ft * 0.28), cos(ft * 0.28)) * uv;
  float cresA = exp(-dot(pCw, pCw) * 7.2);
  vec2 pCwH = pCw - vec2(0.0, sphR * 0.52);
  cresA = max(cresA - exp(-dot(pCwH, pCwH) * 5.0), 0.0);
  vec2 pCcw = mat2(cos(-ft * 0.18), -sin(-ft * 0.18), sin(-ft * 0.18), cos(-ft * 0.18)) * uv;
  float cresB = exp(-dot(pCcw, pCcw) * 6.6);
  vec2 pCcwH = pCcw - vec2(0.0, sphR * 0.46);
  cresB = max(cresB - exp(-dot(pCcwH, pCcwH) * 4.6), 0.0);
  col += mix(cA, vec3(1.0), 0.7) * cresA * 0.48 * coreAmt;
  col += mix(cB, vec3(1.0), 0.55) * cresB * 0.28 * coreAmt;

  vec2 blob1 = vec2(sin(ft * 0.27), cos(ft * 0.22)) * sphR * 0.3;
  vec2 blob2 = vec2(cos(ft * 0.16 + 1.7), sin(ft * 0.2 + 0.6)) * sphR * 0.26;
  float w1 = exp(-dot(uv - blob1, uv - blob1) * 16.0);
  float w2 = exp(-dot(uv - blob2, uv - blob2) * 20.0);
  col += cA * w1 * 0.22;
  col += cB * w2 * 0.12;

  float fresG = pow(1.0 - ndv, mix(1.55, 3.5, clamp(uFresnel, 0.0, 2.0) / 2.0));
  vec3 glassTint = mix(mix(cA, vec3(1.0), 0.62), cB, 0.22);
  col += glassTint * fresG * 0.32 * glassAmt * (0.4 + 0.75 * uFresnel);
  col += vec3(1.0) * spec * 0.28;
  col += vec3(1.0) * spec2 * 0.1;

  float rim = smoothstep(sphR * 0.88, sphR * 0.995, r);
  vec3 rimCol = mix(vec3(0.92, 0.97, 1.0), mix(cA, vec3(1.0), 0.85), 0.35);
  col += rimCol * rim * (0.22 + 0.42 * spec) * glassAmt * (0.35 + 0.85 * uFresnel);

  col.r += (nR - n1) * (uAberration * 0.28 + uDispersion * 0.55) * cA.r * (0.4 + fresG);
  col.b += (nB - n1) * (uAberration * 0.28 + uDispersion * 0.55) * cB.b * (0.4 + fresG);
  col.g += ((nR + nB) * 0.5 - n1) * (uAberration * 0.08 + uDispersion * 0.16) * (0.4 + fresG);

  if (uMaterial > 5.5 && uMaterial < 6.5) {
    vec3 liq = col;
    vec3 R = reflect(-viewDir, tn);
    float env = pow(clamp(R.y * 0.5 + 0.5, 0.0, 1.0), 1.35);
    liq = mix(liq, mix(cA, vec3(1.0), 0.72), env * 0.22);
    float lg = pow(1.0 - ndv, 1.65);
    liq += vec3(0.9, 0.95, 1.0) * lg * 0.5;
    liq = mix(liq, liq + vec3(0.12, 0.14, 0.18), pow(ndv, 2.2) * 0.22);
    vec3 refr = dye * 0.65 + mix(cA, cB, 0.4) * 0.35;
    liq = mix(liq, refr, (1.0 - fresG) * 0.28 * (0.45 + 0.55 * uRefraction));
    col = mix(col, liq, clamp(k, 0.0, 1.0));
  }

  float frost = max(uFrost, 0.0);
  if (uMaterial > 2.5 && uMaterial < 3.5) frost = mix(frost, max(frost, 0.4), clamp(k, 0.0, 1.0));
  vec3 scattered = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), mix(cA, cB, 0.42), 0.32);
  scattered *= 0.82 + 0.18 * n3;
  col = mix(col, scattered, frost * (0.32 + 0.42 * ndv));
  col += n2 * frost * 0.035;

  float ign1 = fract(52.9829189 * fract(dot(frag + 0.11, vec2(0.06711056, 0.00583715))));
  float ign2 = fract(52.9829189 * fract(dot(frag * 1.37 + vec2(19.1, 7.3), vec2(0.06711056, 0.00583715))));
  float gFine = ign1 + ign2 - 1.0;
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float gMask = smoothstep(0.03, 0.14, luma) * (1.0 - smoothstep(0.82, 1.0, luma));
  col += gFine * gAmt * 0.38 * gMask;

  if (uMaterial > 6.5 && uMaterial < 7.5) {
    vec2 bm = mod(floor(frag), 4.0);
    float bv = dot(mod(bm, 2.0), vec2(1.0, 2.0));
    bm = floor(bm * 0.5);
    bv += dot(mod(bm, 2.0), vec2(4.0, 8.0));
    float bayer = bv / 16.0;
    float levels = mix(12.0, 4.0, clamp(k, 0.0, 1.0));
    vec3 dith = floor(col * levels + (bayer - 0.5) + 0.5) / levels;
    col = mix(col, dith, 0.9 * clamp(k, 0.0, 1.2));
  } else if (uMaterial > 7.5) {
    float amt = clamp(k, 0.0, 1.2);
    float cell = mix(11.0, 7.5, clamp(k, 0.0, 1.0));
    vec2 p = fract(frag / cell) * 2.0 - 1.0;
    float gray = clamp(luma * 1.15, 0.0, 1.0);
    float n = 0.0;
    n = mix(n, 4194304.0, step(0.08, gray));
    n = mix(n, 131200.0, step(0.18, gray));
    n = mix(n, 332772.0, step(0.30, gray));
    n = mix(n, 15255086.0, step(0.42, gray));
    n = mix(n, 23385164.0, step(0.54, gray));
    n = mix(n, 15252014.0, step(0.66, gray));
    n = mix(n, 13199452.0, step(0.78, gray));
    n = mix(n, 11512810.0, step(0.90, gray));
    float g = asciiGlyph(n, p);
    vec3 ink = mix(cA, col, 0.55);
    ink = mix(ink, vec3(1.0), 0.12) * 1.15;
    vec3 ascii = ink * g;
    col = mix(col * 0.03, ascii, 0.97 * amt);
  }

  col = max(col, vec3(0.0));
  col *= sphereMask;
  gl_FragColor = vec4(col, sphereMask);
}
`;

export const BLUR_SRC = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uOutRes;
uniform vec2 uDir;
uniform float uThresh;

void main() {
  vec2 uv = gl_FragCoord.xy / uOutRes;
  vec2 texel = uDir / uOutRes;
  vec4 acc = vec4(0.0);
  acc += texture2D(uTex, uv) * 0.227027;
  acc += texture2D(uTex, uv + texel) * 0.1945946;
  acc += texture2D(uTex, uv - texel) * 0.1945946;
  acc += texture2D(uTex, uv + texel * 2.0) * 0.1216216;
  acc += texture2D(uTex, uv - texel * 2.0) * 0.1216216;
  acc += texture2D(uTex, uv + texel * 3.0) * 0.054054;
  acc += texture2D(uTex, uv - texel * 3.0) * 0.054054;
  acc += texture2D(uTex, uv + texel * 4.0) * 0.016216;
  acc += texture2D(uTex, uv - texel * 4.0) * 0.016216;
  float lum = max(max(acc.r, acc.g), acc.b);
  float gate = mix(1.0, smoothstep(uThresh, uThresh + 0.22, lum), step(0.001, uThresh));
  gl_FragColor = vec4(acc.rgb * gate, acc.a * gate);
}
`;

export const COMP_SRC = `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uResolution;
uniform vec3 uBg;
uniform float uTransparent;
uniform float uBloomAmt;
uniform float uAberration;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 tg = texture2D(uScene, uv);
  vec3 orb = tg.rgb;
  float a = tg.a;

  vec3 bloom = texture2D(uBloom, uv).rgb;
  float lumBg = dot(uBg, vec3(0.299, 0.587, 0.114));
  float bloomMul = mix(1.0, 0.22, smoothstep(0.45, 0.9, lumBg));
  vec3 glow = bloom * uBloomAmt * 1.15 * bloomMul;

  if (uTransparent < 0.5) {
    vec3 color = uBg * (1.0 - a) + orb + glow;
    gl_FragColor = vec4(color, 1.0);
  } else {
    vec3 color = orb + glow;
    float outA = clamp(a + max(max(glow.r, glow.g), glow.b) * 0.35, 0.0, 1.0);
    gl_FragColor = vec4(color, outA);
  }
}
`;
