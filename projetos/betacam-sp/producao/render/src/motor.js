// Motor de render: WebGL + pós-processamento próprio e leve para render em CPU (SwiftShader):
//   cena (HDR, com profundidade) -> bloom em 1/4 e 1/8 da resolução -> passe final único
//   (profundidade de campo, bloom, tom de filme ACES, aberração cromática, vinheta, risco de luz)
//   -> FXAA + grão de filme na tela.
// Também o estúdio virtual (mapa de ambiente com softboxes, ciclorama, luzes).
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { W, H, canvas } from './util.js';

export let renderer, envTex, envTexDark, envCubo;
/** chaves de desempenho (testes) */
export const CFG = { msaa: 0, bloom: true, dof: true, sombras: true, fxaa: true };
window.__cfg = CFG;
Object.assign(CFG, window.__cfgInicial ?? {});
window.__THREE = THREE;

let rtCena, rtB1, rtB2, rtC1, rtC2, rtFinal;
let qBright, qBlur, qFinal, qFxaa;

const VS = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const brightMat = () => new THREE.ShaderMaterial({
  uniforms: { tCor: { value: null }, uLimiar: { value: 1.0 }, uTexel: { value: new THREE.Vector2() } },
  vertexShader: VS,
  fragmentShader: /* glsl */ `
    uniform sampler2D tCor; uniform float uLimiar; uniform vec2 uTexel; varying vec2 vUv;
    void main(){
      vec3 c = vec3(0.0);
      c += texture2D(tCor, vUv + uTexel*vec2(-1.0,-1.0)).rgb;
      c += texture2D(tCor, vUv + uTexel*vec2( 1.0,-1.0)).rgb;
      c += texture2D(tCor, vUv + uTexel*vec2(-1.0, 1.0)).rgb;
      c += texture2D(tCor, vUv + uTexel*vec2( 1.0, 1.0)).rgb;
      c *= 0.25;
      float l = max(c.r, max(c.g, c.b));
      float k = max(l - uLimiar, 0.0) / max(l, 1e-4);
      gl_FragColor = vec4(c * k, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});

const blurMat = () => new THREE.ShaderMaterial({
  uniforms: { tCor: { value: null }, uDir: { value: new THREE.Vector2() } },
  vertexShader: VS,
  fragmentShader: /* glsl */ `
    uniform sampler2D tCor; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tCor, vUv).rgb * 0.2270;
      c += (texture2D(tCor, vUv + uDir*1.3846).rgb + texture2D(tCor, vUv - uDir*1.3846).rgb) * 0.3162;
      c += (texture2D(tCor, vUv + uDir*3.2308).rgb + texture2D(tCor, vUv - uDir*3.2308).rgb) * 0.0703;
      gl_FragColor = vec4(c, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});

const finalMat = () => new THREE.ShaderMaterial({
  uniforms: {
    tCor: { value: null }, tProf: { value: null }, tB1: { value: null }, tB2: { value: null },
    uNear: { value: 0.05 }, uFar: { value: 120 }, uFoco: { value: 5 }, uAbert: { value: 0 }, uMaxR: { value: 0 },
    uBloom: { value: 0.3 }, uExpo: { value: 1 }, uCA: { value: 0.0025 }, uVig: { value: 0.55 },
    uStreak: { value: 0 }, uStreakY: { value: 0.5 }, uFlash: { value: 0 }, uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(W, H) },
  },
  vertexShader: VS,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tCor, tProf, tB1, tB2;
    uniform float uNear, uFar, uFoco, uAbert, uMaxR, uBloom, uExpo, uCA, uVig, uStreak, uStreakY, uFlash, uTime;
    uniform vec2 uRes;
    varying vec2 vUv;
    float dist(vec2 uv){ float d = texture2D(tProf, uv).x; return -perspectiveDepthToViewZ(d, uNear, uFar); }
    float coc(float z){ return min(uMaxR, abs(z - uFoco) * uAbert); }
    vec3 aces(vec3 color){
      const mat3 ACESInputMat = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
      const mat3 ACESOutputMat = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));
      color *= uExpo / 0.6;
      color = ACESInputMat * color;
      vec3 a = color * (color + 0.0245786) - 0.000090537;
      vec3 b = color * (0.983729 * color + 0.4329510) + 0.238081;
      color = ACESOutputMat * (a / b);
      return clamp(color, 0.0, 1.0);
    }
    vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d*vec2(1.0,0.5625), d*vec2(1.0,0.5625))*4.0;
      vec2 off = d * uCA * (0.4 + r2);
      vec3 c;
      float r0 = 0.0;
      if (uAbert > 0.0) r0 = coc(dist(uv));
      if (r0 > 0.75) {
        // profundidade de campo: espiral de 20 amostras girada por pixel
        float ang0 = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
        vec3 acc = texture2D(tCor, uv).rgb; float wt = 1.0;
        for (int i = 0; i < 20; i++) {
          float fi = float(i) + 0.5;
          float rr = sqrt(fi / 20.0) * r0;
          float a = fi * 2.39996323 + ang0;
          vec2 o = vec2(cos(a), sin(a)) * rr / uRes;
          vec2 su = uv + o;
          float rs = coc(dist(su));
          float w = clamp((rs - rr) * 0.5 + 0.75, 0.0, 1.0);
          acc += texture2D(tCor, su).rgb * w; wt += w;
        }
        c = acc / wt;
        // leve aberração cromática também no desfocado
        c.r = mix(c.r, texture2D(tCor, uv - off).r, 0.25);
      } else {
        c.r = texture2D(tCor, uv - off).r;
        c.g = texture2D(tCor, uv).g;
        c.b = texture2D(tCor, uv + off).b;
      }
      c += (texture2D(tB1, uv).rgb * 0.65 + texture2D(tB2, uv).rgb * 0.55) * uBloom;
      // risco de luz anamórfico (transições)
      float sy = abs(uv.y - uStreakY);
      c += uStreak * vec3(1.0,0.82,0.55) * (exp(-sy*55.0)*3.0 + exp(-sy*9.0)*0.5) * (0.7+0.3*sin(uv.x*3.0+uTime));
      c = aces(c);
      c *= 1.0 - uVig * smoothstep(0.25, 1.35, r2);
      c = mix(c, vec3(1.0,0.97,0.92), uFlash);
      gl_FragColor = vec4(srgb(c), 1.0);
    }`,
  depthTest: false, depthWrite: false,
});

const fxaaMat = () => new THREE.ShaderMaterial({
  uniforms: { tCor: { value: null }, uRes: { value: new THREE.Vector2(W, H) }, uGrain: { value: 0.035 }, uTime: { value: 0 }, uFade: { value: 0 }, uFxaa: { value: 1 } },
  vertexShader: VS,
  fragmentShader: /* glsl */ `
    uniform sampler2D tCor; uniform vec2 uRes; uniform float uGrain, uTime, uFade, uFxaa; varying vec2 vUv;
    float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    float hash(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }
    void main(){
      vec2 px = 1.0 / uRes;
      vec3 rgbM = texture2D(tCor, vUv).rgb;
      vec3 c = rgbM;
      if (uFxaa > 0.5) {
        vec3 rgbNW = texture2D(tCor, vUv + vec2(-1.0,-1.0)*px).rgb;
        vec3 rgbNE = texture2D(tCor, vUv + vec2( 1.0,-1.0)*px).rgb;
        vec3 rgbSW = texture2D(tCor, vUv + vec2(-1.0, 1.0)*px).rgb;
        vec3 rgbSE = texture2D(tCor, vUv + vec2( 1.0, 1.0)*px).rgb;
        float lNW = luma(rgbNW), lNE = luma(rgbNE), lSW = luma(rgbSW), lSE = luma(rgbSE), lM = luma(rgbM);
        float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
        float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
        if (lMax - lMin > max(0.0312, lMax * 0.125)) {
          vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
          float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0/128.0);
          float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
          dir = clamp(dir * rcp, -8.0, 8.0) * px;
          vec3 A = 0.5 * (texture2D(tCor, vUv + dir * (1.0/3.0 - 0.5)).rgb + texture2D(tCor, vUv + dir * (2.0/3.0 - 0.5)).rgb);
          vec3 B = A * 0.5 + 0.25 * (texture2D(tCor, vUv + dir * -0.5).rgb + texture2D(tCor, vUv + dir * 0.5).rgb);
          float lB = luma(B);
          c = (lB < lMin || lB > lMax) ? A : B;
        }
      }
      float n = hash(vUv * uRes + fract(uTime * 7.13) * vec2(91.7, 53.3)) - 0.5;
      float l = luma(c);
      c += n * uGrain * (1.1 - l * 0.7);
      c *= 1.0 - uFade;
      gl_FragColor = vec4(c, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});

export function initMotor() {
  const cv = canvas(W, H);
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = true;

  const dt = new THREE.DepthTexture(W, H);
  dt.type = THREE.UnsignedIntType;
  rtCena = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: CFG.msaa, depthTexture: dt, depthBuffer: true });
  const half = { type: THREE.HalfFloatType, depthBuffer: false };
  rtB1 = new THREE.WebGLRenderTarget(W / 4, H / 4, half);
  rtB2 = new THREE.WebGLRenderTarget(W / 4, H / 4, half);
  rtC1 = new THREE.WebGLRenderTarget(W / 8, H / 8, half);
  rtC2 = new THREE.WebGLRenderTarget(W / 8, H / 8, half);
  rtFinal = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
  for (const r of [rtB1, rtB2, rtC1, rtC2, rtFinal]) { r.texture.minFilter = r.texture.magFilter = THREE.LinearFilter; r.texture.generateMipmaps = false; }
  qBright = new FullScreenQuad(brightMat());
  qBlur = new FullScreenQuad(blurMat());
  qFinal = new FullScreenQuad(finalMat());
  qFxaa = new FullScreenQuad(fxaaMat());

  envTex = studioEnv(1.0);
  envTexDark = studioEnv(0.45);
}

/** Reflexos (PMREM) só onde importam: o env custa caro no render por CPU. */
export function comEnv(m, k = 1) {
  m.envMap = envTex;
  m.envMapIntensity = k;
  m.needsUpdate = true;
  return m;
}

function blur(src, tmp, dst, w, h, k = 1) {
  const u = qBlur.material.uniforms;
  u.tCor.value = src.texture; u.uDir.value.set(k / w, 0);
  renderer.setRenderTarget(tmp); qBlur.render(renderer);
  u.tCor.value = tmp.texture; u.uDir.value.set(0, k / h);
  renderer.setRenderTarget(dst); qBlur.render(renderer);
}

/**
 * Renderiza a cena com a câmera e os parâmetros de lente/pós.
 * o: { dof:{focus,aperture,maxblur}|null, bloom, bloomLimiar, exposure, grain, vig, ca, fade, flash, streak, streakY, t }
 */
export function renderizar(scene, cam, o = {}) {
  renderer.shadowMap.enabled = CFG.sombras;
  renderer.setRenderTarget(rtCena);
  renderer.render(scene, cam);
  // bloom: realces -> 1/4 -> blur; -> 1/8 -> blur
  const bl = CFG.bloom && (o.bloom ?? 0.3) > 0;
  if (bl) {
    qBright.material.uniforms.tCor.value = rtCena.texture;
    qBright.material.uniforms.uLimiar.value = o.bloomLimiar ?? 1.0;
    qBright.material.uniforms.uTexel.value.set(1 / W, 1 / H);
    renderer.setRenderTarget(rtB1); qBright.render(renderer);
    blur(rtB1, rtB2, rtB1, W / 4, H / 4, 1.0);
    qBright.material.uniforms.tCor.value = rtB1.texture;
    qBright.material.uniforms.uLimiar.value = 0.0;
    qBright.material.uniforms.uTexel.value.set(4 / W, 4 / H);
    renderer.setRenderTarget(rtC1); qBright.render(renderer);
    blur(rtC1, rtC2, rtC1, W / 8, H / 8, 1.6);
  }
  const u = qFinal.material.uniforms;
  u.tCor.value = rtCena.texture;
  u.tProf.value = rtCena.depthTexture;
  u.tB1.value = rtB1.texture;
  u.tB2.value = rtC1.texture;
  u.uNear.value = cam.near; u.uFar.value = cam.far;
  if (o.dof && CFG.dof) {
    u.uFoco.value = o.dof.focus;
    u.uAbert.value = (o.dof.aperture ?? 0.002) * W;
    u.uMaxR.value = (o.dof.maxblur ?? 0.008) * W;
  } else u.uAbert.value = 0;
  u.uBloom.value = bl ? (o.bloom ?? 0.3) * 1.6 : 0;
  u.uExpo.value = o.exposure ?? 1.0;
  u.uCA.value = o.ca ?? 0.0022;
  u.uVig.value = o.vig ?? 0.55;
  u.uStreak.value = o.streak ?? 0;
  u.uStreakY.value = o.streakY ?? 0.5;
  u.uFlash.value = o.flash ?? 0;
  u.uTime.value = o.t ?? 0;
  renderer.setRenderTarget(rtFinal);
  qFinal.render(renderer);
  const f = qFxaa.material.uniforms;
  f.tCor.value = rtFinal.texture;
  f.uGrain.value = o.grain ?? 0.03;
  f.uTime.value = o.t ?? 0;
  f.uFade.value = o.fade ?? 0;
  f.uFxaa.value = CFG.fxaa ? 1 : 0;
  renderer.setRenderTarget(null);
  qFxaa.render(renderer);
  return renderer.domElement;
}

/** Mapa de ambiente de estúdio: sala escura com softboxes (gera reflexos realistas em plástico e metal). */
function studioEnv(k) {
  const sc = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.018 * k, 0.019 * k, 0.022 * k), side: THREE.BackSide }));
  room.position.y = 4;
  sc.add(room);
  const box = (w, h, pos, rot, cor, inten) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(inten * k), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(...rot);
    sc.add(m);
  };
  box(9, 5, [0, 11.5, 2], [Math.PI / 2, 0, 0], '#ffffff', 5.0); // softbox de cima
  box(2.2, 9, [-12, 5, 4], [0, Math.PI / 2, 0], '#fff4e6', 4.0); // tira esquerda (quente)
  box(2.2, 9, [12, 5, -2], [0, -Math.PI / 2, 0], '#e6f0ff', 3.2); // tira direita (fria)
  box(10, 2.0, [0, 6, -14], [0, 0, 0], '#ffffff', 2.2); // contraluz
  box(14, 3, [0, 3, 14], [0, Math.PI, 0], '#ffffff', 1.7); // frente suave
  box(30, 30, [0, -3.9, 0], [-Math.PI / 2, 0, 0], '#1a1b1f', 1.0); // chão
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(sc, 0.015).texture;
  pm.dispose();
  if (k === 1) {
    // cubo pequeno (reflexo barato do tampo da mesa)
    const crt = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.1, 100, crt);
    cc.position.set(0, 0.2, 0);
    cc.update(renderer, sc);
    envCubo = crt.texture;
  }
  return tex;
}

// ---------------------------------------------------------------- estúdio
/** Cena nova com ambiente de estúdio, fundo e névoa. */
export function novaCena(o = {}) {
  const s = new THREE.Scene();
  // luz ambiente barata no lugar do mapa de ambiente global
  const hemi = new THREE.HemisphereLight(o.ceu ?? '#c9d2de', o.chao ?? '#16140f', o.amb ?? 0.55);
  s.add(hemi);
  s.userData.hemi = hemi;
  s.background = new THREE.Color(o.fundo ?? '#050507');
  if (o.nevoa !== false) s.fog = new THREE.Fog(o.fundo ?? '#050507', o.nevoaPerto ?? 14, o.nevoaLonge ?? 42);
  return s;
}

/** Ciclorama (fundo infinito curvo) de estúdio fotográfico + mesa escura com brilho. */
export function ciclorama(o = {}) {
  const g = new THREE.Group();
  const larg = o.larg ?? 60, prof = o.prof ?? 30, alt = o.alt ?? 18, r = o.raio ?? 6;
  const P = [];
  P.push([0, 0, prof]);
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI / 2;
    P.push([0, r - r * Math.cos(a), -r * Math.sin(a)]);
  }
  P.push([0, alt, -r]);
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  const nx = 2;
  let acc = 0;
  const lens = [0];
  for (let i = 1; i < P.length; i++) {
    acc += Math.hypot(P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]);
    lens.push(acc);
  }
  for (let i = 0; i < P.length; i++) {
    for (let j = 0; j < nx; j++) {
      pos.push(-larg / 2 + j * larg, P[i][1], P[i][2]);
      uv.push(j, lens[i] / acc);
    }
  }
  for (let i = 0; i < P.length - 1; i++) {
    const a = i * nx, b = (i + 1) * nx;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: o.cor ?? '#1b1c20' });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.position.z = o.z ?? -6;
  g.add(m);
  return g;
}

/** Tampo de mesa escuro, levemente brilhante (para reflexos suaves). */
export function mesa(o = {}) {
  const tex = o.textura;
  void tex;
  const mat = new THREE.MeshPhongMaterial({ color: o.cor ?? '#121316', specular: '#3a3a3a', shininess: o.brilho ?? 60, envMap: envCubo, reflectivity: o.reflexo ?? 0.12, combine: THREE.AddOperation });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.larg ?? 40, o.prof ?? 30), mat);
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

/** Rig de luz de estúdio: principal (spot com sombra suave), preenchimento, contraluz. */
export function luzes(scene, o = {}) {
  const key = new THREE.SpotLight(o.corKey ?? '#fff3e2', o.key ?? 260, 0, o.angulo ?? 0.55, 0.7, 2);
  key.position.set(...(o.posKey ?? [-5, 9, 7]));
  key.target.position.set(...(o.alvo ?? [0, 0, 0]));
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 40;
  const fill = new THREE.DirectionalLight(o.corFill ?? '#cfe0ff', o.fill ?? 0.35);
  fill.position.set(6, 3, 6);
  fill.visible = !!o.fill;
  const rim = new THREE.SpotLight(o.corRim ?? '#bcd4ff', o.rim ?? 180, 0, 0.6, 0.8, 2);
  rim.position.set(...(o.posRim ?? [4, 6, -9]));
  rim.target.position.set(...(o.alvo ?? [0, 0, 0]));
  scene.add(key, key.target, fill, rim, rim.target);
  return { key, fill, rim };
}
