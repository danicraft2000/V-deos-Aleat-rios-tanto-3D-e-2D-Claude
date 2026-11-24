// Peças compartilhadas pelas cenas: marca "REDE VANGUARDA ARQUIVOS", texto LIVES cromado, calendários,
// cubos de "bloquinho", texto que vira partícula, balões de chat, projeção 3D -> tela.
import { W, H, clamp, lerp, easeOutBack, easeOutCubic, easeInCubic, rng, canvas } from './util.js';
import { font, roundRect, text3D, measure, ICON, RAINBOW } from './fx.js';

export let TL = null;
export const N = {};
export function setTimeline(tl) {
  TL = tl;
  tl.narracao.forEach((n) => (N[n.id] = n.t));
}
/** tempo absoluto de um trecho da narração: at('N1', 3.5) */
export const at = (id, x) => N[id] + x;

// ---------------------------------------------------------------- imagem tingida (logo da Vanguarda é máscara branca)
const _tint = new Map();
export function tinted(img, key, paint) {
  if (_tint.has(key)) return _tint.get(key);
  const c = canvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  paint(x, img.width, img.height);
  _tint.set(key, c);
  return c;
}
export function chromeFill(x, w, h) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#dfe5ee');
  g.addColorStop(0.52, '#8d96a6');
  g.addColorStop(0.6, '#f4f7fb');
  g.addColorStop(1, '#b8c0cc');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}

/** "REDE [VANGUARDA] ARQUIVOS" com o logotipo da Vanguarda enviado. */
export function lockup(ctx, E, cx, cy, h, o = {}) {
  const img = E.img.wordmark;
  const color = o.color ?? '#ffffff';
  const wm = tinted(img, 'wm' + color + (o.chrome ? 'c' : ''), (x, w, hh) => {
    if (o.chrome) chromeFill(x, w, hh); else { x.fillStyle = color; x.fillRect(0, 0, w, hh); }
  });
  const iw = (img.width / img.height) * h;
  const size = h * 0.92;
  const wRede = measure(ctx, 'REDE', size, { fam: 'Montserrat', weight: 900 });
  const wArq = measure(ctx, 'ARQUIVOS', size, { fam: 'Montserrat', weight: 900 });
  const gap = h * 0.35;
  const total = wRede + gap + iw + gap + wArq;
  let x = cx - total / 2;
  const p = o.p ?? 1;
  ctx.save();
  ctx.globalAlpha *= clamp(p * 2);
  const slide = (1 - easeOutCubic(clamp(p))) * 120;
  const tx = { size, depth: o.depth ?? Math.round(h * 0.08), fill: color, chrome: o.chrome, align: 'left', strokeW: o.strokeW ?? h * 0.1 };
  text3D(ctx, 'REDE', x - slide, cy, tx);
  x += wRede + gap;
  ctx.save();
  // sombra/extrusão do logotipo
  const d = o.depth ?? Math.round(h * 0.08);
  const dark = tinted(img, 'wmdark', (xx, w, hh) => { xx.fillStyle = '#0b0b14'; xx.fillRect(0, 0, w, hh); });
  for (let k = d; k >= 1; k--) ctx.drawImage(dark, x + k * 0.55, cy - h / 2 + k, iw, h);
  ctx.drawImage(wm, x, cy - h / 2, iw, h);
  ctx.restore();
  x += iw + gap;
  text3D(ctx, 'ARQUIVOS', x + slide, cy, tx);
  ctx.restore();
  return total;
}

/** Palavra "LIVES" cromada com contorno preto (como no logo enviado). */
export function livesText(ctx, x, y, size, o = {}) {
  return text3D(ctx, 'LIVES', x, y, {
    size, fam: 'Montserrat', weight: 900, chrome: true, stroke: '#000', strokeW: size * 0.16,
    depth: Math.round(size * 0.1), depthColor: (k) => `rgb(${Math.round(60 - k * 40)},${Math.round(64 - k * 40)},${Math.round(72 - k * 40)})`,
    align: o.align ?? 'left', tracking: size * 0.02, sweep: o.sweep, glow: o.glow,
  });
}

/** Mini logo 2D dos 3 arcos (para chips e cartões, sem 3D). */
export function arcs2D(ctx, cx, cy, s, rot = 0) {
  const defs = [
    { a0: 74, a1: 220, c1: '#F25A12', c2: '#A8140A', ox: -0.05, oy: -0.18 },
    { a0: -50, a1: 95, c1: '#1677D6', c2: '#00307A', ox: 0.25, oy: 0.18 },
    { a0: 203, a1: 330, c1: '#2FA21E', c2: '#0F5A08', ox: -0.15, oy: 0.18 },
  ];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  defs.forEach((d) => {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, d.c1);
    g.addColorStop(1, d.c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    // ângulos invertidos no eixo y (canvas cresce para baixo)
    ctx.arc(d.ox * s, d.oy * s, s * 0.8, (-d.a0 * Math.PI) / 180, (-d.a1 * Math.PI) / 180, true);
    ctx.arc(d.ox * s, d.oy * s, s * 0.46, (-d.a1 * Math.PI) / 180, (-d.a0 * Math.PI) / 180, false);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- calendário
export function calendarPage(ctx, w, h, o) {
  // fundo do cartão
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#dfe3ec');
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, w, h, w * 0.06);
  ctx.fill();
  ctx.fillStyle = o.color;
  ctx.save();
  roundRect(ctx, 0, 0, w, h, w * 0.06);
  ctx.clip();
  ctx.fillRect(0, 0, w, h * 0.27);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, h * 0.27 - 8, w, 8);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = font(Math.round(w * 0.12), 900);
  ctx.fillText(o.month, w / 2, h * 0.14);
  ctx.fillStyle = '#141a2e';
  ctx.font = font(Math.round(w * 0.36), 400, 'Anton');
  ctx.fillText(o.year, w / 2, h * 0.57);
  // grade dos dias
  ctx.fillStyle = 'rgba(20,26,46,0.25)';
  for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) {
    roundRect(ctx, w * 0.08 + c * w * 0.122, h * 0.8 + r * h * 0.08, w * 0.09, h * 0.05, 4);
    ctx.fill();
  }
  // argolas
  ctx.fillStyle = '#333944';
  [0.25, 0.75].forEach((k) => { roundRect(ctx, w * k - w * 0.03, -h * 0.02, w * 0.06, h * 0.1, w * 0.03); ctx.fill(); });
}

/** Cubinho isométrico ("bloquinho" de jogo). */
export function isoCube(ctx, x, y, s, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const c = s / 2;
  const top = [[0, -c], [c * 0.87, -c * 0.5], [0, 0], [-c * 0.87, -c * 0.5]];
  const left = [[-c * 0.87, -c * 0.5], [0, 0], [0, c], [-c * 0.87, c * 0.5]];
  const right = [[c * 0.87, -c * 0.5], [0, 0], [0, c], [c * 0.87, c * 0.5]];
  const poly = (pts, f) => { ctx.fillStyle = f; ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fill(); };
  poly(top, shade(color, 1.25));
  poly(left, shade(color, 0.85));
  poly(right, shade(color, 0.6));
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  [top, left, right].forEach((p) => { ctx.beginPath(); p.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.stroke(); });
  ctx.restore();
}
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Balão de chat simples (mensagens genéricas, sem nomes). */
export function chatBubble(ctx, x, y, str, color, a = 1, s = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.font = font(34, 800);
  const w = ctx.measureText(str).width + 110, h = 66;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, -w / 2, -h / 2, w, h, 33);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(-w / 2 + 34, 0, 20, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(-w / 2 + 34, -5, 7, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-w / 2 + 34, 10, 11, 7, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#151827';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, -w / 2 + 66, 2);
  ctx.restore();
}

// ---------------------------------------------------------------- texto em partículas
const _pts = new Map();
export function textPoints(str, size, o = {}) {
  const key = str + size + (o.fam ?? '');
  if (_pts.has(key)) return _pts.get(key);
  const c = canvas(W, 400), x = c.getContext('2d');
  x.font = font(size, o.weight ?? 900, o.fam ?? 'Montserrat');
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = '#fff';
  x.fillText(str, W / 2, 200);
  const d = x.getImageData(0, 0, W, 400).data;
  const pts = [];
  const step = o.step ?? 5;
  for (let yy = 0; yy < 400; yy += step) for (let xx = 0; xx < W; xx += step) {
    if (d[(yy * W + xx) * 4 + 3] > 128) pts.push([xx - W / 2, yy - 200]);
  }
  _pts.set(key, pts);
  return pts;
}
/** Desenha pontos do texto; k=0 formado, k=1 espalhado (vento). */
export function drawParticles(ctx, pts, cx, cy, k, seed, o = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const colors = o.colors ?? ['#ffffff'];
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i];
    const rr = r(), r2 = r(), r3 = r();
    const delay = o.fromLeft ? (px + W / 2) / W * 0.5 : rr * 0.4;
    const kk = clamp((k - delay) / 0.6);
    const e = easeInCubic(kk);
    const x = cx + px + e * (300 + r2 * 900) * (o.dir ?? 1) + Math.sin(i + kk * 6) * 30 * kk;
    const y = cy + py - e * (r3 - 0.3) * 500;
    ctx.globalAlpha = (1 - kk) * (o.alpha ?? 1);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, (o.size ?? 4) * (1 - kk * 0.5), (o.size ?? 4) * (1 - kk * 0.5));
  }
  ctx.restore();
}

// ---------------------------------------------------------------- projeção 3D (câmera em z=10, fov 35)
export const PX_PER_UNIT = H / (2 * 10 * Math.tan((17.5 * Math.PI) / 180));
export const toPx = (x, y) => [W / 2 + x * PX_PER_UNIT, H / 2 - y * PX_PER_UNIT];
export const toWorld = (px, py) => [(px - W / 2) / PX_PER_UNIT, -(py - H / 2) / PX_PER_UNIT];

/** Barra de cronograma (rodapé): DEZ 2026 — JAN 2027 — 30/01. ativo: 0, 1 ou 2 (fracionário anima). */
export function trackerBar(ctx, ativo, a = 1) {
  if (a <= 0) return;
  const yl = 1040, yt = 1008, xs = [700, 960, 1220];
  const labels = ['DEZ 2026', 'JAN 2027', '30/01 · SECRETO'];
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(8,8,20,0.78)';
  roundRect(ctx, 560, 982, 800, 82, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(xs[0], yl); ctx.lineTo(xs[2], yl); ctx.stroke();
  const g = ctx.createLinearGradient(xs[0], 0, xs[2], 0);
  RAINBOW.forEach((c, i) => g.addColorStop(i / 9, c));
  ctx.strokeStyle = g;
  ctx.beginPath(); ctx.moveTo(xs[0], yl); ctx.lineTo(lerp(xs[0], xs[2], clamp(ativo / 2)), yl); ctx.stroke();
  xs.forEach((x, i) => {
    const on = ativo >= i - 0.01;
    const cur = Math.abs(ativo - i) < 0.5;
    const col = i === 2 ? '#FFC83D' : '#ffffff';
    ctx.fillStyle = on ? col : 'rgba(255,255,255,0.3)';
    if (cur) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
    ctx.beginPath(); ctx.arc(x, yl, cur ? 10 : 7, 0, 6.283); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = font(cur ? 22 : 19, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cur ? col : 'rgba(255,255,255,0.55)';
    ctx.fillText(labels[i], x, yt);
  });
  ctx.restore();
}
