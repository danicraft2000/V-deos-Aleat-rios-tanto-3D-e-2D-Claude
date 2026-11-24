// Logos da RVA recriados em vetor (2D) e geometria 3D.
// Coordenadas do logo principal vetorizadas do arquivo original (espaço de 1600 px).
import * as THREE from 'three';
import { canvas, clamp, easeOutCubic, easeOutBack } from './util.js';

const R_OUT = [[99,364],[99,1193],[301,1193],[303,934],[467,1194],[696,1194],[514,912],[546,895],[573,878],[623,834],[656,792],[671,763],[680,737],[692,671],[692,602],[688,576],[676,536],[648,485],[607,440],[568,411],[521,387],[468,371],[415,364]];
const R_HOLE = [[303,548],[387,548],[418,552],[449,565],[472,585],[487,612],[492,638],[492,658],[483,695],[460,724],[435,739],[407,747],[301,747]];
const A_OUT = [[1210,416],[1477,416],[1477,1192],[1277,1192],[1275,1084],[1034,1084],[971,1192],[757,1192],[1194,475],[1210,442]];
const A_HOLE = [[1275,692],[1277,937],[1125,939]];
const V_POLY = [[560,386],[1190,386],[1197,412],[707,1196],[640,1196],[520,1010],[520,880],[560,760]];
export const STRIPES = ['#7413FF','#518FFE','#33D4F1','#00F2A0','#7BFC2D','#FEE912','#FFA101','#FF5301','#FF0016','#FD007D'];
// caixa do logo: x 99–1477, y 364–1196
export const RVA_BOX = { x: 99, y: 364, w: 1378, h: 832, cx: 788, cy: 780 };

function path(ctx, pts, move = true) {
  pts.forEach(([x, y], i) => (i === 0 && move ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}
function mix(hex, other, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
  const ch = (v, s) => (v >> s) & 255;
  const r = Math.round(ch(a, 16) * (1 - k) + ch(b, 16) * k);
  const g = Math.round(ch(a, 8) * (1 - k) + ch(b, 8) * k);
  const bl = Math.round(ch(a, 0) * (1 - k) + ch(b, 0) * k);
  return `rgb(${r},${g},${bl})`;
}

/**
 * Desenha o logo RVA (V arco-íris) no espaço de 1600 px.
 * o.stripes: 0..10 (quantas faixas já entraram, fracionário anima)
 * o.r / o.a: 0..1 entrada do R (pela esquerda) e do A (pela direita)
 * o.outline: contorno preto externo (estilo do logo comemorativo)
 */
export function drawRVA(ctx, o = {}) {
  const stripes = o.stripes ?? 10, pr = o.r ?? 1, pa = o.a ?? 1;
  const outline = o.outline ?? 0, gap = o.gap ?? 18;
  const rx = -(1 - easeOutCubic(clamp(pr))) * 900;
  const ax = (1 - easeOutCubic(clamp(pa))) * 900;
  ctx.save();
  ctx.lineJoin = 'round';
  if (outline > 0) {
    ctx.fillStyle = ctx.strokeStyle = '#000';
    ctx.lineWidth = outline * 2;
    if (stripes > 0) { ctx.beginPath(); path(ctx, V_POLY); ctx.stroke(); ctx.fill(); }
  }
  // faixas do V
  const y0 = 386, y1 = 1196, bh = (y1 - y0) / 10;
  ctx.save();
  ctx.beginPath(); path(ctx, V_POLY); ctx.clip();
  for (let i = 0; i < 10; i++) {
    const p = clamp(stripes - i);
    if (p <= 0) continue;
    const e = easeOutBack(p, 2.2);
    const top = y0 + i * bh, slide = (1 - easeOutCubic(p)) * 520 * (i % 2 ? -1 : 1);
    const h = bh * Math.max(0.05, Math.min(1.08, e)) + 1;
    const c = STRIPES[i];
    const g = ctx.createLinearGradient(0, top, 0, top + bh);
    g.addColorStop(0, mix(c, '#ffffff', 0.62));
    g.addColorStop(0.2, mix(c, '#ffffff', 0.12));
    g.addColorStop(0.75, c);
    g.addColorStop(1, mix(c, '#000000', 0.28));
    ctx.globalAlpha = Math.min(1, p * 2.5);
    ctx.fillStyle = g;
    ctx.fillRect(470 + slide, top + (bh - h) / 2, 760, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(470 + slide, top + (bh - h) / 2, 760, 5);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // brilho na borda do V
  if (stripes >= 9.5) {
    ctx.save();
    ctx.globalAlpha = clamp((stripes - 9.5) * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(560, 389); ctx.lineTo(1186, 389); ctx.lineTo(1193, 410); ctx.lineTo(708, 1192); ctx.stroke();
    ctx.restore();
  }
  // R e A (contorno preto separa do V, como no original)
  const letter = (out, hole, dx, p) => {
    if (p <= 0) return;
    ctx.save();
    ctx.translate(dx, 0);
    ctx.globalAlpha = clamp(p * 3);
    ctx.beginPath(); path(ctx, out); path(ctx, hole);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(gap, outline) * 2;
    ctx.stroke();
    ctx.fillStyle = o.letterFill || '#fff';
    ctx.fill('evenodd');
    if (o.letterShade) {
      const g = ctx.createLinearGradient(0, 364, 0, 1196);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(120,130,150,0.35)');
      ctx.fillStyle = g;
      ctx.fill('evenodd');
    }
    ctx.restore();
  };
  letter(R_OUT, R_HOLE, rx, pr);
  letter(A_OUT, A_HOLE, ax, pa);
  ctx.restore();
}

/** Desenha o RVA centrado em (cx, cy) com largura w, com profundidade 2.5D (extrusão). */
const _rvaBuf = canvas(1700, 1000), _rvaTint = canvas(1700, 1000);
export function drawRVA25D(ctx, cx, cy, w, o = {}) {
  const s = 1700 / 1600;
  const b = _rvaBuf.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.clearRect(0, 0, 1700, 1000);
  b.setTransform(s, 0, 0, s, -RVA_BOX.cx * s + 850, -RVA_BOX.cy * s + 500);
  drawRVA(b, o);
  const depth = o.depth ?? 14;
  const k = w / (RVA_BOX.w * s);
  const dw = 1700 * k, dh = 1000 * k;
  ctx.save();
  if (depth > 0) {
    const tctx = _rvaTint.getContext('2d');
    tctx.clearRect(0, 0, 1700, 1000);
    tctx.globalCompositeOperation = 'source-over';
    tctx.drawImage(_rvaBuf, 0, 0);
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = o.depthColor || '#14161c';
    tctx.fillRect(0, 0, 1700, 1000);
    tctx.globalCompositeOperation = 'source-over';
    const dx = o.depthDx ?? 0.55, dy = o.depthDy ?? 1;
    for (let i = depth; i >= 1; i--) ctx.drawImage(_rvaTint, cx - dw / 2 + dx * i, cy - dh / 2 + dy * i, dw, dh);
  }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 40; }
  ctx.drawImage(_rvaBuf, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/** Canvas com o RVA estilo comemorativo (contorno preto) para textura 3D. */
export function rvaTextureCanvas() {
  const c = canvas(1600, 1000);
  const x = c.getContext('2d');
  x.translate(800 - RVA_BOX.cx, 500 - RVA_BOX.cy);
  drawRVA(x, { outline: 12, gap: 16, letterShade: true });
  return c;
}

// ---------------------------------------------------------------- 3 arcos (RVA emissora)
export const ARCOS = [
  { nome: 'vermelho', cx: -0.05, cy: 0.18, rin: 0.47, rout: 0.80, a0: 74, a1: 220, c1: '#F25A12', c2: '#A8140A' },
  { nome: 'azul', cx: 0.25, cy: -0.18, rin: 0.44, rout: 0.77, a0: -50, a1: 95, c1: '#1677D6', c2: '#00307A' },
  { nome: 'verde', cx: -0.15, cy: -0.18, rin: 0.44, rout: 0.83, a0: 203, a1: 330, c1: '#2FA21E', c2: '#0F5A08' },
];
// configuração "anel fechado" (para a transformação no disco do 4)
export const ANEL = [
  { cx: 0, cy: 0, rin: 0.62, rout: 1.0, a0: 60, a1: 180 },
  { cx: 0, cy: 0, rin: 0.62, rout: 1.0, a0: -60, a1: 60 },
  { cx: 0, cy: 0, rin: 0.62, rout: 1.0, a0: 180, a1: 300 },
];

export function arcGeometry(p, depth = 0.2) {
  const d2r = Math.PI / 180;
  const s = new THREE.Shape();
  const a0 = p.a0 * d2r, a1 = p.a1 * d2r;
  s.absarc(p.cx, p.cy, p.rout, a0, a1, false);
  s.absarc(p.cx, p.cy, p.rin, a1, a0, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.045, bevelOffset: -0.045,
    bevelSegments: 5, curveSegments: 64,
  });
  return g;
}
export function paintArc(geom, p, c1, c2) {
  const pos = geom.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const A = new THREE.Color(c1), B = new THREE.Color(c2), tmp = new THREE.Color();
  let a0 = p.a0, a1 = p.a1;
  for (let i = 0; i < pos.count; i++) {
    let ang = (Math.atan2(pos.getY(i) - p.cy, pos.getX(i) - p.cx) * 180) / Math.PI;
    while (ang < a0 - 10) ang += 360;
    while (ang > a1 + 10) ang -= 360;
    const k = clamp((ang - a0) / (a1 - a0));
    tmp.copy(A).lerp(B, k);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
export function arcMaterial() {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.42, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.12,
  });
}

// ---------------------------------------------------------------- disco prateado do "4"
function clipHalf(poly, a, b, c) {
  // mantém a*x + b*y + c >= 0 (Sutherland–Hodgman)
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const fp = a * P[0] + b * P[1] + c, fq = a * Q[0] + b * Q[1] + c;
    if (fp >= 0) out.push(P);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}
function lineThrough(p, q, keep) {
  let a = -(q[1] - p[1]), b = q[0] - p[0];
  let c = -(a * p[0] + b * p[1]);
  if (a * keep[0] + b * keep[1] + c < 0) { a = -a; b = -b; c = -c; }
  return [a, b, c];
}
export function diskPieces() {
  const circle = [];
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    circle.push([Math.cos(a), Math.sin(a)]);
  }
  const L1 = (keep) => lineThrough([0.2175, 0.975], [-0.9825, -0.2375], keep);
  const L2 = (keep) => lineThrough([0.4175, 0.9], [-0.895, -0.4], keep);
  const xl = (v) => [-1, 0, v], xg = (v) => [1, 0, -v], yl = (v) => [0, -1, v], yg = (v) => [0, 1, -v];
  const defs = [
    { id: 'p1', planes: [L1([-1, 1])] },
    { id: 'p2', planes: [L2([0.3, -0.3]), xl(0.4175), yg(-0.4075)] },
    { id: 'p3', planes: [xg(0.58), yg(-0.4075)] },
    { id: 'p4', planes: [xl(0.4175), yl(-0.5125)] },
    { id: 'p5', planes: [xg(0.58), yl(-0.5125)] },
  ];
  return defs.map((d) => {
    let poly = circle.slice();
    for (const [a, b, c] of d.planes) poly = clipHalf(poly, a, b, c);
    let cx = 0, cy = 0;
    poly.forEach(([x, y]) => { cx += x; cy += y; });
    cx /= poly.length; cy /= poly.length;
    const shape = new THREE.Shape();
    poly.forEach(([x, y], i) => (i ? shape.lineTo(x - cx, y - cy) : shape.moveTo(x - cx, y - cy)));
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.03, bevelOffset: -0.03, bevelSegments: 4, curveSegments: 12,
    });
    geom.translate(0, 0, -0.08);
    return { id: d.id, geom, cx, cy };
  });
}
export function silverMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#e6eaf0', metalness: 1.0, roughness: 0.2 });
}
