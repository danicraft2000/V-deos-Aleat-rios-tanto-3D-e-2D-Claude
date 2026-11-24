// Peças 3D (Three.js): disco prateado do 4, 3 arcos da RVA Lives, caixas secretas e cartões de calendário.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, canvas } from './util.js';
import { ARCOS, arcGeometry, paintArc, arcMaterial, diskPieces, silverMaterial, rvaTextureCanvas, STRIPES } from './logos.js';
import { font, roundRect, ICON } from './fx.js';

export let renderer, envTex;

export function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  const pm = new THREE.PMREMGenerator(renderer);
  envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
}
export function newScene() {
  const s = new THREE.Scene();
  s.environment = envTex;
  return s;
}
export function camera(fov = 35) {
  return new THREE.PerspectiveCamera(fov, W / H, 0.05, 200);
}
export function draw3D(ctx, scene, cam) {
  renderer.render(scene, cam);
  ctx.drawImage(renderer.domElement, 0, 0);
}
export function lights(scene, o = {}) {
  const key = new THREE.DirectionalLight('#ffffff', o.key ?? 2.2);
  key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight(o.rimColor ?? '#9fc4ff', o.rim ?? 1.5);
  rim.position.set(4, 2, -3);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', o.amb ?? 0.25));
  return { key, rim };
}

// ---------------------------------------------------------------- disco prateado do 4 (+ RVA)
export function buildDisk() {
  const g = new THREE.Group();
  const mat = silverMaterial();
  const pieces = diskPieces().map((p) => {
    const m = new THREE.Mesh(p.geom, mat);
    m.position.set(p.cx, p.cy, 0);
    g.add(m);
    return { mesh: m, cx: p.cx, cy: p.cy, id: p.id };
  });
  const tex = new THREE.CanvasTexture(rvaTextureCanvas());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.95), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  logo.position.z = 0.14;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.95), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: '#000', opacity: 0.35 }));
  sh.position.set(0.03, -0.04, 0.115);
  const logoG = new THREE.Group();
  logoG.add(sh, logo);
  g.add(logoG);
  return { group: g, pieces, logo: logoG };
}
/** Posiciona as peças do disco: p=0 espalhadas (voando), p=1 montadas. */
export function assembleDisk(disk, p, seed = 1) {
  disk.pieces.forEach((pc, i) => {
    const k = Math.min(1, Math.max(0, p * 1.4 - i * 0.08));
    const e = 1 - Math.pow(1 - k, 3);
    const ang = i * 1.7 + seed;
    pc.mesh.position.set(pc.cx + Math.cos(ang) * 4 * (1 - e), pc.cy + Math.sin(ang) * 3 * (1 - e), (1 - e) * 3);
    pc.mesh.rotation.set((1 - e) * (2 + i), (1 - e) * (3 - i), (1 - e) * (i - 2));
  });
}

// ---------------------------------------------------------------- 3 arcos (RVA Lives)
export function buildArcs() {
  const g = new THREE.Group();
  const meshes = ARCOS.map((a) => {
    const geom = arcGeometry(a);
    paintArc(geom, a, a.c1, a.c2);
    const m = new THREE.Mesh(geom, arcMaterial());
    g.add(m);
    return m;
  });
  return { group: g, meshes };
}

// ---------------------------------------------------------------- caixa secreta (lançamento secreto)
function secretFace(label, sub) {
  const c = canvas(512, 512), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#1a1a26');
  g.addColorStop(1, '#07070c');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  // listras arco-íris na borda (fita)
  STRIPES.forEach((col, i) => { x.fillStyle = col; x.fillRect(i * 51.2, 0, 51.2, 14); x.fillRect(i * 51.2, 498, 51.2, 14); });
  x.strokeStyle = 'rgba(255,255,255,0.12)';
  x.lineWidth = 6;
  roundRect(x, 30, 40, 452, 432, 24);
  x.stroke();
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = font(260, 900);
  x.fillStyle = '#ffffff';
  x.shadowColor = '#b06bff';
  x.shadowBlur = 40;
  x.fillText(label, 256, 215);
  x.shadowBlur = 0;
  if (sub && false) {
    x.font = font(44, 900);
    x.fillStyle = '#ff3355';
    x.fillText(sub, 256, 420);
  }
  return c;
}
export function buildSecretBox(label = '?', sub = 'SECRETO') {
  const tex = new THREE.CanvasTexture(secretFace(label, sub));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const emiss = new THREE.CanvasTexture(secretFace(label, sub));
  emiss.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: emiss, emissive: '#ffffff', emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.3 });
  const box = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 6, 0.06), mat);
  const g = new THREE.Group();
  g.add(box);
  // cadeado na frente
  const lc = canvas(256, 256), lx = lc.getContext('2d');
  ICON.lock(lx, 128, 140, 200, '#FFC83D');
  const ltex = new THREE.CanvasTexture(lc);
  ltex.colorSpace = THREE.SRGBColorSpace;
  const lock = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: ltex, transparent: true, toneMapped: false }));
  lock.position.set(0, -0.36, 0.515);
  g.add(lock);
  return { group: g, box, lock, mat };
}

// ---------------------------------------------------------------- cartão plano com textura de canvas
export function buildCard(w, h, drawFn, cw = 1024) {
  const ch = Math.round((cw * h) / w);
  const c = canvas(cw, ch);
  drawFn(c.getContext('2d'), cw, ch);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.0, envMapIntensity: 0.35, side: THREE.DoubleSide });
  mat.toneMapped = false;
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.03, 4, 0.012), [mat, mat, mat, mat, mat, mat]);
  // a caixa arredondada usa um material só; mapeia a textura na frente
  mesh.material = mat;
  return { mesh, canvas: c, tex };
}

export { THREE };
