// Mecanismo interno do videocassete: placa do mecanismo, tambor de cabeças, guias de carregamento,
// cabrestante, rolo de pressão, cabeça de áudio/controle, placas de circuito — e a FITA em si,
// que é puxada para fora do cassete e enrolada no tambor (caminho calculado por geometria).
// Coordenadas: as mesmas do videocassete (deck). Vista de cima: x à direita, z negativo = para dentro.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, rng, clamp, lerp, smooth } from './util.js';
import { comEnv } from './motor.js';
import { texEscovado } from './texturas.js';
import { DK } from './deck.js';
import { DIM } from './fita.js';

// posições-chave (deck local)
export const MEC = {
  yPlaca: 0.86,
  fita: { x: 0.575, y: 0.86 + 0.003 + DIM.L.h / 2, z: -1.06 }, // centro da fita L carregada
  tambor: { x: 0.575, z: -2.62, r: 0.3725 },
  yFita: 0.86 + 0.003 + 0.03 + 0.012 + 0.0675, // altura do centro da fita magnética
};

function texPlaca() {
  const n = 1024, c = canvas(n, n), x = c.getContext('2d'), r = rng(31);
  x.fillStyle = '#8d9096';
  x.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.05})`;
    x.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function texPlacaCircuito(seed, w = 1024, h = 512) {
  const c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#1f4a2c';
  x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(190,170,90,0.55)';
  for (let i = 0; i < 260; i++) {
    x.lineWidth = 1 + r() * 2;
    x.beginPath();
    let px = r() * w, py = r() * h;
    x.moveTo(px, py);
    for (let k = 0; k < 4; k++) { if (r() < 0.5) px += (r() - 0.5) * 220; else py += (r() - 0.5) * 160; x.lineTo(px, py); }
    x.stroke();
  }
  x.fillStyle = 'rgba(230,230,220,0.85)';
  x.font = '600 14px "Rajdhani"';
  for (let i = 0; i < 40; i++) x.fillText(['IC', 'R', 'C', 'Q', 'CN'][Math.floor(r() * 5)] + Math.floor(r() * 900), r() * w, r() * h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** textura do topo do tambor: parafusos e marcas (nítida) e versão borrada (girando rápido) */
function texTampoTambor(borrado) {
  const n = 512, c = canvas(n, n), x = c.getContext('2d'), m = n / 2;
  const g = x.createRadialGradient(m, m, 10, m, m, m);
  g.addColorStop(0, '#d9dde2'); g.addColorStop(0.7, '#b8bdc4'); g.addColorStop(1, '#8e949c');
  x.fillStyle = g;
  x.beginPath(); x.arc(m, m, m, 0, 7); x.fill();
  if (borrado) {
    for (let i = 0; i < 6; i++) { x.strokeStyle = `rgba(40,40,45,${0.08 + i * 0.01})`; x.lineWidth = 10; x.beginPath(); x.arc(m, m, m * (0.25 + i * 0.1), 0, 7); x.stroke(); }
  } else {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      x.fillStyle = '#3a3d42'; x.beginPath(); x.arc(m + Math.cos(a) * m * 0.55, m + Math.sin(a) * m * 0.55, 16, 0, 7); x.fill();
      x.strokeStyle = '#d0d4d8'; x.lineWidth = 4; x.beginPath(); x.moveTo(m + Math.cos(a) * m * 0.55 - 10, m + Math.sin(a) * m * 0.55); x.lineTo(m + Math.cos(a) * m * 0.55 + 10, m + Math.sin(a) * m * 0.55); x.stroke();
    }
    x.fillStyle = '#c4202a'; x.fillRect(m - 6, m * 0.12, 12, m * 0.3);
  }
  x.fillStyle = '#2c2f33'; x.beginPath(); x.arc(m, m, m * 0.13, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** textura das trilhas gravadas na fita (diagonais Y e C + trilhas longitudinais nas bordas) */
export function texTrilhas() {
  const w = 2048, h = 256, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#3a2a1e';
  x.fillRect(0, 0, w, h);
  const borda = h * 0.13;
  // diagonais
  x.save();
  x.beginPath(); x.rect(0, borda, w, h - borda * 2); x.clip();
  for (let i = -20; i < 110; i++) {
    const px = i * 26;
    x.strokeStyle = i % 2 === 0 ? 'rgba(80,200,255,0.9)' : 'rgba(255,90,200,0.9)';
    x.lineWidth = 11;
    x.beginPath(); x.moveTo(px, h); x.lineTo(px + 300, 0); x.stroke();
  }
  x.restore();
  // longitudinais
  const lon = [[borda * 0.25, '#ffd24a'], [borda * 0.7, '#ffd24a'], [h - borda * 0.7, '#7dff8a'], [h - borda * 0.25, '#ff8a3a']];
  for (const [y, cor] of lon) { x.strokeStyle = cor; x.lineWidth = 6; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

const M = {};
function mats() {
  if (M.alu) return M;
  const esc = texEscovado(5, 3);
  M.placa = new THREE.MeshStandardMaterial({ color: '#c7cacf', map: texPlaca(), roughness: 0.55, metalness: 0.6 });
  M.alu = comEnv(new THREE.MeshStandardMaterial({ color: '#d4d8dd', roughness: 0.22, metalness: 1, normalMap: esc.normal, normalScale: new THREE.Vector2(0.15, 0.15) }), 1.1);
  M.cromo = comEnv(new THREE.MeshStandardMaterial({ color: '#eef1f4', roughness: 0.08, metalness: 1 }), 1.3);
  M.preto = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 });
  M.borracha = comEnv(new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.45 }), 0.6);
  M.fita = comEnv(new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.3, metalness: 0.25, side: THREE.DoubleSide }), 0.9);
  M.latao = comEnv(new THREE.MeshStandardMaterial({ color: '#c9a35a', roughness: 0.3, metalness: 1 }), 1.2);
  M.chassi = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7, metalness: 0.2 });
  return M;
}

function guia(alt = 0.32, r = 0.022) {
  const mt = mats();
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, alt, 24), mt.cromo);
  p.position.y = alt / 2;
  g.add(p);
  for (const yy of [MEC.yFita - MEC.yPlaca - 0.072, MEC.yFita - MEC.yPlaca + 0.072]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.9, r * 1.9, 0.008, 24), mt.cromo);
    f.position.y = yy;
    g.add(f);
  }
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 2.2, r * 2.6, 0.05, 20), mt.alu);
  b.position.y = 0.025;
  g.add(b);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Monta o mecanismo dentro de dk.interno. Retorna a API de animação. */
export function criarMecanismo(dk) {
  const mt = mats();
  const g = dk.interno;
  const { W, D } = DK;
  const yP = MEC.yPlaca;
  // chassi inferior (aparece quando a tampa sai)
  const chassi = new THREE.Mesh(new THREE.BoxGeometry(W - 0.07, yP - 0.06, D - 0.2), mt.chassi);
  chassi.position.set(0, (yP + 0.04) / 2, -D / 2 - 0.05);
  g.add(chassi);
  // placa do mecanismo
  const placa = new THREE.Mesh(new RoundedBoxGeometry(W - 0.12, 0.04, D - 0.35, 2, 0.015), mt.placa);
  placa.position.set(0, yP - 0.02, -D / 2 - 0.1);
  placa.receiveShadow = true;
  g.add(placa);
  // fundo da frente (por dentro) — blocos em volta da abertura da fita
  const sl = dk.slot;
  const fr = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 });
  const blocos = [
    [-W / 2 + 0.03, sl.x - sl.w / 2, yP, DK.H - 0.03],
    [sl.x + sl.w / 2, W / 2 - 0.03, yP, DK.H - 0.03],
    [sl.x - sl.w / 2, sl.x + sl.w / 2, sl.y + sl.h / 2, DK.H - 0.03],
    [sl.x - sl.w / 2, sl.x + sl.w / 2, yP, sl.y - sl.h / 2],
  ];
  for (const [x0, x1, y0, y1] of blocos) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), fr);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, -0.1);
    g.add(b);
  }
  // placas de circuito e fonte
  const pcb = (w, d, x, z, seed, y = yP + 0.08) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), [mt.preto, mt.preto, new THREE.MeshStandardMaterial({ map: texPlacaCircuito(seed), roughness: 0.5, metalness: 0.1 }), mt.preto, mt.preto, mt.preto]);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    const r = rng(seed);
    for (let i = 0; i < 22; i++) {
      const ci = new THREE.Mesh(new THREE.BoxGeometry(0.06 + r() * 0.16, 0.025, 0.05 + r() * 0.1), r() < 0.8 ? mt.preto : mt.latao);
      ci.position.set(x + (r() - 0.5) * w * 0.85, y + 0.022, z + (r() - 0.5) * d * 0.85);
      ci.castShadow = true;
      g.add(ci);
    }
    for (let i = 0; i < 8; i++) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 16), new THREE.MeshStandardMaterial({ color: ['#1b3f7a', '#1a1a1a', '#6b4b1b'][i % 3], roughness: 0.4, metalness: 0.3 }));
      cap.position.set(x + (r() - 0.5) * w * 0.8, y + 0.055, z + (r() - 0.5) * d * 0.8);
      g.add(cap);
    }
  };
  pcb(3.3, 0.9, 0, -4.0, 7);
  pcb(0.75, 2.6, -1.62, -2.3, 8);
  const fonte = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.9), new THREE.MeshStandardMaterial({ color: '#555a60', roughness: 0.45, metalness: 0.7 }));
  fonte.position.set(1.75, yP + 0.21, -3.95);
  fonte.castShadow = true;
  g.add(fonte);

  // tambor de cabeças (inclinado alguns graus)
  const T = MEC.tambor;
  const tamb = new THREE.Group();
  tamb.position.set(T.x, yP, T.z);
  tamb.rotation.z = 0.06;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 48), mt.alu);
  base.position.y = 0.03;
  const inferior = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.15, 72), mt.alu);
  inferior.position.y = 0.06 + 0.075;
  // rampa helicoidal (degrau) no tambor inferior
  const rampa = new THREE.Mesh(new THREE.TorusGeometry(T.r + 0.004, 0.006, 6, 96, Math.PI * 1.25), mt.cromo);
  rampa.rotation.x = Math.PI / 2;
  rampa.position.y = 0.17;
  const fenda = new THREE.Mesh(new THREE.CylinderGeometry(T.r * 0.985, T.r * 0.985, 0.012, 72), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.5 }));
  fenda.position.y = 0.216;
  const superior = new THREE.Group();
  superior.position.y = 0.222;
  const texN = texTampoTambor(false), texB = texTampoTambor(true);
  const tampoMat = comEnv(new THREE.MeshStandardMaterial({ map: texN, roughness: 0.25, metalness: 0.9 }));
  const sup = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.15, 72), [mt.alu, tampoMat, mt.alu]);
  sup.position.y = 0.075;
  superior.add(sup);
  // cabeças (2 pares, saem um pouco da fenda)
  const cabecas = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.02), mt.latao);
    c.position.set(Math.cos(a) * (T.r + 0.002), -0.005, Math.sin(a) * (T.r + 0.002));
    c.rotation.y = -a;
    superior.add(c);
    cabecas.push(c);
  }
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 32), mt.preto);
  motor.position.y = 0.175;
  superior.add(motor);
  tamb.add(base, inferior, rampa, fenda, superior);
  tamb.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(tamb);

  // guias fixas, cabeça de apagamento, cabeça de áudio/CTL, cabrestante, rolo de pressão
  const P = (x, z) => new THREE.Vector3(x, yP, z);
  const gTensao = guia(); gTensao.position.copy(P(-0.32, -2.05)); g.add(gTensao);
  const apag = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.2, 0.1, 2, 0.015), mt.alu);
  apag.position.copy(P(-0.15, -2.55)).setY(yP + 0.1);
  apag.castShadow = true;
  g.add(apag);
  const audio = new THREE.Group();
  audio.position.copy(P(1.42, -2.7));
  const aBloco = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.24, 0.12, 2, 0.02), mt.alu);
  aBloco.position.y = 0.12;
  const aFace = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.07), mt.latao);
  aFace.position.set(-0.085, MEC.yFita - yP, 0);
  audio.add(aBloco, aFace);
  audio.rotation.y = -0.6;
  audio.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(audio);
  const cabrest = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 24), mt.cromo);
  cabrest.position.copy(P(1.62, -2.3)).setY(yP + 0.18);
  cabrest.castShadow = true;
  g.add(cabrest);
  const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.05, 32), mt.alu);
  capBase.position.copy(P(1.62, -2.3)).setY(yP + 0.025);
  g.add(capBase);
  const rolo = new THREE.Group();
  rolo.position.copy(P(1.62, -2.3));
  const rBraco = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.06), mt.alu);
  rBraco.position.set(0.2, 0.06, 0);
  const rRolo = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 32), mt.borracha);
  rRolo.position.set(0.1, MEC.yFita - yP, 0);
  const rEixo = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 12), mt.cromo);
  rEixo.position.set(0.1, MEC.yFita - yP, 0);
  rolo.add(rBraco, rRolo, rEixo);
  rolo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(rolo);
  // mesas dos carretéis (sob a fita)
  const mesas = [-1, 1].map((s) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 40), mt.alu);
    m.position.copy(P(MEC.fita.x + s * 0.653, MEC.fita.z + 0.107)).setY(yP + 0.015);
    g.add(m);
    return m;
  });
  // postes de carregamento (carrinhos que andam em trilhos)
  const postes = [guia(0.3, 0.02), guia(0.3, 0.02)];
  const carrinhos = postes.map((p) => {
    const c = new THREE.Group();
    const bl = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.04, 0.1, 2, 0.01), mt.preto);
    bl.position.y = 0.02;
    c.add(bl, p);
    g.add(c);
    return c;
  });
  // trilhos pintados na placa
  const trilhoMat = new THREE.MeshBasicMaterial({ color: '#2a2c30' });
  for (const s of [-1, 1]) {
    const tr = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1.25), trilhoMat);
    tr.rotation.x = -Math.PI / 2;
    tr.rotation.z = s * 0.28;
    tr.position.set(T.x + s * 0.5, yP + 0.001, -2.35);
    g.add(tr);
  }

  // ---------------- fita (faixa) com caminho dinâmico
  const NPTS = 220;
  const fitaGeo = new THREE.BufferGeometry();
  const fpos = new Float32Array(NPTS * 2 * 3), fuv = new Float32Array(NPTS * 2 * 2), fidx = [];
  for (let i = 0; i < NPTS - 1; i++) { const a = i * 2; fidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  fitaGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fitaGeo.setAttribute('uv', new THREE.BufferAttribute(fuv, 2));
  fitaGeo.setIndex(fidx);
  const trilhasTex = texTrilhas();
  const fitaMat = mt.fita.clone();
  const fitaMesh = new THREE.Mesh(fitaGeo, fitaMat);
  fitaMesh.castShadow = true;
  fitaMesh.frustumCulled = false;
  g.add(fitaMesh);

  // posições finais e iniciais dos postes
  const F = MEC.fita, Dl = DIM.L;
  const bocaZ = F.z - Dl.d / 2 + 0.03;
  const ini = [new THREE.Vector2(F.x - 0.38, bocaZ + 0.02), new THREE.Vector2(F.x + 0.38, bocaZ + 0.02)];
  const fim = [new THREE.Vector2(T.x - 0.52, T.z - 0.12), new THREE.Vector2(T.x + 0.52, T.z - 0.12)];

  /** caminho 2D (x,z) da fita para um progresso de carregamento p (0..1) */
  function caminho(p) {
    const pts = [];
    const reelL = new THREE.Vector2(F.x - 0.653, F.z + 0.107), reelR = new THREE.Vector2(F.x + 0.653, F.z + 0.107);
    const rL = 0.48, rR = 0.36;
    const bocaL = new THREE.Vector2(F.x - Dl.w / 2 + 0.2, bocaZ), bocaR = new THREE.Vector2(F.x + Dl.w / 2 - 0.2, bocaZ);
    // saída tangente dos carretéis (aproximação)
    pts.push(new THREE.Vector2(reelL.x - rL * 0.3, reelL.y - rL * 0.95));
    pts.push(bocaL);
    const e = smooth(clamp(p));
    const PL = new THREE.Vector2().lerpVectors(ini[0], fim[0], e), PR = new THREE.Vector2().lerpVectors(ini[1], fim[1], e);
    // guia de tensão entra no caminho do lado esquerdo
    const gt = new THREE.Vector2(-0.32, -2.05);
    if (e > 0.25) pts.push(new THREE.Vector2().lerpVectors(new THREE.Vector2(lerp(bocaL.x, PL.x, 0.5), bocaZ - 0.02), gt, smooth(clamp((e - 0.25) / 0.4))));
    pts.push(PL);
    // tambor: se a linha PL-PR passar pelo tambor, contorna pelo lado de perto (+z)
    const C = new THREE.Vector2(T.x, T.z), r = T.r + 0.004;
    const d = new THREE.Vector2().subVectors(PR, PL).normalize();
    const n = new THREE.Vector2(-d.y, d.x);
    const s = new THREE.Vector2().subVectors(C, PL).dot(n);
    if (s > -r) {
      const tang = (Pp, lado) => {
        const v = new THREE.Vector2().subVectors(Pp, C);
        const dd = v.length(), phi = Math.atan2(v.y, v.x), beta = Math.acos(Math.min(1, r / dd));
        const a1 = phi + beta, a2 = phi - beta;
        const z1 = Math.sin(a1), z2 = Math.sin(a2);
        return lado < 0 ? (z1 > z2 ? a1 : a2) : (z1 > z2 ? a1 : a2);
      };
      let a1 = tang(PL, -1), a2 = tang(PR, 1);
      // arco de a1 (esquerda) até a2 (direita) passando por +90°
      while (a1 < a2) a1 += Math.PI * 2;
      const nA = 70;
      for (let i = 0; i <= nA; i++) {
        const a = lerp(a1, a2, i / nA);
        pts.push(new THREE.Vector2(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r));
      }
    }
    pts.push(PR);
    // lado direito: cabeça de áudio -> cabrestante -> boca
    const ae = smooth(clamp((e - 0.55) / 0.45));
    if (ae > 0) {
      pts.push(new THREE.Vector2().lerpVectors(new THREE.Vector2().lerpVectors(PR, bocaR, 0.4), new THREE.Vector2(1.36, -2.62), ae));
      pts.push(new THREE.Vector2().lerpVectors(new THREE.Vector2().lerpVectors(PR, bocaR, 0.75), new THREE.Vector2(1.6, -2.27), ae));
    }
    pts.push(bocaR);
    pts.push(new THREE.Vector2(reelR.x + rR * 0.3, reelR.y - rR * 0.95));
    return pts;
  }

  function reamostra(pts, n) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const tot = L[L.length - 1], out = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = (i / (n - 1)) * tot;
      while (j < pts.length - 2 && L[j + 1] < s) j++;
      const k = (s - L[j]) / Math.max(1e-6, L[j + 1] - L[j]);
      out.push(new THREE.Vector2().lerpVectors(pts[j], pts[j + 1], k));
    }
    return { out, tot };
  }

  const api = {
    grupo: g, tambor: tamb, superior, cabecas, rolo, cabrest, audio, apag, carrinhos, fitaMesh, gTensao,
    texN, texB, tampoMat, trilhasTex, fitaMat,
    /** p = carregamento da fita (0 = dentro do cassete, 1 = enrolada no tambor); desl = deslocamento da fita (anda) */
    setCarregamento(p, desl = 0, trilhas = false) {
      const e = smooth(clamp(p));
      carrinhos.forEach((c, i) => {
        const v = new THREE.Vector2().lerpVectors(ini[i], fim[i], e);
        c.position.set(v.x, yP, v.y);
      });
      const { out, tot } = reamostra(caminho(p), NPTS);
      const hw = 0.0635;
      for (let i = 0; i < NPTS; i++) {
        const v = out[i];
        // inclinação helicoidal no trecho do tambor
        const dc = Math.hypot(v.x - T.x, v.y - T.z);
        const hel = dc < T.r + 0.02 ? (v.x - T.x) * 0.06 * e : 0;
        const y = MEC.yFita + hel;
        fpos.set([v.x, y - hw, v.y, v.x, y + hw, v.y], i * 6);
        const u = ((i / (NPTS - 1)) * tot) / 1.2 + desl;
        fuv.set([u, 0, u, 1], i * 4);
      }
      fitaGeo.attributes.position.needsUpdate = true;
      fitaGeo.attributes.uv.needsUpdate = true;
      fitaGeo.computeVertexNormals();
      fitaMesh.visible = true;
      if (trilhas !== api._trilhas) {
        api._trilhas = trilhas;
        fitaMat.map = trilhas ? trilhasTex : null;
        fitaMat.color.set(trilhas ? '#ffffff' : '#3a2a1e');
        fitaMat.emissive.set(trilhas ? '#ffffff' : '#000000');
        fitaMat.emissiveMap = trilhas ? trilhasTex : null;
        fitaMat.emissiveIntensity = trilhas ? 0.35 : 0;
        fitaMat.needsUpdate = true;
      }
    },
    /** ângulo do tambor; rapido = textura borrada */
    setTambor(ang, rapido) {
      superior.rotation.y = ang;
      const t = rapido ? texB : texN;
      if (tampoMat.map !== t) { tampoMat.map = t; tampoMat.needsUpdate = true; }
    },
    /** rolo de pressão encostado (1) ou afastado (0) */
    setRolo(v) { rolo.rotation.y = lerp(0.9, 0.0, smooth(clamp(v))); },
  };
  api.setCarregamento(0);
  api.setTambor(0, false);
  api.setRolo(0);
  return api;
}
