// Fitas Betacam SP em 3D (tamanho S e L), modeladas a partir das fotos de referência.
// Eixos locais: X = largura, Y = espessura (−h/2..h/2), Z = profundidade, com a TAMPA no lado −Z
// (é o lado que entra primeiro no videocassete). Unidade: 1 = 10 cm.
import * as THREE from 'three';
import { canvas, rng } from './util.js';
import { texPontilhado, texRoloFita, sombraContato } from './texturas.js';
import { comEnv } from './motor.js';

export const DIM = {
  S: { w: 1.56, d: 0.96, h: 0.25, tampa: 0.095 },
  L: { w: 2.53, d: 1.44, h: 0.25, tampa: 0.105 },
};

// medidas tiradas das fotos (px) -> unidades. sy positivo = lado da tampa.
const REF = {
  S: { x0: 30, x1: 528, y0: 135, y1: 430 },
  L: { x0: 45, x1: 955, y0: 255, y1: 760 },
};
function conv(tipo) {
  const r = REF[tipo], D = DIM[tipo];
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  const kx = D.w / (r.x1 - r.x0), ky = D.d / (r.y1 - r.y0);
  return { x: (px) => (px - cx) * kx, y: (py) => (cy - py) * ky, kx, ky };
}

function poligono(pts) {
  const s = new THREE.Path();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

/** contornos das janelas (em coordenadas da forma: x, y=lado da tampa) */
function janelas(tipo) {
  const c = conv(tipo);
  if (tipo === 'L') {
    const esq = [[145, 410], [320, 410], [320, 655], [150, 655], [105, 610], [105, 450]].map(([a, b]) => [c.x(a), c.y(b)]);
    const dir = esq.map(([a, b]) => [-a, b]).reverse();
    return [esq, dir];
  }
  // S: janela em "D" à esquerda (lado esquerdo em arco)
  const pts = [];
  const xr = c.x(180), yt = c.y(200), yb = c.y(395);
  pts.push([xr, yt], [xr, yb]);
  const cx = c.x(150), cy = (yt + yb) / 2, rx = cx - c.x(50), ry = (yt - yb) / 2;
  for (let i = 0; i <= 18; i++) {
    const a = -Math.PI / 2 - (i / 18) * Math.PI;
    pts.push([cx + Math.cos(a) * rx * 0.98 + 0.02, cy + Math.sin(a) * ry]);
  }
  return [pts];
}

function arredondado(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Pintura da face de cima (cor base, rebaixo da etiqueta, frisos, parafusos) */
function pinturaTopo(tipo) {
  const D = DIM[tipo], c = conv(tipo);
  const PX = 900, W = PX, H = Math.round((PX * D.d) / D.w);
  const cv = canvas(W, H), x = cv.getContext('2d');
  // mapeia coordenada da forma -> pixel (u = x/w + .5, v = y/d + .5; canvas tem v para baixo)
  const U = (sx) => (sx / D.w + 0.5) * W, V = (sy) => (0.5 - sy / D.d) * H;
  x.fillStyle = '#1c1c1f';
  x.fillRect(0, 0, W, H);
  const r = rng(tipo === 'L' ? 11 : 12);
  // variação sutil (sujeira/uso)
  for (let i = 0; i < 70; i++) {
    const g = x.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 30 + r() * 120);
    g.addColorStop(0, `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.035)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  x.strokeStyle = 'rgba(0,0,0,0.6)';
  x.lineWidth = 3;
  if (tipo === 'L') {
    // rebaixo central
    x.fillStyle = '#18181b';
    x.fillRect(U(c.x(325)), V(c.y(405)), U(c.x(675)) - U(c.x(325)), V(c.y(665)) - V(c.y(405)));
    x.strokeRect(U(c.x(325)), V(c.y(405)), U(c.x(675)) - U(c.x(325)), V(c.y(665)) - V(c.y(405)));
    // frisos da pega
    const gx0 = U(c.x(240)), gx1 = U(c.x(755)), gy0 = V(c.y(675)), gy1 = V(c.y(730));
    x.fillStyle = '#151518';
    x.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    for (let i = 0; i < 9; i++) {
      const yy = gy0 + 4 + (i * (gy1 - gy0 - 8)) / 8;
      x.strokeStyle = 'rgba(255,255,255,0.07)';
      x.lineWidth = 2;
      x.beginPath(); x.moveTo(gx0 + 6, yy); x.lineTo(gx1 - 6, yy); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.5)';
      x.beginPath(); x.moveTo(gx0 + 6, yy + 2); x.lineTo(gx1 - 6, yy + 2); x.stroke();
    }
    // parafusos
    for (const py of [425, 640]) {
      const X = U(c.x(492)), Y = V(c.y(py));
      x.fillStyle = '#050506'; x.beginPath(); x.arc(X, Y, 6, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.arc(X - 1, Y - 1, 2, 0, 7); x.fill();
    }
    // linha das abas laterais
    x.strokeStyle = 'rgba(0,0,0,0.55)';
    x.beginPath(); x.moveTo(U(c.x(60)), V(c.y(300))); x.lineTo(U(c.x(940)), V(c.y(300))); x.stroke();
  } else {
    const X0 = U(c.x(188)), X1 = U(c.x(520)), Y0 = V(c.y(195)), Y1 = V(c.y(420));
    x.fillStyle = '#18181b';
    x.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    x.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
    const X = U(c.x(305)), Y = V(c.y(405));
    x.fillStyle = '#050506'; x.beginPath(); x.arc(X, Y, 5, 0, 7); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.55)';
    x.beginPath(); x.moveTo(U(c.x(40)), V(c.y(178))); x.lineTo(U(c.x(520)), V(c.y(178))); x.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // a UV da tampa do Extrude é (x, y) em unidades -> mapeia para 0..1
  // (o corpo foi deslocado de tampa/2 depois de gerar a UV)
  t.repeat.set(1 / D.w, 1 / D.d);
  t.offset.set(0.5, 0.5 - D.tampa / (2 * D.d));
  return t;
}

/** Impressão dourada da tampa: "Anti-Static Lid" + selo BETACAM SP (alfa: branco = dourado). */
export function canvasSelo(w = 760, h = 150, comFundo = false) {
  const cv = canvas(w, h), x = cv.getContext('2d');
  if (comFundo) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); }
  const cor = comFundo ? '#d8b24a' : '#fff';
  x.strokeStyle = cor;
  x.fillStyle = cor;
  const bw = w * 0.66, bh = h * 0.78, bx = (w - bw * 1.0) / 2 - w * 0.12, by = (h - bh) / 2;
  x.lineWidth = h * 0.06;
  x.strokeRect(bx, by, bw + w * 0.24, bh);
  x.font = `italic 800 ${h * 0.6}px "Montserrat"`;
  x.textBaseline = 'middle';
  x.save();
  x.translate(bx + w * 0.035, h / 2 + h * 0.03);
  x.transform(1, 0, -0.18, 1, 0, 0);
  x.fillText('BETACAM', 0, 0);
  x.restore();
  // caixa "SP" cheia
  const sx = bx + bw - w * 0.02, sw = w * 0.26;
  x.fillRect(sx, by, sw, bh);
  x.save();
  x.globalCompositeOperation = comFundo ? 'source-over' : 'destination-out';
  x.fillStyle = comFundo ? '#000' : '#000';
  x.translate(sx + sw * 0.18, h / 2 + h * 0.03);
  x.transform(1, 0, -0.18, 1, 0, 0);
  x.fillText('SP', 0, 0);
  x.restore();
  return cv;
}

function canvasImpressaoTampa(tipo, marca = 'sp') {
  const D = DIM[tipo];
  const W = 2048, H = Math.round((W * D.tampa) / D.w);
  const cv = canvas(W, H), x = cv.getContext('2d');
  x.fillStyle = '#fff';
  x.textBaseline = 'middle';
  const fs = H * 0.5;
  x.font = `italic 700 ${fs}px "Montserrat"`;
  if (marca === 'betamax') {
    x.font = `italic 800 ${fs * 1.1}px "Montserrat"`;
    x.fillText('Betamax', W * 0.03, H * 0.56);
  } else if (marca === 'betacam') {
    x.fillText('BETACAM', W * 0.72, H * 0.56);
    x.font = `600 ${fs * 0.8}px "Montserrat"`;
    x.fillText('OXIDE', W * 0.025, H * 0.56);
  } else if (marca === 'digital' || marca === 'sx') {
    x.font = `italic 800 ${fs}px "Montserrat"`;
    x.fillText(marca === 'digital' ? 'DIGITAL BETACAM' : 'BETACAM SX', W * 0.6, H * 0.56);
  } else {
    x.fillText('Anti-Static Lid', W * 0.025, H * 0.56);
    const sel = canvasSelo(760, 150);
    const sh = H * 0.62, sw = (sh * 760) / 150;
    x.drawImage(sel, W * 0.975 - sw, (H - sh) / 2, sw, sh);
  }
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 8;
  return t;
}

/** Hub do carretel visto de cima. tipo L: anel prateado com dentes brancos; S: cubo bege com raios. */
function canvasHub(tipo) {
  const n = 256, cv = canvas(n, n), x = cv.getContext('2d'), c = n / 2;
  x.clearRect(0, 0, n, n);
  if (tipo === 'L') {
    const g = x.createRadialGradient(c, c, 10, c, c, c);
    g.addColorStop(0, '#9aa0a6'); g.addColorStop(0.5, '#e8ecef'); g.addColorStop(0.85, '#b9bec4'); g.addColorStop(1, '#8d9399');
    x.fillStyle = g; x.beginPath(); x.arc(c, c, c - 2, 0, 7); x.fill();
    x.fillStyle = '#f4f2ea';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      x.beginPath(); x.arc(c + Math.cos(a) * c * 0.72, c + Math.sin(a) * c * 0.72, c * 0.1, 0, 7); x.fill();
    }
    x.fillStyle = '#16181b'; x.beginPath(); x.arc(c, c, c * 0.45, 0, 7); x.fill();
    x.strokeStyle = '#c9cdd2'; x.lineWidth = 6; x.beginPath(); x.arc(c, c, c * 0.45, 0, 7); x.stroke();
  } else {
    x.fillStyle = '#d9d2bd'; x.beginPath(); x.arc(c, c, c - 2, 0, 7); x.fill();
    x.fillStyle = '#b8b09a';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      x.save(); x.translate(c, c); x.rotate(a);
      x.fillRect(c * 0.3, -c * 0.06, c * 0.6, c * 0.12);
      x.restore();
    }
    x.fillStyle = '#efe9d6'; x.beginPath(); x.arc(c, c, c * 0.42, 0, 7); x.fill();
    x.fillStyle = '#2a2824'; x.beginPath(); x.arc(c, c, c * 0.2, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const materiais = {};
function mats() {
  if (materiais.corpo) return materiais;
  const p = texPontilhado(5, 6);
  materiais.corpoLado = new THREE.MeshPhysicalMaterial({ color: '#141416', roughness: 0.58, metalness: 0, normalMap: p.normal, normalScale: new THREE.Vector2(0.35, 0.35), roughnessMap: p.rug, clearcoat: 0.08, clearcoatRoughness: 0.5 });
  materiais.tampa = new THREE.MeshPhysicalMaterial({ color: '#121214', roughness: 0.32, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22, normalMap: p.normal, normalScale: new THREE.Vector2(0.08, 0.08) });
  materiais.janela = new THREE.MeshPhysicalMaterial({ color: '#3a3d42', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 3.2, depthWrite: false, side: THREE.DoubleSide });
  materiais.fundo = new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.8 });
  materiais.ouro = new THREE.MeshStandardMaterial({ color: '#e0b553', metalness: 1, roughness: 0.28, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, envMapIntensity: 1.6 });
  materiais.fita = new THREE.MeshPhysicalMaterial({ color: '#2b1f16', roughness: 0.22, metalness: 0.2, clearcoat: 0.4 });
  materiais.flange = new THREE.MeshPhysicalMaterial({ color: '#59606a', roughness: 0.25, metalness: 0, transparent: true, opacity: 0.4, envMapIntensity: 1.2, depthWrite: false });
  for (const [k, v] of [['corpoLado', 1], ['tampa', 1.1], ['janela', 3.2], ['ouro', 1.6], ['fita', 1], ['flange', 1.5]]) comEnv(materiais[k], v);
  return materiais;
}

/**
 * Cria a fita. Retorna { grupo, tipo, D, tampa (pivô), carreteis: [esq, dir], setTampa(0..1), setCarretel(fração no esquerdo), girar(rad) }
 */
export function criarFita(tipo = 'L', o = {}) {
  const D = DIM[tipo], c = conv(tipo), M = mats();
  const g = new THREE.Group();
  g.name = 'fita' + tipo;
  const bev = 0.012;
  // ---------------- corpo (sem a faixa da tampa)
  const dCorpo = D.d - D.tampa;
  const forma = arredondado(D.w - bev * 2, dCorpo - bev * 2, 0.025);
  forma.holes.push(...janelas(tipo).map((pts) => poligono(pts.map(([a, b]) => [a, b + D.tampa / 2]))));
  const geo = new THREE.ExtrudeGeometry(forma, { depth: D.h - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, -D.tampa / 2, -(D.h - bev * 2) / 2);
  const topoTex = pinturaTopo(tipo);
  const topoMat = M.corpoLado.clone();
  comEnv(topoMat, 1);
  topoMat.map = topoTex;
  topoMat.color.set(o.cor ? new THREE.Color(o.cor).multiplyScalar(6) : '#ffffff');
  const ladoMat = o.cor ? comEnv(Object.assign(M.corpoLado.clone(), {}), 1) : M.corpoLado;
  if (o.cor) ladoMat.color.set(o.cor);
  const corpo = new THREE.Mesh(geo, [topoMat, ladoMat]);
  corpo.rotation.x = -Math.PI / 2;
  corpo.castShadow = true;
  corpo.receiveShadow = true;
  g.add(corpo);

  // fundo interno e janelas
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(D.w - 0.06, dCorpo - 0.06), M.fundo);
  fundo.rotation.x = -Math.PI / 2;
  fundo.position.set(0, -D.h / 2 + 0.025, D.tampa / 2);
  g.add(fundo);
  for (const pts of janelas(tipo)) {
    const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
    const jm = new THREE.Mesh(new THREE.ShapeGeometry(sh), M.janela);
    jm.rotation.x = -Math.PI / 2;
    jm.position.y = D.h / 2 - 0.018;
    jm.renderOrder = 2;
    g.add(jm);
  }

  // ---------------- carretéis
  const carreteis = [];
  const hubR = tipo === 'L' ? 0.14 : 0.094;
  const maxR = tipo === 'L' ? 0.56 : 0.36;
  const centros = tipo === 'L' ? [[c.x(265), c.y(545)], [c.x(735), c.y(545)]] : [[c.x(150), c.y(295)], [c.x(150) + 0.66, c.y(295)]];
  const hubTex = canvasHub(tipo);
  const roloTex = texRoloFita();
  const ladoFita = comEnv(new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: roloTex, roughness: 0.18, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.1 }));
  centros.forEach(([cx, cy], i) => {
    const r = new THREE.Group();
    r.position.set(cx, -D.h / 2 + 0.03, -cy);
    const alt = 0.135;
    const pacote = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, alt, 64, 1, false), [M.fita, ladoFita, ladoFita]);
    pacote.position.y = alt / 2 + 0.012;
    pacote.castShadow = true;
    r.add(pacote);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(maxR + 0.02, maxR + 0.02, 0.008, 64), M.flange);
    flange.position.y = 0.006;
    r.add(flange);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(hubR, hubR, alt + 0.03, 48), [
      comEnv(new THREE.MeshStandardMaterial({ color: tipo === 'L' ? '#b9bec4' : '#cfc7b0', metalness: tipo === 'L' ? 0.8 : 0, roughness: 0.3 })),
      comEnv(new THREE.MeshStandardMaterial({ map: hubTex, metalness: tipo === 'L' ? 0.6 : 0, roughness: 0.3 })),
      new THREE.MeshStandardMaterial({ map: hubTex, roughness: 0.4 }),
    ]);
    hub.position.y = alt / 2 + 0.02;
    r.add(hub);
    r.userData = { pacote, hubR, maxR, alt };
    g.add(r);
    carreteis.push(r);
  });

  // ---------------- tampa (pivô na aresta de trás, em cima)
  const tampa = new THREE.Group();
  tampa.position.set(0, D.h / 2, -D.d / 2 + D.tampa);
  const matTampa = o.cor ? comEnv(M.tampa.clone(), 1.1) : M.tampa;
  if (o.cor) matTampa.color.set(o.cor);
  const tTopo = new THREE.Mesh(new THREE.BoxGeometry(D.w - 0.004, 0.022, D.tampa), matTampa);
  tTopo.position.set(0, -0.011, -D.tampa / 2);
  tTopo.castShadow = true;
  const tFrente = new THREE.Mesh(new THREE.BoxGeometry(D.w - 0.004, D.h - 0.01, 0.02), matTampa);
  tFrente.position.set(0, -(D.h - 0.01) / 2, -D.tampa + 0.01);
  tFrente.castShadow = true;
  const lados = [-1, 1].map((s) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, D.h - 0.01, D.tampa), matTampa);
    l.position.set(s * (D.w / 2 - 0.012), -(D.h - 0.01) / 2, -D.tampa / 2);
    return l;
  });
  const impressao = new THREE.Mesh(new THREE.PlaneGeometry(D.w - 0.02, D.tampa * 0.92), comEnv(M.ouro.clone(), 1.6));
  impressao.material.alphaMap = canvasImpressaoTampa(tipo, o.marca);
  if (o.marca === 'betamax' || o.marca === 'betacam') { impressao.material.color.set('#e8e8e8'); impressao.material.metalness = 0.6; }
  impressao.material.alphaTest = 0.35;
  impressao.material.transparent = false;
  impressao.rotation.x = -Math.PI / 2;
  impressao.position.set(0, 0.0012, -D.tampa / 2);
  tampa.add(tTopo, tFrente, ...lados, impressao);
  g.add(tampa);

  // fita exposta na boca (só aparece com a tampa aberta)
  const boca = new THREE.Mesh(new THREE.PlaneGeometry(D.w * 0.78, 0.127 * 0.9), M.fita);
  boca.position.set(0, 0.0, -D.d / 2 + 0.035);
  g.add(boca);

  // etiqueta de papel opcional
  if (o.etiqueta) {
    const et = etiqueta(o.etiqueta, tipo);
    g.add(et);
  }

  // sombra de contato
  const sc = sombraContato(D.w * 1.25, D.d * 1.35, 0.75);
  sc.position.y = -D.h / 2 + 0.002;
  g.add(sc);

  const api = {
    grupo: g, tipo, D, tampa, carreteis, sombra: sc, corpo, topoMat, ladoMat,
    /** deixa a carcaça translúcida (0 = normal, 1 = quase invisível) */
    setRaioX(v) {
      for (const m of [topoMat, ladoMat, matTampa]) {
        const tr = v > 0.001;
        if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
        m.opacity = 1 - v * 0.85;
        m.depthWrite = !tr;
      }
    },
    setTampa(a) { tampa.rotation.x = a * 1.25; },
    /** f = fração da fita no carretel esquerdo (0..1) */
    setCarretel(f) {
      const rr = (fr) => Math.sqrt(carreteis[0].userData.hubR ** 2 + fr * (carreteis[0].userData.maxR ** 2 - carreteis[0].userData.hubR ** 2));
      const [a, b] = [rr(f), rr(1 - f)];
      carreteis[0].userData.pacote.scale.set(a, 1, a);
      carreteis[1].userData.pacote.scale.set(b, 1, b);
    },
    girar(ang) { carreteis[0].rotation.y = ang; carreteis[1].rotation.y = ang * 0.8; },
    /** estado neutro (cada cena ajusta o que precisa depois) */
    padrao() {
      api.setRaioX(0); api.setTampa(0); api.girar(0);
      g.visible = true; g.scale.setScalar(1); g.rotation.set(0, 0, 0);
      sc.visible = true;
    },
  };
  api.setCarretel(o.fracao ?? 0.92);
  return api;
}

function etiqueta(txt, tipo) {
  const D = DIM[tipo], c = conv(tipo);
  const [x0, x1, y0, y1] = tipo === 'L' ? [c.x(345), c.x(655), c.y(430), c.y(560)] : [c.x(210), c.x(500), c.y(215), c.y(330)];
  const w = x1 - x0, h = y0 - y1;
  const cv = canvas(1024, Math.round((1024 * h) / w)), x = cv.getContext('2d');
  x.fillStyle = '#efe9da';
  x.fillRect(0, 0, cv.width, cv.height);
  x.strokeStyle = 'rgba(70,110,170,0.35)';
  x.lineWidth = 2;
  for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(20, (i * cv.height) / 5); x.lineTo(cv.width - 20, (i * cv.height) / 5); x.stroke(); }
  x.fillStyle = '#b8322a';
  x.fillRect(0, 0, cv.width, cv.height * 0.12);
  x.fillStyle = '#1d2a6b';
  x.font = `700 ${cv.height * 0.2}px "Caveat"`;
  x.textBaseline = 'middle';
  txt.split('\n').forEach((l, i) => x.fillText(l, 40, cv.height * (0.32 + i * 0.22)));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, D.h / 2 + 0.0008, -(y0 + y1) / 2 - D.tampa / 2 + D.tampa / 2);
  // lombada (lado de trás, +Z): etiqueta estreita
  const lc = canvas(1024, 96), lx = lc.getContext('2d');
  lx.fillStyle = '#efe9da'; lx.fillRect(0, 0, 1024, 96);
  lx.fillStyle = '#b8322a'; lx.fillRect(0, 0, 18, 96);
  lx.fillStyle = '#1d2a6b'; lx.font = '700 64px "Caveat"'; lx.textBaseline = 'middle';
  lx.fillText(txt.split('\n').join(' · '), 40, 52);
  const lt = new THREE.CanvasTexture(lc);
  lt.colorSpace = THREE.SRGBColorSpace;
  const lom = new THREE.Mesh(new THREE.PlaneGeometry(D.w * 0.72, D.h * 0.62), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.75 }));
  lom.position.set(0, 0, D.d / 2 + 0.0015);
  const g = new THREE.Group();
  g.add(m, lom);
  return g;
}
