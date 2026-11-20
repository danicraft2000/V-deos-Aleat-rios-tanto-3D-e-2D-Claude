// Peças 3D (Three.js): moedas, troféu, cartões, pedestais, rosca do gráfico, barras, coração, cadeado, fita VHS, tablet.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, canvas } from './util.js';
import { font, roundRect } from './fx.js';

export { THREE };
export let renderer, envTex;

export function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
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
/** Renderiza a cena 3D e desenha por cima do canvas 2D. */
export function draw3D(ctx, scene, cam) {
  renderer.render(scene, cam);
  ctx.drawImage(renderer.domElement, 0, 0);
}
const _v = new THREE.Vector3();
/** Projeta um ponto 3D para pixels da tela. */
export function proj(cam, x, y, z) {
  cam.updateMatrixWorld();
  _v.set(x, y, z).project(cam);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H };
}
export function lookFrom(cam, pos, target) {
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.lookAt(target[0], target[1], target[2]);
}

export function luzes(scene, o = {}) {
  const hemi = new THREE.HemisphereLight('#c8d4ff', '#1a1030', o.amb ?? 0.6);
  const key = new THREE.DirectionalLight('#ffffff', o.key ?? 2.2);
  key.position.set(3, 6, 5);
  const rim = new THREE.DirectionalLight(o.rimColor ?? '#7aa0ff', o.rim ?? 2.0);
  rim.position.set(-5, 3, -4);
  const warm = new THREE.PointLight(o.warmColor ?? '#ffb347', o.warm ?? 25, 30, 1.6);
  warm.position.set(4, 2, 4);
  scene.add(hemi, key, rim, warm);
  return { hemi, key, rim, warm };
}

export function texCanvas(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- materiais
export const ouro = () => new THREE.MeshStandardMaterial({ color: '#ffc94d', metalness: 1, roughness: 0.27, envMapIntensity: 1.3 });
export const plastico = (cor, rough = 0.35) => new THREE.MeshStandardMaterial({ color: cor, roughness: rough, metalness: 0.08 });
export const brilhante = (cor) => new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.22, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12 });

// ---------------------------------------------------------------- piso e sombras
let _blobTex = null;
function blobTex() {
  if (_blobTex) return _blobTex;
  const c = canvas(256, 256), x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  _blobTex = new THREE.CanvasTexture(c);
  return _blobTex;
}
export function sombra(w, d, op = 0.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
/** Piso escuro com brilho no centro e grade fina que some nas bordas. */
export function piso(raio = 14, cor = '#3a4cff') {
  const c = canvas(1024, 1024), x = c.getContext('2d');
  const g = x.createRadialGradient(512, 512, 0, 512, 512, 512);
  g.addColorStop(0, 'rgba(40,52,130,0.95)');
  g.addColorStop(0.55, 'rgba(16,20,60,0.75)');
  g.addColorStop(1, 'rgba(5,7,26,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 1024);
  x.globalCompositeOperation = 'source-atop';
  x.strokeStyle = cor;
  x.globalAlpha = 0.22;
  x.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 64) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(1024, i); x.stroke();
  }
  const tex = texCanvas(c);
  const m = new THREE.Mesh(new THREE.CircleGeometry(raio, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ---------------------------------------------------------------- moedas
function faceMoeda() {
  const c = canvas(256, 256), x = c.getContext('2d');
  const g = x.createRadialGradient(110, 100, 10, 128, 128, 128);
  g.addColorStop(0, '#fff2b0');
  g.addColorStop(0.6, '#f6c445');
  g.addColorStop(1, '#c48a12');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(120,70,0,0.55)';
  x.lineWidth = 10;
  x.beginPath(); x.arc(128, 128, 104, 0, 6.283); x.stroke();
  x.font = font(110, 900);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = 'rgba(120,70,0,0.55)';
  x.fillText('R$', 132, 136);
  x.fillStyle = '#fff1a8';
  x.fillText('R$', 126, 130);
  return texCanvas(c);
}
function ladoMoeda() {
  // borda serrilhada com frisos escuros em cima e embaixo (as pilhas mostram cada moeda)
  const c = canvas(512, 32), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, '#7a5208');
  g.addColorStop(0.18, '#f0c24a');
  g.addColorStop(0.5, '#ffe08a');
  g.addColorStop(0.82, '#e0a92c');
  g.addColorStop(1, '#6a4504');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 32);
  x.fillStyle = 'rgba(90,55,0,0.35)';
  for (let i = 0; i < 512; i += 8) x.fillRect(i, 5, 3, 22);
  return texCanvas(c);
}
/** n moedas instanciadas. set(i, x, y, z, rx, rz, s). */
export function moedas(n, raio = 0.5, alt = 0.1) {
  const geo = new THREE.CylinderGeometry(raio, raio, alt, 48);
  const lado = new THREE.MeshStandardMaterial({ map: ladoMoeda(), metalness: 0.9, roughness: 0.3 });
  const face = new THREE.MeshStandardMaterial({ map: faceMoeda(), metalness: 0.85, roughness: 0.3 });
  const mesh = new THREE.InstancedMesh(geo, [lado, face, face], n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const d = new THREE.Object3D();
  return {
    mesh,
    set(i, x, y, z, rx = 0, rz = 0, s = 1, ry = 0) {
      d.position.set(x, y, z);
      d.rotation.set(rx, ry, rz);
      d.scale.setScalar(s);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    },
    done() { mesh.instanceMatrix.needsUpdate = true; },
  };
}

// ---------------------------------------------------------------- troféu
export function trofeu() {
  const g = new THREE.Group();
  const m = ouro();
  // copo (de cima para baixo: boca larga em y alto)
  const copo = [];
  const pts = [[0.0, 0.0], [0.14, 0.02], [0.32, 0.12], [0.52, 0.38], [0.66, 0.78], [0.72, 1.2], [0.74, 1.32], [0.68, 1.33], [0.66, 1.2], [0.6, 0.8], [0.46, 0.44], [0.0, 0.3]];
  pts.forEach(([r, y]) => copo.push(new THREE.Vector2(r, y)));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(copo, 64), m);
  cup.position.y = 1.35;
  g.add(cup);
  const haste = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0], [0.38, 0], [0.4, 0.06], [0.16, 0.22], [0.1, 0.6], [0.12, 0.9], [0.22, 1.05], [0.3, 1.16], [0.36, 1.22], [0.0, 1.4]].map(([r, y]) => new THREE.Vector2(r, y)), 48), m);
  haste.position.y = 0.32;
  g.add(haste);
  [-1, 1].forEach((s) => {
    const alca = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 16, 40, Math.PI), m);
    alca.position.set(s * 0.7, 2.25, 0);
    alca.rotation.z = -s * Math.PI / 2;
    g.add(alca);
  });
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.34, 1.2, 4, 0.05), new THREE.MeshPhysicalMaterial({ color: '#141836', roughness: 0.25, clearcoat: 1 }));
  base.position.y = 0.17;
  g.add(base);
  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.02), m);
  placa.position.set(0, 0.17, 0.61);
  g.add(placa);
  const estrela = new THREE.Mesh(new THREE.ExtrudeGeometry(formaEstrela(0.26, 0.11), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), m);
  estrela.position.set(0, 2.0, 0.66);
  g.add(estrela);
  return g;
}
function formaEstrela(r1, r0) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? r0 : r1;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

// ---------------------------------------------------------------- cartões
function formaArredondada(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function planoArredondado(w, h, r) {
  const geo = new THREE.ShapeGeometry(formaArredondada(w, h, r), 8);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return geo;
}
/** Cartão 3D: corpo com espessura + frente com textura (canvas). */
export function cartao(w, h, c, o = {}) {
  const g = new THREE.Group();
  const r = o.r ?? Math.min(w, h) * 0.07;
  const corpo = new THREE.Mesh(new THREE.ExtrudeGeometry(formaArredondada(w, h, r), {
    depth: o.esp ?? 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 8,
  }), new THREE.MeshStandardMaterial({ color: o.corpo ?? '#1b2152', roughness: 0.35, metalness: 0.3 }));
  corpo.position.z = -(o.esp ?? 0.06);
  g.add(corpo);
  const tex = texCanvas(c);
  const frente = new THREE.Mesh(planoArredondado(w * 0.985, h * 0.985, r * 0.95), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }));
  frente.position.z = 0.017;
  g.add(frente);
  return { group: g, tex, frente, corpo };
}

/** Pedestal redondo com anel luminoso. */
export function pedestal(cor = '#4d7cff') {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.86, 0.42, 64), new THREE.MeshPhysicalMaterial({ color: '#141a40', roughness: 0.3, clearcoat: 1, metalness: 0.2 }));
  corpo.position.y = 0.21;
  g.add(corpo);
  const anelMat = new THREE.MeshBasicMaterial({ color: cor, toneMapped: false });
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.02, 8, 80), anelMat);
  anel.rotation.x = Math.PI / 2;
  anel.position.y = 0.43;
  g.add(anel);
  return { group: g, anelMat };
}

// ---------------------------------------------------------------- gráfico de rosca e barras
/** Fatia de rosca extrudada para cima (eixo y). Ângulos em radianos. */
export function fatia(r0, r1, a0, a1, alt, cor) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: alt, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 48 });
  const m = new THREE.Mesh(geo, brilhante(cor));
  m.rotation.x = -Math.PI / 2;
  return m;
}
/** Barra com base em y=0 (escalar em y para crescer). */
export function barra(w, d, cor, rr = 0.06) {
  const geo = new RoundedBoxGeometry(w, 1, d, 3, rr);
  geo.translate(0, 0.5, 0);
  return new THREE.Mesh(geo, brilhante(cor));
}

// ---------------------------------------------------------------- coração
export function coracao(cor = '#ff2e63') {
  const s = new THREE.Shape();
  s.moveTo(0, -1.0);
  s.bezierCurveTo(-0.35, -0.68, -1.25, -0.2, -1.1, 0.42);
  s.bezierCurveTo(-0.98, 0.95, -0.3, 1.1, 0, 0.62);
  s.bezierCurveTo(0.3, 1.1, 0.98, 0.95, 1.1, 0.42);
  s.bezierCurveTo(1.25, -0.2, 0.35, -0.68, 0, -1.0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.22, bevelSegments: 10, curveSegments: 40 });
  geo.center();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.5 }));
}

// ---------------------------------------------------------------- cadeado
export function cadeado() {
  const g = new THREE.Group();
  const m = ouro();
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.05, 0.5, 5, 0.14), m);
  g.add(corpo);
  const arco = new THREE.Group();
  const meia = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 16, 40, Math.PI), new THREE.MeshStandardMaterial({ color: '#d7dbea', metalness: 1, roughness: 0.2 }));
  meia.position.y = 0.75;
  arco.add(meia);
  [-0.42, 0.42].forEach((x) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 20), meia.material);
    p.position.set(x, 0.5, 0);
    arco.add(p);
  });
  g.add(arco);
  const furo = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 24), new THREE.MeshBasicMaterial({ color: '#2a1a00' }));
  furo.rotation.x = Math.PI / 2;
  furo.position.set(0, 0.02, 0.26);
  g.add(furo);
  const fenda = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.1), furo.material);
  fenda.position.set(0, -0.12, 0.26);
  g.add(fenda);
  return { group: g, arco };
}

// ---------------------------------------------------------------- fita VHS
export function fitaVHS(etiqueta, corEtiqueta = '#ffffff') {
  const g = new THREE.Group();
  const caixa = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.22, 0.28, 3, 0.04), new THREE.MeshStandardMaterial({ color: '#16161c', roughness: 0.55, metalness: 0.1 }));
  g.add(caixa);
  // janela
  const jan = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshPhysicalMaterial({ color: '#2b2b3a', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.85 }));
  jan.position.set(0, -0.12, 0.141);
  g.add(jan);
  const carreteis = [];
  [-0.38, 0.38].forEach((x) => {
    const c = new THREE.Group();
    const fita = new THREE.Mesh(new THREE.CylinderGeometry(x < 0 ? 0.2 : 0.13, x < 0 ? 0.2 : 0.13, 0.02, 32), new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.4 }));
    fita.rotation.x = Math.PI / 2;
    c.add(fita);
    const cubo = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 6), new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.3 }));
    cubo.rotation.x = Math.PI / 2;
    c.add(cubo);
    c.position.set(x, -0.12, 0.135);
    g.add(c);
    carreteis.push(c);
  });
  // etiqueta
  const lc = canvas(512, 160), lx = lc.getContext('2d');
  lx.fillStyle = corEtiqueta;
  lx.fillRect(0, 0, 512, 160);
  lx.fillStyle = '#e83a3a';
  lx.fillRect(0, 0, 512, 22);
  lx.strokeStyle = 'rgba(0,0,0,0.12)';
  for (let y = 50; y < 160; y += 34) { lx.beginPath(); lx.moveTo(10, y); lx.lineTo(502, y); lx.stroke(); }
  lx.fillStyle = '#1b2a8a';
  lx.font = font(64, 700, 'Caveat');
  lx.textAlign = 'center';
  lx.textBaseline = 'middle';
  lx.fillText(etiqueta, 256, 98);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42), new THREE.MeshStandardMaterial({ map: texCanvas(lc), roughness: 0.8 }));
  lab.position.set(0, 0.32, 0.142);
  g.add(lab);
  return { group: g, carreteis };
}

// ---------------------------------------------------------------- tablet estilizado (tela com canvas animado)
export function tabletEstilizado(c) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(3.4, 2.22, 0.09, 6, 0.04), new THREE.MeshStandardMaterial({ color: '#2a2d36', metalness: 0.7, roughness: 0.3 }));
  g.add(corpo);
  const moldura = new THREE.Mesh(planoArredondado(3.32, 2.14, 0.12), new THREE.MeshBasicMaterial({ color: '#05060a' }));
  moldura.position.z = 0.046;
  g.add(moldura);
  const tex = texCanvas(c);
  const tela = new THREE.Mesh(planoArredondado(3.16, 1.98, 0.06), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  tela.position.z = 0.048;
  g.add(tela);
  // caneta
  const caneta = new THREE.Group();
  const corpoC = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 16), new THREE.MeshStandardMaterial({ color: '#e9e9ee', roughness: 0.3 }));
  caneta.add(corpoC);
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 16), new THREE.MeshStandardMaterial({ color: '#333' }));
  ponta.position.y = -0.81;
  ponta.rotation.x = Math.PI;
  caneta.add(ponta);
  g.add(caneta);
  return { group: g, tex, caneta };
}

/** Desenha um rótulo de canvas pronto para cartão (fundo arredondado). */
export function canvasCartao(w, h, desenhar) {
  const c = canvas(w, h), x = c.getContext('2d');
  desenhar(x, w, h);
  return c;
}
export { roundRect };
