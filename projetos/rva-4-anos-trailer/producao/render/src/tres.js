// Peças 3D do trailer (Three.js). Reaproveita do projeto RVA 4 Anos: TV de tubo, disco prateado do 4 e os 3 arcos.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { W, H, canvas, rng } from './util.js';
import { ag, fonte } from './tipo.js';
import { ARCO, noiseCanvas, barrasCor, roundRect } from './fx.js';
import { drawRVA, RVA_BOX, ARCOS } from '/rva-4-anos/producao/render/src/logos.js';
export { buildTV, buildDisk, buildArcs, setArcParams, setTex } from '/rva-4-anos/producao/render/src/three3d.js';
export { THREE };

export let renderer, envTex;

export function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const pm = new THREE.PMREMGenerator(renderer);
  envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
}
export function newScene(env = true) {
  const s = new THREE.Scene();
  if (env) s.environment = envTex;
  return s;
}
export const camera = (fov = 35) => new THREE.PerspectiveCamera(fov, W / H, 0.05, 300);
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
function texCanvas(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Logo RVA (V arco-íris) desenhado num canvas qualquer, centrado em (cx, cy) com largura w. */
export function rvaEm(x, cx, cy, w, o = {}) {
  const k = w / RVA_BOX.w;
  x.save();
  x.translate(cx, cy);
  x.scale(k, k);
  x.translate(-RVA_BOX.cx, -RVA_BOX.cy);
  drawRVA(x, { outline: 10, gap: 14, letterShade: true, ...o });
  x.restore();
}

// ------------------------------------------------------------------ fita VHS
const ROTULOS = [
  ['INTERVALO', '2007'], ['VINHETAS', '2004'], ['AGENDA', '2011'], ['JORNAL', '2012'], ['LINK', '2012'], ['BOM DIA', '2012'],
  ['VANGUARDA NEWS', '2008'], ['PLANTÃO', '2015'], ['CHAMADAS', '2006'], ['ARQUIVO', 'RVA'], ['FESTA 20 ANOS', '2023'], ['REDE VANGUARDA', '1998'],
];
function texturaFita(i) {
  const c = canvas(1024, 560), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 560);
  g.addColorStop(0, '#26262c'); g.addColorStop(1, '#0d0d10');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 560);
  // etiqueta
  x.fillStyle = i % 3 === 1 ? '#fff6dc' : '#f4f2ec';
  roundRect(x, 80, 34, 864, 228, 18); x.fill();
  for (let k = 0; k < 10; k++) { x.fillStyle = ARCO[k]; x.fillRect(80, 54 + k * 6, 864, 6); }
  const [rot, ano] = ROTULOS[i % ROTULOS.length];
  x.fillStyle = '#101018';
  x.font = fonte(rot.length > 10 ? 62 : 78, 'b');
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.fillText(ag(rot), 118, 205);
  x.fillStyle = '#c4122f';
  x.font = fonte(46, 'd');
  x.textAlign = 'right';
  x.fillText(ano, 912, 205);
  x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2;
  for (let k = 0; k < 2; k++) { x.beginPath(); x.moveTo(118, 228 + k * 0); x.lineTo(906, 228); x.stroke(); }
  // janela com os carretéis
  x.fillStyle = '#050508';
  roundRect(x, 236, 300, 552, 196, 26); x.fill();
  [[372, 398, 58 + (i % 4) * 12], [652, 398, 92 - (i % 4) * 12]].forEach(([cx, cy, rr]) => {
    x.fillStyle = '#2a1c14'; x.beginPath(); x.arc(cx, cy, rr, 0, 6.283); x.fill();
    x.fillStyle = '#e9e9ee'; x.beginPath(); x.arc(cx, cy, 34, 0, 6.283); x.fill();
    x.fillStyle = '#18181c';
    for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283; x.fillRect(cx + Math.cos(a) * 18 - 5, cy + Math.sin(a) * 18 - 5, 10, 10); }
  });
  const gl = x.createLinearGradient(236, 300, 788, 496);
  gl.addColorStop(0, 'rgba(255,255,255,0.18)'); gl.addColorStop(0.4, 'rgba(255,255,255,0.03)'); gl.addColorStop(1, 'rgba(255,255,255,0.08)');
  x.fillStyle = gl; roundRect(x, 236, 300, 552, 196, 26); x.fill();
  x.fillStyle = '#6b6b75'; x.font = fonte(30, 'b'); x.textAlign = 'left';
  x.fillText('VHS', 96, 530); x.textAlign = 'right'; x.fillText('T-120', 930, 530);
  return texCanvas(c);
}
let _plastico;
export function fitaVHS(i) {
  _plastico ??= new THREE.MeshStandardMaterial({ color: '#1b1b20', roughness: 0.45, metalness: 0.1 });
  const face = new THREE.MeshStandardMaterial({ map: texturaFita(i), roughness: 0.35, metalness: 0.05 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.88, 1.03, 0.25), [_plastico, _plastico, _plastico, _plastico, face, _plastico]);
  return m;
}

/** Túnel de fitas e telas flutuando (cena 'memórias'). */
export function tunelFitas() {
  const g = new THREE.Group();
  const r = rng(77);
  const fitas = [];
  for (let i = 0; i < 52; i++) {
    const m = fitaVHS(i);
    const a = i * 2.39996, rad = 2.3 + r() * 1.3;
    m.position.set(Math.cos(a) * rad * 1.25, Math.sin(a) * rad * 0.78, 4 - i * 1.05);
    m.rotation.set((r() - 0.5) * 0.9, (r() - 0.5) * 1.2, (r() - 0.5) * 1.4);
    m.userData = { a, rad, z0: m.position.z, spin: (r() - 0.5) * 0.6, rx: m.rotation.x, ry: m.rotation.y, rz: m.rotation.z };
    g.add(m);
    fitas.push(m);
  }
  // telas (chiado, barras, arco-íris, RVA)
  const telas = [];
  const noiseT = [0, 1, 2].map((k) => { const t = texCanvas(noiseCanvas(k)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); return t; });
  const tipos = [];
  { const c = canvas(512, 384); barrasCor(c.getContext('2d'), 0, 0, 512, 384); tipos.push(texCanvas(c)); }
  { const c = canvas(512, 384), x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#0b2a8a'); gr.addColorStop(1, '#02071c'); x.fillStyle = gr; x.fillRect(0, 0, 512, 384); rvaEm(x, 256, 192, 380); tipos.push(texCanvas(c)); }
  { const c = canvas(512, 384), x = c.getContext('2d'); for (let k = 0; k < 10; k++) { x.fillStyle = ARCO[k]; x.fillRect(0, k * 38.4, 512, 39); } tipos.push(texCanvas(c)); }
  const molduraMat = new THREE.MeshStandardMaterial({ color: '#202026', roughness: 0.5, metalness: 0.3 });
  for (let i = 0; i < 18; i++) {
    const grp = new THREE.Group();
    const tipo = i % 4;
    const mat = new THREE.MeshBasicMaterial({ map: tipo === 3 ? noiseT[i % 3] : tipos[tipo], toneMapped: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), mat);
    p.position.z = 0.051;
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.35, 0.1), molduraMat);
    grp.add(b, p);
    const a = i * 2.1 + 1.3, rad = 3.6 + r() * 0.8;
    grp.position.set(Math.cos(a) * rad * 1.3, Math.sin(a) * rad * 0.75, 2 - i * 3.0);
    grp.lookAt(0, 0, grp.position.z + 6);
    grp.rotation.z += (r() - 0.5) * 0.5;
    grp.userData = { noise: tipo === 3 ? mat.map : null };
    g.add(grp);
    telas.push(grp);
  }
  // luz no fim do túnel
  const glowC = canvas(256, 256), gx = glowC.getContext('2d');
  const gg = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.25, 'rgba(255,246,220,0.8)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gg; gx.fillRect(0, 0, 256, 256);
  const luz = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({
    map: texCanvas(glowC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  luz.position.set(0, 0, -58);
  g.add(luz);
  const pontos = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight(['#7b5cff', '#33d4f1', '#ff4fa8', '#ffd84a', '#5dff8a', '#518ffe'][i], 30, 14, 1.4);
    l.position.set(Math.cos(i * 2) * 1.5, Math.sin(i * 2) * 1.2, 2 - i * 9);
    g.add(l);
    pontos.push(l);
  }
  return { group: g, fitas, telas, luz, pontos };
}

// ------------------------------------------------------------------ parede de 53 TVs (de 60)
export function paredeTVs() {
  const g = new THREE.Group();
  const r = rng(53);
  const cols = 10, rows = 6;
  const caixa = new THREE.MeshStandardMaterial({ color: '#25252b', roughness: 0.55, metalness: 0.25 });
  const vidroOff = new THREE.MeshStandardMaterial({ color: '#07080b', roughness: 0.15, metalness: 0.6 });
  const noiseT = [0, 1, 2, 3].map((k) => { const t = texCanvas(noiseCanvas(k)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.4, 0.4); return t; });
  // conteúdo de cada canal
  function canalTex(i) {
    const c = canvas(320, 240), x = c.getContext('2d');
    const tipo = i % 6;
    if (tipo === 0) barrasCor(x, 0, 0, 320, 240);
    else if (tipo === 1) { for (let k = 0; k < 10; k++) { x.fillStyle = ARCO[k]; x.fillRect(0, k * 24, 320, 25); } }
    else if (tipo === 2) { const gr = x.createLinearGradient(0, 0, 0, 240); gr.addColorStop(0, '#0b2a8a'); gr.addColorStop(1, '#02071c'); x.fillStyle = gr; x.fillRect(0, 0, 320, 240); rvaEm(x, 160, 120, 230); }
    else if (tipo === 3) { x.fillStyle = ['#ff2d8a', '#00c2f0', '#ff8a00', '#3cd62e', '#9b4dff', '#ffd400'][i % 6]; x.fillRect(0, 0, 320, 240); x.fillStyle = 'rgba(255,255,255,0.9)'; x.font = fonte(70, 'b'); x.textAlign = 'center'; x.fillText(ag('RVA'), 160, 150); }
    else if (tipo === 4) { x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, 320, 240); drawArcos2D(x, 160, 120, 80); }
    else { x.fillStyle = '#101018'; x.fillRect(0, 0, 320, 240); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(160, 120, 80, 0, 6.283); x.stroke(); x.beginPath(); x.moveTo(0, 120); x.lineTo(320, 120); x.moveTo(160, 0); x.lineTo(160, 240); x.stroke(); barrasCor(x, 80, 90, 160, 60); }
    x.font = '34px "VT323"'; x.fillStyle = '#7CFF6B'; x.textAlign = 'left';
    x.fillText(`CH ${String(i + 1).padStart(2, '0')}`, 14, 34);
    return texCanvas(c);
  }
  // logo único (sincronizado)
  const sc = canvas(320, 240), sx = sc.getContext('2d');
  const sg = sx.createLinearGradient(0, 0, 0, 240); sg.addColorStop(0, '#1240c0'); sg.addColorStop(1, '#030a26');
  sx.fillStyle = sg; sx.fillRect(0, 0, 320, 240); rvaEm(sx, 160, 112, 220);
  const syncTex = texCanvas(sc);
  const ordem = Array.from({ length: cols * rows }, (_, i) => i).sort(() => r() - 0.5);
  const monitores = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const ang = (col - (cols - 1) / 2) * 0.085;
      const grp = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.76, 0.7), caixa);
      b.position.z = -0.36;
      const k = ordem.indexOf(idx);
      const aceso = k < 53;
      const tex = aceso ? (k % 7 === 3 ? noiseT[k % 4] : canalTex(k)) : null;
      const telaMat = aceso ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : vidroOff;
      const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.64), telaMat);
      tela.position.z = 0.002;
      const vidro = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.64), vidroOff.clone());
      vidro.material.transparent = true; vidro.material.opacity = 1; vidro.position.z = 0.004;
      grp.add(b, tela, vidro);
      grp.position.set(Math.sin(ang) * 11.5, (row - (rows - 1) / 2) * 0.8 + 0.05, 11.5 - Math.cos(ang) * 11.5);
      grp.rotation.y = -ang;
      g.add(grp);
      monitores.push({ grp, tela, vidro, aceso, ordem: k, tex, noise: tex && noiseT.includes(tex) ? tex : null });
    }
  }
  return { group: g, monitores, syncTex };
}

/** Os 3 arcos (RVA emissora) em 2D. */
export function drawArcos2D(x, cx, cy, s) {
  ARCOS.forEach((a) => {
    const d2r = Math.PI / 180;
    x.beginPath();
    x.arc(cx + a.cx * s, cy - a.cy * s, a.rout * s, -a.a1 * d2r, -a.a0 * d2r);
    x.arc(cx + a.cx * s, cy - a.cy * s, a.rin * s, -a.a0 * d2r, -a.a1 * d2r, true);
    x.closePath();
    const gr = x.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
    gr.addColorStop(0, a.c1); gr.addColorStop(1, a.c2);
    x.fillStyle = gr;
    x.fill();
  });
}

// ------------------------------------------------------------------ caixas lacradas (o segredo)
function texturaCaixa(n) {
  const c = canvas(600, 1040), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 600, 1040);
  g.addColorStop(0, '#1b1c22'); g.addColorStop(1, '#08080b');
  x.fillStyle = g; x.fillRect(0, 0, 600, 1040);
  x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 6; roundRect(x, 24, 24, 552, 992, 22); x.stroke();
  // etiqueta
  x.fillStyle = '#efe9da'; roundRect(x, 70, 250, 460, 470, 16); x.fill();
  x.fillStyle = '#111'; x.font = fonte(44, 'd'); x.textAlign = 'center';
  x.fillText(ag(`ARQUIVO Nº 00${n}`), 300, 320);
  x.fillRect(110, 345, 380, 4);
  x.font = fonte(250, 'b'); x.fillText('???', 300, 590);
  x.font = fonte(40, 'd'); x.fillStyle = '#555'; x.fillText(ag('NÃO ABRIR'), 300, 680);
  // carimbo
  x.save(); x.translate(300, 860); x.rotate(-0.16);
  x.strokeStyle = '#e0102f'; x.lineWidth = 9; roundRect(x, -240, -58, 480, 116, 12); x.stroke();
  x.fillStyle = '#e0102f'; x.font = fonte(64, 'b'); x.fillText(ag('CONFIDENCIAL'), 0, 24);
  x.restore();
  x.fillStyle = '#6a6a74'; x.font = fonte(34, 'b'); x.fillText(ag('REDE VANGUARDA ARQUIVOS'), 300, 140);
  const t = texCanvas(c);
  return t;
}
function texturaFaixa() {
  const c = canvas(1024, 64), x = c.getContext('2d');
  x.fillStyle = '#d90f2b'; x.fillRect(0, 0, 1024, 64);
  x.fillStyle = '#fff'; x.font = fonte(34, 'b'); x.textBaseline = 'middle';
  const wtx = x.measureText(ag('CONFIDENCIAL • ')).width;
  for (let k = 0; k < 4; k++) x.fillText(ag('CONFIDENCIAL • '), 16 + k * wtx, 34);
  return texCanvas(c);
}
function cadeado() {
  const g = new THREE.Group();
  const ouro = new THREE.MeshStandardMaterial({ color: '#d9a63a', metalness: 1, roughness: 0.28 });
  const aco = new THREE.MeshStandardMaterial({ color: '#cfd3da', metalness: 1, roughness: 0.2 });
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.11), ouro);
  const arco = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 14, 36, Math.PI), aco);
  arco.position.y = 0.14;
  const furo = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), new THREE.MeshBasicMaterial({ color: '#111' }));
  furo.rotation.x = Math.PI / 2; furo.position.set(0, -0.02, 0.057);
  g.add(corpo, arco, furo);
  return g;
}
export function caixasSecretas() {
  const g = new THREE.Group();
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#0b0c11', roughness: 0.55, metalness: 0.2 }));
  chao.rotation.x = -Math.PI / 2; chao.position.y = -1.0; chao.receiveShadow = true;
  g.add(chao);
  const lado = new THREE.MeshStandardMaterial({ color: '#141519', roughness: 0.5, metalness: 0.2 });
  const faixaTex = texturaFaixa();
  const caixas = [], vazamentos = [], cadeados = [];
  // vazamento de luz arco-íris (gradiente) — a "pista"
  const lc = canvas(64, 256), lx = lc.getContext('2d');
  const lg = lx.createLinearGradient(0, 0, 0, 256);
  ARCO.forEach((c, k) => lg.addColorStop(k / 9, c));
  lx.fillStyle = lg; lx.fillRect(0, 0, 64, 256);
  lx.globalCompositeOperation = 'destination-in';
  const lm = lx.createLinearGradient(0, 0, 64, 0);
  lm.addColorStop(0, 'rgba(0,0,0,0)'); lm.addColorStop(0.5, 'rgba(0,0,0,1)'); lm.addColorStop(1, 'rgba(0,0,0,0)');
  lx.fillStyle = lm; lx.fillRect(0, 0, 64, 256);
  const lv = lx.createLinearGradient(0, 0, 0, 256);
  lv.addColorStop(0, 'rgba(0,0,0,0)'); lv.addColorStop(0.12, 'rgba(0,0,0,1)'); lv.addColorStop(0.88, 'rgba(0,0,0,1)'); lv.addColorStop(1, 'rgba(0,0,0,0)');
  lx.fillStyle = lv; lx.fillRect(0, 0, 64, 256);
  const leakTex = texCanvas(lc);
  [-1, 1].forEach((s, i) => {
    const cx = new THREE.Group();
    const frente = new THREE.MeshStandardMaterial({ map: texturaCaixa(i + 1), roughness: 0.4, metalness: 0.1 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.0, 0.34), [lado, lado, lado, lado, frente, lado]);
    box.castShadow = true;
    cx.add(box);
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.13, 0.36), new THREE.MeshStandardMaterial({ map: faixaTex, roughness: 0.5 }));
    faixa.rotation.z = s * 0.62; faixa.position.z = 0.005;
    cx.add(faixa);
    const cad = cadeado();
    cad.position.set(0, -0.55, 0.24);
    cx.add(cad);
    cadeados.push(cad);
    // frestas de luz nas bordas
    const leaks = [];
    [[-0.6, 0, 0.05, 2.1, 0], [0.6, 0, 0.05, 2.1, 0], [0, 1.03, 1.25, 0.05, 1]].forEach(([px, py, w, h, horiz]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? w : 0.42, horiz ? 0.42 : h), new THREE.MeshBasicMaterial({
        map: leakTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0,
      }));
      m.position.set(px, py, -0.1);
      if (horiz) m.rotation.z = Math.PI / 2;
      cx.add(m);
      leaks.push(m);
    });
    vazamentos.push(leaks);
    cx.position.set(s * 0.82, 0.0, 0);
    cx.rotation.y = -s * 0.16;
    g.add(cx);
    caixas.push(cx);
  });
  // spot + cone volumétrico
  const spot = new THREE.SpotLight('#fff2dc', 120, 18, 0.42, 0.65, 1.4);
  spot.position.set(0, 5.5, 2.2);
  spot.target.position.set(0, -0.4, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  g.add(spot, spot.target);
  const cc = canvas(64, 256), ccx = cc.getContext('2d');
  const cg = ccx.createLinearGradient(0, 0, 0, 256);
  cg.addColorStop(0, 'rgba(255,240,210,0.0)'); cg.addColorStop(0.15, 'rgba(255,240,210,0.6)'); cg.addColorStop(1, 'rgba(255,240,210,0.0)');
  ccx.fillStyle = cg; ccx.fillRect(0, 0, 64, 256);
  const cone = new THREE.Group(); // feixe de luz é desenhado em 2D (cenas_b.js)
  const luzRara = new THREE.PointLight('#ff6af0', 0, 6, 1.5);
  luzRara.position.set(0, 0.3, 0.9);
  g.add(luzRara);
  g.add(new THREE.AmbientLight('#7a86b8', 0.12));
  return { group: g, caixas, vazamentos, cadeados, spot, cone, luzRara };
}
