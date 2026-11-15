// Peças 3D (Three.js): TV de tubo, corredor de monitores, cartões, DVD, disco do 4, arcos.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { W, H, canvas, rng } from './util.js';
import { ARCOS, arcGeometry, paintArc, arcMaterial, diskPieces, silverMaterial, rvaTextureCanvas } from './logos.js';
import { noiseCanvas, font } from './fx.js';

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
  const c = new THREE.PerspectiveCamera(fov, W / H, 0.05, 200);
  return c;
}
/** Renderiza a cena 3D e desenha por cima do canvas 2D. */
export function draw3D(ctx, scene, cam) {
  renderer.render(scene, cam);
  ctx.drawImage(renderer.domElement, 0, 0);
}

// textura a partir de imagem/canvas, com corte "cover" para a proporção do plano
export function imgTexture() {
  const t = new THREE.Texture();
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}
export function setTex(tex, img, aspect) {
  if (!img) return;
  if (tex.image !== img) {
    if (tex.image && (tex.image.width !== img.width || tex.image.height !== img.height)) tex.dispose();
    tex.image = img;
    tex.needsUpdate = true;
  }
  const ia = (img.width || 1) / (img.height || 1);
  if (ia > aspect) { tex.repeat.set(aspect / ia, 1); tex.offset.set((1 - aspect / ia) / 2, 0); }
  else { tex.repeat.set(1, ia / aspect); tex.offset.set(0, (1 - ia / aspect) / 2); }
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ---------------------------------------------------------------- TV de tubo
export function buildTV() {
  const g = new THREE.Group();
  const plastic = new THREE.MeshStandardMaterial({ color: '#5a4a3c', roughness: 0.45, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1a1a1d', roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(2.0, 1.56, 0.2), {
    depth: 1.2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 5, curveSegments: 12,
  }), plastic);
  body.position.z = -1.2;
  g.add(body);
  // traseira afunilada (tubo)
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.8), plastic);
  back.position.z = -1.6;
  g.add(back);
  // moldura da tela
  const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(1.5, 1.18, 0.16), {
    depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3,
  }), dark);
  bezel.position.set(-0.2, 0, 0.06);
  g.add(bezel);
  // tela curva
  const sg = new THREE.PlaneGeometry(1.36, 1.02, 24, 18);
  const p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / 0.68, y = p.getY(i) / 0.51;
    p.setZ(i, 0.07 * (1 - x * x * 0.6) * (1 - y * y * 0.6));
  }
  sg.computeVertexNormals();
  const tex = imgTexture();
  const screen = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(-0.2, 0, 0.11);
  g.add(screen);
  // reflexo do vidro
  const rc = canvas(256, 256), rx = rc.getContext('2d');
  const gr = rx.createLinearGradient(0, 0, 256, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.08)');
  gr.addColorStop(0.36, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(255,255,255,0.05)');
  rx.fillStyle = gr;
  rx.fillRect(0, 0, 256, 256);
  const glass = new THREE.Mesh(sg.clone(), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(rc), transparent: true, blending: THREE.AdditiveBlending, opacity: 0.5, depthWrite: false,
  }));
  glass.position.set(-0.2, 0, 0.125);
  g.add(glass);
  // painel lateral: botões e alto-falante
  const knobMat = new THREE.MeshStandardMaterial({ color: '#c9c3b8', roughness: 0.3, metalness: 0.6 });
  [0.32, 0.0].forEach((y) => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.08, 32), knobMat);
    k.rotation.x = Math.PI / 2;
    k.position.set(0.76, y, 0.12);
    g.add(k);
  });
  for (let i = 0; i < 5; i++) {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.022, 0.02), dark);
    sl.position.set(0.76, -0.25 - i * 0.07, 0.09);
    g.add(sl);
  }
  // antena
  const metal = new THREE.MeshStandardMaterial({ color: '#d8d8d8', metalness: 1, roughness: 0.25 });
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  base.position.set(0, 0.86, -0.6);
  g.add(base);
  [-0.45, 0.45].forEach((a) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 1.3, 12), metal);
    rod.position.set(Math.sin(a) * 0.65, 0.86 + Math.cos(a) * 0.65, -0.6);
    rod.rotation.z = -a;
    g.add(rod);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), metal);
    tip.position.set(Math.sin(a) * 1.3, 0.86 + Math.cos(a) * 1.3, -0.6);
    g.add(tip);
  });
  // pés
  [-0.7, 0.7].forEach((x) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.5), dark);
    f.position.set(x, -0.86, -0.5);
    g.add(f);
  });
  return { group: g, tex, screen };
}

// ---------------------------------------------------------------- corredor de monitores (a busca)
export function buildCorridor() {
  const g = new THREE.Group();
  const noiseTex = [0, 1, 2, 3].map((i) => {
    const t = new THREE.CanvasTexture(noiseCanvas(i));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  // barras de cor
  const bc = canvas(256, 192), bx = bc.getContext('2d');
  ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].forEach((c, i) => {
    bx.fillStyle = c; bx.fillRect((i * 256) / 7, 0, 256 / 7 + 1, 140);
  });
  bx.fillStyle = '#111'; bx.fillRect(0, 140, 256, 52);
  bx.fillStyle = '#fff'; bx.font = '700 22px monospace'; bx.fillText('SEM SINAL', 70, 172);
  const barsTex = new THREE.CanvasTexture(bc);
  barsTex.colorSpace = THREE.SRGBColorSpace;
  const boxMat = new THREE.MeshStandardMaterial({ color: '#2b2a2e', roughness: 0.5, metalness: 0.2 });
  const r = rng(42);
  const screens = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < 16; i++) {
        const z = -i * 1.15, y = -0.85 + row * 0.95, x = side * 1.75;
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.78, 0.9), boxMat);
        b.position.set(x + side * 0.1, y, z);
        g.add(b);
        const useBars = r() < 0.18;
        const mat = new THREE.MeshBasicMaterial({ map: useBars ? barsTex : noiseTex[Math.floor(r() * 4)], toneMapped: false });
        mat.color.setScalar(0.55 + r() * 0.45);
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.56), mat);
        s.position.set(x - side * 0.36, y, z);
        s.rotation.y = -side * Math.PI / 2;
        g.add(s);
        screens.push(s);
      }
    }
  }
  // piso brilhante
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 40), new THREE.MeshStandardMaterial({ color: '#0a0c12', metalness: 0.6, roughness: 0.25 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.32, -15);
  g.add(floor);
  // luz no fim do corredor
  const glowC = canvas(256, 256), gx = glowC.getContext('2d');
  const gg = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.3, 'rgba(255,240,200,0.6)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gg; gx.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(glowC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  glow.position.set(0, 0, -19);
  g.add(glow);
  // teto com faixas de luz
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 40), new THREE.MeshStandardMaterial({ color: '#07080d', roughness: 0.8 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.55, -15);
  g.add(ceil);
  for (let i = 0; i < 12; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.35), new THREE.MeshBasicMaterial({ color: '#bfe0ff', toneMapped: false }));
    strip.position.set(0, 3.5, 2 - i * 3);
    g.add(strip);
  }
  const lights = [];
  for (let i = 0; i < 5; i++) {
    const l = new THREE.PointLight(i % 2 ? '#4aa3ff' : '#9a6bff', 14, 9, 1.2);
    l.position.set(0, 2.6, -i * 4);
    g.add(l);
    lights.push(l);
  }
  return { group: g, noiseTex, glow, lights };
}

// ---------------------------------------------------------------- cartão com vídeo
export function buildCard(w = 1.6, h = 0.9) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.03), new THREE.MeshStandardMaterial({ color: '#f4f4f6', roughness: 0.35 }));
  frame.position.z = -0.02;
  g.add(frame);
  const tex = imgTexture();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  plane.position.z = 0.0;
  g.add(plane);
  return { group: g, tex, aspect: w / h };
}

// ---------------------------------------------------------------- DVD
export function buildDVD() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.1, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const discGeom = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 96 });
  const dc = canvas(512, 512), dx = dc.getContext('2d');
  const cg = dx.createConicGradient(0, 256, 256);
  ['#ffb3e6', '#b3c6ff', '#b3fff0', '#f6ffb3', '#ffd0b3', '#e0b3ff', '#b3e6ff', '#d9ffb3', '#ffb3e6'].forEach((c, i, a) => cg.addColorStop(i / (a.length - 1), c));
  dx.fillStyle = cg; dx.fillRect(0, 0, 512, 512);
  const rg = dx.createRadialGradient(256, 256, 30, 256, 256, 256);
  rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.32, 'rgba(255,255,255,0.0)'); rg.addColorStop(1, 'rgba(255,255,255,0.15)');
  dx.fillStyle = rg; dx.fillRect(0, 0, 512, 512);
  const discTex = new THREE.CanvasTexture(dc);
  discTex.colorSpace = THREE.SRGBColorSpace;
  discTex.repeat.set(0.5, 0.5); discTex.offset.set(0.5, 0.5);
  const disc = new THREE.Mesh(discGeom, new THREE.MeshPhysicalMaterial({
    map: discTex, metalness: 0.85, roughness: 0.08, iridescence: 1, iridescenceIOR: 2.0, iridescenceThicknessRange: [250, 1000],
    clearcoat: 1, clearcoatRoughness: 0.05,
  }));
  // anel central transparente
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.3, 64), new THREE.MeshPhysicalMaterial({ color: '#cfd8e0', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.7 }));
  ring.position.z = 0.03;
  const discG = new THREE.Group();
  discG.add(disc, ring);
  g.add(discG);
  // capa do DVD
  const cc = canvas(512, 720), cx = cc.getContext('2d');
  const gr = cx.createLinearGradient(0, 0, 512, 720);
  gr.addColorStop(0, '#1b1f3a'); gr.addColorStop(1, '#05060c');
  cx.fillStyle = gr; cx.fillRect(0, 0, 512, 720);
  ['#9B4DFF', '#518FFE', '#33D4F1', '#00E39A', '#7BFC2D', '#FFD400', '#FFA101', '#FF5301', '#FF1744', '#FF2D8A'].forEach((c, i) => {
    cx.fillStyle = c; cx.fillRect(0, 300 + i * 14, 512, 10);
  });
  cx.fillStyle = '#fff'; cx.textAlign = 'center';
  cx.font = font(64, 900); cx.fillText('VINHETAS', 256, 160);
  cx.font = font(110, 900); cx.fillText('2004', 256, 270);
  cx.font = font(34, 800); cx.fillStyle = '#FFD400'; cx.fillText('ARQUIVO RARO', 256, 520);
  cx.font = font(46, 900); cx.fillStyle = '#fff'; cx.fillText('DVD', 256, 640);
  const coverTex = new THREE.CanvasTexture(cc);
  coverTex.colorSpace = THREE.SRGBColorSpace;
  const caseMat = new THREE.MeshStandardMaterial({ color: '#111216', roughness: 0.4 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.0, 0.14), [caseMat, caseMat, caseMat, caseMat,
    new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.3 }), caseMat]);
  g.add(box);
  return { group: g, disc: discG, box };
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
  // sombra do logo sobre o disco
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.95), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: '#000', opacity: 0.35 }));
  sh.position.set(0.03, -0.04, 0.115);
  const logoG = new THREE.Group();
  logoG.add(sh, logo);
  g.add(logoG);
  return { group: g, pieces, logo: logoG };
}

// ---------------------------------------------------------------- 3 arcos (geometria refeita a cada quadro na transformação)
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
export function setArcParams(arcs, params) {
  arcs.meshes.forEach((m, i) => {
    m.geometry.dispose();
    const geom = arcGeometry(params[i]);
    paintArc(geom, params[i], ARCOS[i].c1, ARCOS[i].c2);
    m.geometry = geom;
  });
}

// ---------------------------------------------------------------- texto 3D "argila" (prévia do Blender)
let _font = null;
export async function loadFont3D() {
  _font = await new FontLoader().loadAsync('/producao/render/node_modules/three/examples/fonts/helvetiker_bold.typeface.json');
}
export function buildClayText() {
  const g = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({ color: '#b9bcc4', roughness: 0.55, metalness: 0.1 });
  [['VAN', 0.62], ['GUAR', 0], ['DA', -0.62]].forEach(([t, y], i) => {
    const geom = new TextGeometry(t, { font: _font, size: 0.5, depth: 0.22, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 3 });
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    geom.translate(-(bb.max.x - bb.min.x) / 2 + [0.1, -0.05, 0.35][i], y - 0.25, 0);
    g.add(new THREE.Mesh(geom, clay));
  });
  // grade de chão
  const grid = new THREE.GridHelper(8, 32, '#5c6070', '#33363f');
  grid.position.y = -1.15;
  g.add(grid);
  return g;
}

export function lightsBasic(scene, o = {}) {
  const key = new THREE.DirectionalLight('#ffffff', o.key ?? 2.2);
  key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight(o.rimColor ?? '#9fc4ff', o.rim ?? 1.5);
  rim.position.set(4, 2, -3);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', o.amb ?? 0.25));
  return { key, rim };
}
export { THREE };
