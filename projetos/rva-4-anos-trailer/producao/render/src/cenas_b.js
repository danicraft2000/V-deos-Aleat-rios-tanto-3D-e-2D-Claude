// Cenas 9–13 do trailer (41 – 102,8 s): montagem, o segredo, a revelação do "???", "em breve" e o título final.
import { W, H, clamp, lerp, prog, easeOutCubic, easeInCubic, easeInOutCubic, easeOutBack, easeOutExpo, easeInExpo, rng, wobble, shakes, janela } from './util.js';
import * as F from './fx.js';
import { texto, titulo, medir } from './tipo.js';
import * as T from './tres.js';
import { G, odometro, palavras, fundoPadrao, segredoSet, discoSet, interrogacoes } from './comum.js';
import { drawRVA25D, ARCOS, ANEL } from '/rva-4-anos/producao/render/src/logos.js';

// ================================================================== ícones da montagem
const BG = ['#5b10d6', '#1268e0', '#008fb0', '#00905a', '#4a9e14', '#d08f00', '#e06200', '#d83400', '#c4002c', '#c00068'];

function icTV(ctx, s, lt) {
  const w = s * 0.92, h = s * 0.72;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#6b5a4a'); g.addColorStop(1, '#3a2f27');
  ctx.fillStyle = g;
  F.roundRect(ctx, -w / 2, -h / 2 + 30, w, h, 34); ctx.fill();
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-20, -h / 2 + 30); ctx.lineTo(-110, -h / 2 - 90); ctx.moveTo(20, -h / 2 + 30); ctx.lineTo(100, -h / 2 - 100); ctx.stroke();
  const sw = w * 0.72, sh = h * 0.72, sx = -w / 2 + 34, sy = -h / 2 + 30 + (h - sh) / 2;
  ctx.save();
  F.roundRect(ctx, sx, sy, sw, sh, 26); ctx.clip();
  F.barrasCor(ctx, sx, sy, sw, sh);
  ctx.restore();
  ctx.fillStyle = '#c9c3b8';
  [0, 1].forEach((k) => { ctx.beginPath(); ctx.arc(w / 2 - 62, -h / 2 + 110 + k * 90, 26, 0, 6.283); ctx.fill(); });
  const p = 1 + 0.08 * Math.sin(lt * 9);
  ctx.save();
  ctx.translate(sx + sw / 2, sy + sh / 2);
  ctx.scale(p, p);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-24, -38); ctx.lineTo(42, 0); ctx.lineTo(-24, 38); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function icFoto(ctx, s, lt, E) {
  const d = easeOutBack(prog(lt, 0, 0.4), 1.6);
  ctx.save();
  ctx.translate(0, (1 - d) * -300);
  ctx.rotate(-0.08 + (1 - d) * 0.3);
  const w = s * 0.86, h = s * 0.98;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#fbfbf7';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  F.cover(ctx, E.img.vinte, -w / 2 + 26, -h / 2 + 26, w - 52, w - 52);
  texto(ctx, 'TAUBATÉ · 2023', 0, h / 2 - 56, { size: 34, peso: 'd', estilo: '#30323a', depth: 0, sombra: false });
  ctx.restore();
}
function icPin(ctx, s, lt) {
  const r = rng(9);
  ctx.fillStyle = '#0c1336';
  for (let i = 0; i < 11; i++) {
    const bw = 30 + r() * 40, bh = 60 + r() * 170, bx = -s / 2 + i * (s / 11);
    ctx.fillRect(bx, s * 0.36 - bh, bw, bh);
    ctx.fillStyle = 'rgba(255,220,120,0.8)';
    for (let k = 0; k < bh / 26 - 1; k++) if (r() > 0.4) ctx.fillRect(bx + 8, s * 0.36 - bh + 12 + k * 26, 8, 10);
    ctx.fillStyle = '#0c1336';
  }
  ctx.fillRect(-s / 2, s * 0.36, s, 10);
  const b = prog(lt, 0.05, 0.55);
  const bounce = b < 1 ? Math.abs(Math.cos(b * Math.PI * 2.5)) * (1 - b) * 260 : 0;
  ctx.save();
  ctx.translate(0, -60 - bounce);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#ff2b4a';
  ctx.beginPath();
  ctx.arc(0, -90, 110, Math.PI * 0.8, Math.PI * 0.2);
  ctx.lineTo(0, 120);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -90, 52, 0, 6.283); ctx.fill();
  texto(ctx, 'SJC', 0, -90, { size: 40, estilo: '#ff2b4a', depth: 0, sombra: false });
  ctx.restore();
}
function icConfete(ctx, s, lt) {
  const r = rng(5);
  for (let i = 0; i < 46; i++) {
    const x = (r() - 0.5) * s * 1.1, y0 = -s * 0.6 - r() * 400, sp = 260 + r() * 300, rot = r() * 6;
    const y = y0 + lt * sp;
    if (y > s * 0.55) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot + lt * (r() * 8 - 4));
    ctx.fillStyle = F.CORES_AGENDA[i % 6];
    ctx.fillRect(-9, -5, 18, 10);
    ctx.restore();
  }
  const L = 'AGENDA';
  const sz = Math.round(s * 0.24), lw = medir(L, sz).total;
  [...L].forEach((ch, i) => {
    const p = prog(lt, i * 0.06, i * 0.06 + 0.35);
    const x = -lw / 2 + medir(L.slice(0, i), sz).total + medir(ch, sz).total / 2;
    const y = -(1 - easeOutBack(p, 2.2)) * 260 + Math.sin(lt * 6 + i) * 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(lt * 4 + i * 1.3) * 0.08);
    texto(ctx, ch, 0, 0, { size: sz, estilo: F.CORES_AGENDA[i % 6], depth: 10, alpha: clamp(p * 3) });
    ctx.restore();
  });
}
function icLapis(ctx, s, lt) {
  const w = s * 0.92, h = s * 0.7;
  ctx.fillStyle = '#16171c';
  F.roundRect(ctx, -w / 2, -h / 2, w, h, 36); ctx.fill();
  ctx.fillStyle = '#fafafa';
  F.roundRect(ctx, -w / 2 + 26, -h / 2 + 26, w - 52, h - 52, 14); ctx.fill();
  const pts = [[-150, -110], [-30, 120], [150, -110]];
  const total = Math.hypot(120, 230) * 2;
  const p = easeInOutCubic(prog(lt, 0.1, 1.1));
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  F.ARCO.forEach((c, k) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 10;
    ctx.setLineDash([total * p, 1e5]);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + k * 6 - 27, y + k * 0) : ctx.moveTo(x + k * 6 - 27, y)));
    ctx.stroke();
  });
  ctx.restore();
  // ponta do lápis
  const seg = p * total, half = total / 2;
  const [a, b] = seg < half ? [pts[0], pts[1]] : [pts[1], pts[2]];
  const k = seg < half ? seg / half : (seg - half) / half;
  const px = lerp(a[0], b[0], k) + 30, py = lerp(a[1], b[1], k);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.7);
  ctx.fillStyle = '#ffcc33'; ctx.fillRect(0, -16, 200, 32);
  ctx.fillStyle = '#f2c79a'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-44, 0); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(-44, 0); ctx.lineTo(-30, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff7aa8'; ctx.fillRect(200, -16, 34, 32);
  ctx.restore();
}
function icFita(ctx, s, lt) {
  const w = s * 0.98, h = s * 0.58;
  ctx.save();
  ctx.rotate(-0.06);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#16161a';
  F.roundRect(ctx, -w / 2, -h / 2, w, h, 20); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#f4f1e8';
  F.roundRect(ctx, -w / 2 + 40, -h / 2 + 22, w - 80, h * 0.36, 10); ctx.fill();
  F.ARCO.forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(-w / 2 + 40, -h / 2 + 32 + k * 4, w - 80, 4); });
  texto(ctx, 'RARIDADES', 0, -h / 2 + 22 + h * 0.24, { size: 46, estilo: '#15151c', depth: 0, sombra: false });
  ctx.fillStyle = '#050507';
  F.roundRect(ctx, -w * 0.28, h * 0.02, w * 0.56, h * 0.36, 18); ctx.fill();
  [-1, 1].forEach((sd) => {
    ctx.save();
    ctx.translate(sd * w * 0.15, h * 0.2);
    ctx.fillStyle = '#2a1c14'; ctx.beginPath(); ctx.arc(0, 0, sd < 0 ? 52 : 34, 0, 6.283); ctx.fill();
    ctx.rotate(lt * 6);
    ctx.fillStyle = '#e9e9ee'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#18181c';
    for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283; ctx.fillRect(Math.cos(a) * 13 - 4, Math.sin(a) * 13 - 4, 8, 8); }
    ctx.restore();
  });
  ctx.restore();
  // selo "RARO"
  const p = easeOutBack(prog(lt, 0.25, 0.55), 3);
  if (p > 0) {
    ctx.save();
    ctx.translate(w * 0.36, -h * 0.5);
    ctx.rotate(0.25);
    ctx.scale(p, p);
    ctx.fillStyle = '#FFD84A';
    ctx.beginPath();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.283, rr = k % 2 ? 78 : 96; k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    texto(ctx, 'RARO', 0, 0, { size: 44, estilo: '#c4002c', depth: 0, sombra: false });
    ctx.restore();
  }
}
function icDVD(ctx, s, lt) {
  ctx.save();
  ctx.translate(-s * 0.12, 0);
  ctx.fillStyle = '#101218';
  F.roundRect(ctx, -s * 0.36, -s * 0.48, s * 0.62, s * 0.96, 14); ctx.fill();
  ctx.fillStyle = '#1b2045'; ctx.fillRect(-s * 0.33, -s * 0.45, s * 0.56, s * 0.9);
  F.ARCO.forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(-s * 0.33, -s * 0.05 + k * 9, s * 0.56, 7); });
  texto(ctx, '2004', -s * 0.05, -s * 0.25, { size: 70, depth: 4 });
  ctx.restore();
  const slide = easeOutCubic(prog(lt, 0, 0.5));
  ctx.save();
  ctx.translate(lerp(-s * 0.1, s * 0.2, slide), 0);
  ctx.rotate(lt * 3);
  const R = s * 0.4;
  const cg = ctx.createConicGradient(0, 0, 0);
  ['#ffb3e6', '#b3c6ff', '#b3fff0', '#f6ffb3', '#ffd0b3', '#e0b3ff', '#b3e6ff', '#d9ffb3', '#ffb3e6'].forEach((c, i, a) => cg.addColorStop(i / (a.length - 1), c));
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  ctx.shadowColor = 'transparent';
  const rg = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.3, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(255,255,255,0.25)');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(210,220,235,0.9)'; ctx.beginPath(); ctx.arc(0, 0, R * 0.26, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.08, 0, 6.283); ctx.fill();
  ctx.restore();
}
function icCubo(ctx, s, lt) {
  ctx.fillStyle = '#3d3d3d';
  F.roundRect(ctx, -s / 2, -s / 2, s, s, 30); ctx.fill();
  ctx.save();
  ctx.beginPath(); F.roundRect(ctx, -s / 2, -s / 2, s, s, 30); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  for (let k = -10; k <= 10; k++) {
    ctx.beginPath(); ctx.moveTo(k * 40, 60); ctx.lineTo(k * 160, s); ctx.stroke();
  }
  for (let k = 0; k < 8; k++) { const y = 60 + Math.pow(k / 7, 1.8) * (s / 2 - 60); ctx.beginPath(); ctx.moveTo(-s, y); ctx.lineTo(s, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,60,60,0.6)'; ctx.beginPath(); ctx.moveTo(-s, 60 + 18); ctx.lineTo(s, 60 + 18); ctx.stroke();
  const ay = lt * 1.3 + 0.6, ax = 0.55;
  const V = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const x1 = x * Math.cos(ay) - z * Math.sin(ay), z1 = x * Math.sin(ay) + z * Math.cos(ay);
    const y1 = y * Math.cos(ax) - z1 * Math.sin(ax), z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
    const f = 4 / (4 + z2);
    V.push([x1 * 120 * f, y1 * 120 * f - 30, z2]);
  }
  const faces = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
  faces.map((f) => ({ f, z: f.reduce((a, i) => a + V[i][2], 0) })).sort((a, b) => b.z - a.z).forEach(({ f }, k) => {
    ctx.fillStyle = ['#7d7d80', '#8e8e92', '#a3a3a8', '#b6b6bb', '#c4c4c9', '#d2d2d6'][k];
    ctx.beginPath(); f.forEach((i, j) => (j ? ctx.lineTo(V[i][0], V[i][1]) : ctx.moveTo(V[i][0], V[i][1]))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffa733'; ctx.lineWidth = 3; ctx.stroke();
  });
  ctx.fillStyle = '#ffa733';
  V.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.283); ctx.fill(); });
  ctx.restore();
}
function icCalendario(ctx, s, lt) {
  const w = s * 0.72, h = s * 0.8;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fff';
  F.roundRect(ctx, -w / 2, -h / 2, w, h, 28); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#e0102f';
  F.roundRect(ctx, -w / 2, -h / 2, w, h * 0.26, 28); ctx.fill();
  ctx.fillRect(-w / 2, -h / 2 + h * 0.13, w, h * 0.13);
  texto(ctx, 'SÁBADO', 0, -h / 2 + h * 0.135, { size: 58, depth: 0, sombra: false });
  const dias = [6, 13, 20, 27];
  const i = Math.min(3, Math.floor(lt / 0.32));
  const p = clamp((lt - i * 0.32) / 0.12);
  texto(ctx, String(dias[i]), 0, h * 0.1 - (1 - easeOutCubic(p)) * 40, { size: 220, estilo: '#1a1d2b', depth: 0, sombra: false, alpha: clamp(p * 2) });
}
function icSino(ctx, s, lt) {
  const sw = Math.sin(lt * 14) * 0.35 * Math.exp(-lt * 1.6);
  ctx.save();
  ctx.translate(0, -s * 0.32);
  ctx.rotate(sw);
  const g = ctx.createLinearGradient(-150, 0, 150, 0);
  g.addColorStop(0, '#b8860b'); g.addColorStop(0.4, '#ffe27a'); g.addColorStop(1, '#a86f00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-30, 40);
  ctx.bezierCurveTo(-120, 60, -120, 200, -170, 300);
  ctx.lineTo(170, 300);
  ctx.bezierCurveTo(120, 200, 120, 60, 30, 40);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); ctx.arc(0, 32, 26, 0, 6.283); ctx.fill();
  ctx.fillRect(-190, 294, 380, 26);
  ctx.fillStyle = '#7a5200'; ctx.beginPath(); ctx.arc(Math.sin(-sw * 2) * 40, 340, 32, 0, 6.283); ctx.fill();
  ctx.restore();
  const p = easeOutBack(prog(lt, 0.15, 0.45), 3);
  if (p > 0) {
    ctx.save();
    ctx.translate(130, -s * 0.22);
    ctx.scale(p, p);
    ctx.fillStyle = '#e0102f'; ctx.beginPath(); ctx.arc(0, 0, 62, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke();
    texto(ctx, '+', 0, -4, { size: 80, depth: 0, sombra: false });
    ctx.restore();
  }
}
const ICONES = { tv: icTV, foto: icFoto, pin: icPin, confete: icConfete, lapis: icLapis, fita: icFita, dvd: icDVD, cubo: icCubo, play: icCalendario, sino: icSino };

// ================================================================== 9. MONTAGEM (41 – 57,67)
function cartao(ctx, t, i, c, lt, dur, E) {
  const bg = BG[i % BG.length];
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, W * 0.8);
  g.addColorStop(0, bg); g.addColorStop(1, '#05040c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // listras diagonais
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const off = (lt * 160) % 120;
  for (let k = -20; k < 20; k++) ctx.fillRect(-W * 1.2, k * 120 + off, W * 2.4, 46);
  ctx.restore();
  // texto gigante vazado no fundo
  ctx.save();
  ctx.globalAlpha = 0.1;
  texto(ctx, c.data, W / 2 - 260 * lt * (i % 2 ? -1 : 1), H / 2 + 40, { size: 420, depth: 0, sombra: false });
  ctx.restore();
  const esp = i % 2 === 1;
  const dir = esp ? -1 : 1;
  const ent = 1 - easeOutExpo(prog(lt, 0, 0.3));
  const zoom = 1 + 0.05 * (lt / dur);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2 + dir * 420 * ent, -H / 2);
  // painel com o ícone
  const px = esp ? 1420 : 520, py = 540, s = 560;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(dir * -0.02);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  F.roundRect(ctx, -s / 2 - 20, -s / 2 - 20, s + 40, s + 40, 40); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.stroke();
  ICONES[c.icone](ctx, s * 0.9, lt, E);
  ctx.restore();
  // textos
  const tx = esp ? 150 : 930;
  const pd = prog(lt, 0.04, 0.3);
  if (c.data.startsWith('+')) {
    const v = 1050 * easeOutCubic(prog(lt, 0.05, 0.9));
    const cw = medir('0', 170).total * 1.04;
    texto(ctx, '+', tx + 40, 330, { size: 170, estilo: 'ouro', depth: 10 });
    odometro(ctx, v, tx + 100 + cw * 4 + 60, 330, { size: 170, digitos: 4, estilo: 'ouro', depth: 10, sep: '.' });
  } else if (pd > 0) {
    const L = medir(c.data, 52).total;
    ctx.save();
    ctx.globalAlpha = clamp(pd * 2);
    ctx.translate(tx + (L + 80) / 2, 330);
    ctx.scale(lerp(0.6, 1, easeOutBack(pd, 2)), lerp(0.6, 1, easeOutBack(pd, 2)));
    F.pilula(ctx, c.data, 0, 0, { size: 52, bg: '#0b0d18', cor: '#FFD84A', raio: 14 });
    ctx.restore();
  }
  const ts = Math.min(124, (124 * 860) / medir(c.titulo, 124).total);
  if (lt >= 0.08) texto(ctx, c.titulo, tx, 490, { size: Math.round(ts), depth: 9, align: 'left', anim: 'sobe', lt: lt - 0.08, stagger: 0.02 });
  if (lt >= 0.2) texto(ctx, c.sub, tx, 610, { size: 46, peso: 'd', align: 'left', alpha: 0.92 * clamp((lt - 0.2) * 4), depth: 0 });
  ctx.restore();
  F.smear(ctx, 1 - prog(lt, 0, 0.16), dir);
  const fl = 1 - prog(lt, 0, 0.12);
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${0.35 * fl})`; ctx.fillRect(0, 0, W, H); }
}
export async function montagem(ctx, t, E) {
  const M = G.TL.montagem;
  const fimCartoes = 54.93;
  if (t < fimCartoes) {
    let i = 0;
    while (i + 1 < M.length && t >= M[i + 1].t) i++;
    const fim = i + 1 < M.length ? M[i + 1].t : fimCartoes;
    cartao(ctx, t, i, M[i], t - M[i].t, fim - M[i].t, E);
    F.flash(ctx, t, 41.0, 0.5, 0.8);
    return;
  }
  // "mas o melhor... ainda está por vir"
  fundoPadrao(ctx, t, { inner: '#141238', outer: '#020208', bokeh: 0.12, seed: 21 });
  const push = 1 + 0.05 * prog(t, fimCartoes, 57.67);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  if (t >= fimCartoes) texto(ctx, 'MAS O MELHOR...', W / 2, 440, { size: 120, anim: 'sobe', lt: t - fimCartoes, stagger: 0.03 });
  if (t >= 56.28) texto(ctx, 'AINDA ESTÁ POR VIR', W / 2, 640, { size: 140, estilo: 'ouro', depth: 12, anim: 'pop', lt: t - 56.28, stagger: 0.035 });
  ctx.restore();
  F.flash(ctx, t, fimCartoes, 0.3, 0.4);
}

// ================================================================== 10. O SEGREDO (57,67 – 73,81)
export async function segredo(ctx, t, E) {
  // a TV desliga
  if (t < 58.3) {
    await montagem(ctx, 57.66, E);
    const s2 = F.snap2.getContext('2d');
    s2.clearRect(0, 0, W, H);
    s2.drawImage(ctx.canvas, 0, 0);
    F.crtDesliga(ctx, F.snap2, prog(t, 57.67, 58.25));
    return;
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (t < 59.3 && Math.floor(t * 3) % 2 === 0) F.osd(ctx, '■ STOP', 110, 110, { size: 84 });
  // batidas do coração (pulso vermelho)
  for (const tc of [58.9, 59.75]) {
    const p = prog(t, tc, tc + 0.6);
    if (p > 0 && p < 1) {
      const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, 'rgba(120,0,20,0)'); g.addColorStop(1, `rgba(140,0,25,${0.45 * (1 - p)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }
  // textos antes das caixas
  titulo(ctx, t, 'E PRA COMEMORAR OS 4 ANOS...', W / 2, 540, 60.0, 61.8, { size: 70, peso: 'd', stagger: 0.018, saida: 0.35, push: 0.05 });
  titulo(ctx, t, 'UM LANÇAMENTO SECRETO', W / 2, 540, 62.3, 63.95, { size: 124, estilo: 'prata', depth: 10, anim: 'zoom', stagger: 0.03, saida: 0.3, push: 0.06 });
  // as caixas lacradas
  if (t >= 64.3) {
    const { scene, cam, s } = segredoSet();
    const flick = [1, 0.1, 1, 0.35, 1][Math.min(4, Math.floor((t - 64.3) / 0.07))];
    const tensao = t >= 70 ? Math.pow(prog(t, 70, 73.6), 2) : 0;
    s.spot.intensity = 120 * flick * (1 + tensao * 0.6);
    let cp;
    if (t < 70) {
      const k = easeInOutCubic(prog(t, 64.3, 70));
      cp = [lerp(-0.4, 0.9, k), lerp(0.75, 0.35, k), lerp(7.4, 5.0, k)];
    } else {
      const k = easeInCubic(prog(t, 70, 73.45)), k2 = easeInExpo(prog(t, 73.45, 73.81));
      cp = [lerp(0.9, 0, k), lerp(0.35, 0.15, k), lerp(5.0, 2.9, k) - k2 * 1.8];
    }
    cam.position.set(...cp);
    cam.lookAt(0, 0.05, 0);
    s.caixas.forEach((c, i) => {
      const a = 0.004 + tensao * 0.03 + (t > 62.8 && t < 70 ? 0.004 * Math.max(0, Math.sin(t * 9.2 + i)) : 0);
      c.rotation.z = Math.sin(t * 37 + i * 2) * a;
      c.position.y = Math.abs(Math.sin(t * 29 + i)) * a * 0.6;
    });
    s.cadeados.forEach((c, i) => { c.rotation.z = Math.sin(t * 2.2 + i) * 0.06 + Math.sin(t * 31) * tensao * 0.1; });
    const pista = t < 70 ? 0.18 + 0.14 * Math.max(0, Math.sin(t * 4.6)) * prog(t, 64.6, 66) : 0.3 + 0.7 * tensao;
    s.vazamentos.forEach((ls) => ls.forEach((m) => { m.material.opacity = pista; m.scale.x = 1 + tensao * 2.5; }));
    s.luzRara.intensity = (t < 70 ? 1.2 * pista : 2 + 14 * tensao);
    s.luzRara.color.setHSL((t * 0.25) % 1, 0.9, 0.6);
    T.draw3D(ctx, scene, cam);
    // feixe de luz do spot (volumétrico, em 2D)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fx0 = W / 2 - (cp[0] / 5) * 260;
    const gb = ctx.createLinearGradient(0, 0, 0, H);
    gb.addColorStop(0, `rgba(255,240,210,${0.16 * flick})`); gb.addColorStop(0.75, `rgba(255,240,210,${0.05 * flick})`); gb.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = gb;
    ctx.beginPath(); ctx.moveTo(fx0 - 60, 0); ctx.lineTo(fx0 + 60, 0); ctx.lineTo(fx0 + 760, H); ctx.lineTo(fx0 - 760, H); ctx.closePath(); ctx.fill();
    ctx.restore();
    F.brilhos(ctx, t * 0.3, 71, { n: 50, alpha: 0.35, color: '#ffe9c8' });
    const fin = 1 - prog(t, 64.3, 65.0);
    if (fin > 0) { ctx.fillStyle = `rgba(0,0,0,${fin})`; ctx.fillRect(0, 0, W, H); }
    titulo(ctx, t, '2 RARIDADES', W / 2, 222, 64.6, 65.85, { size: 92, saida: 0.25 });
    titulo(ctx, t, 'GUARDADAS A SETE CHAVES', W / 2, 222, 66.0, 67.7, { size: 74, estilo: 'ouro', depth: 6, saida: 0.25 });
    // escâner
    if (t >= 67.9 && t < 69.9) {
      const ps = prog(t, 67.9, 69.3);
      const y = 260 + Math.abs(Math.sin(ps * Math.PI * 1.5)) * 560;
      if (t < 69.35) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
        g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(0.5, 'rgba(255,40,70,0.55)'); g.addColorStop(1, 'rgba(255,0,40,0)');
        ctx.fillStyle = g; ctx.fillRect(360, y - 40, W - 720, 80);
        ctx.fillStyle = 'rgba(255,200,210,0.95)'; ctx.fillRect(360, y - 2, W - 720, 4);
        ctx.restore();
        F.osd(ctx, 'ESCANEANDO' + '.'.repeat(1 + (Math.floor(t * 6) % 3)), 160, 860, { size: 56, color: '#7CFF6B' });
      }
      const neg = (t >= 68.6 && t < 68.8) || (t >= 69.1 && t < 69.3) || t >= 69.5;
      if (neg) {
        ctx.save();
        ctx.translate(W / 2, 540);
        const sc = t >= 69.5 ? lerp(1.5, 1, easeOutCubic(prog(t, 69.5, 69.62))) : 1;
        ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(20,0,4,0.82)';
        F.roundRect(ctx, -330, -70, 660, 140, 10); ctx.fill();
        ctx.strokeStyle = '#ff2040'; ctx.lineWidth = 5; ctx.stroke();
        F.osd(ctx, 'ACESSO NEGADO', 0, 0, { size: 96, align: 'center', color: '#ff3355' });
        ctx.restore();
      }
    }
    // os "???" escapando da caixa
    if (t >= 70) interrogacoes(ctx, t, 70.0, 26 + Math.floor(tensao * 0), { janela: 3.4, largura: 900, y0: H * 0.66 });
    const bra = easeInCubic(prog(t, 73.2, 73.81));
    if (bra > 0) { ctx.fillStyle = `rgba(255,255,255,${bra})`; ctx.fillRect(0, 0, W, H); }
  }
  F.letterbox(ctx, prog(t, 59.0, 59.6));
}

// ================================================================== 11. REVELAÇÃO "???" (73,81 – 81)
const BATIDAS = [73.81, 74.46, 75.11, 75.80, 76.48, 77.13, 77.80, 78.48, 79.15, 79.87, 80.57];
const FRASES = [
  ['???', 'prata', 440, true], null, ['UM LANÇAMENTO', 'branco', 160], ['SECRETO', 'arcoiris', 250], ['???', 'prata', 440, true],
  ['2 RARIDADES', 'branco', 180], ['RARÍSSIMAS', 'ouro', 200], ['???', 'prata', 440, true], ['VOCÊ', 'branco', 250], ['CONSEGUE', 'branco', 220], ['ADIVINHAR?', 'arcoiris', 210],
];
export async function revelacao(ctx, t) {
  let i = 0;
  while (i + 1 < BATIDAS.length && t >= BATIDAS[i + 1]) i++;
  let fi = i;
  while (fi > 0 && !FRASES[fi]) fi--;
  const [str, estilo, size, misterio] = FRASES[fi];
  const lt = t - BATIDAS[fi], ltb = t - BATIDAS[i];
  if (misterio) {
    F.faixasFundo(ctx, t, { bh: 110, vel: 520 });
    ctx.fillStyle = 'rgba(4,4,14,0.45)';
    ctx.fillRect(0, 0, W, H);
  } else {
    F.fundo(ctx, '#151a40', '#020308');
    F.estrias(ctx, t, 12, 0.35, { cores: F.ARCO, n: 120, alpha: 0.6 });
  }
  const [sx, sy] = misterio ? shakes(t, [[BATIDAS[fi], 0.5, 34], [BATIDAS[i], 0.3, 12]]) : [0, 0];
  const punch = lerp(1.22, 1, easeOutCubic(clamp(ltb / 0.22)));
  ctx.save();
  ctx.translate(W / 2 + sx, H / 2 + sy);
  ctx.scale(punch, punch);
  ctx.globalAlpha = t > 80.85 ? 1 - prog(t, 80.85, 81.0) : 1;
  texto(ctx, str, 0, 0, { size, estilo, depth: Math.round(size * 0.06), anim: misterio ? 'zoom' : 'pop', lt, stagger: 0.03, glow: misterio ? 'rgba(255,255,255,0.5)' : null });
  ctx.restore();
  if (misterio) F.glitch(ctx, t, clamp(1 - lt / 0.35) + (Math.floor(t * 30) % 9 === 0 ? 0.5 : 0), 7);
  F.flash(ctx, t, BATIDAS[i], 0.22, i === 0 ? 1 : 0.4);
  F.letterbox(ctx, 1);
}

// ================================================================== disco do 4 (arcos -> anel -> peças)
function lerpArc(a, b, k) {
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), rin: lerp(a.rin, b.rin, k), rout: lerp(a.rout, b.rout, k), a0: lerp(a.a0, b.a0, k), a1: lerp(a.a1, b.a1, k) };
}
const KEYS = [[89.4, 0, 0.42, 1.12], [93.3, 0, 0.42, 1.12], [93.8, -2.05, 0.08, 1.18], [99.2, -2.05, 0.08, 1.18], [99.7, 0, 0.5, 1.0], [101.3, 0, 0.5, 1.0]];
function chave(t) {
  if (t <= KEYS[0][0]) return KEYS[0].slice(1);
  for (let k = 0; k < KEYS.length - 1; k++) {
    const a = KEYS[k], b = KEYS[k + 1];
    if (t <= b[0]) { const e = easeInOutCubic(prog(t, a[0], b[0])); return [lerp(a[1], b[1], e), lerp(a[2], b[2], e), lerp(a[3], b[3], e)]; }
  }
  return KEYS[KEYS.length - 1].slice(1);
}
let _morph = -1;
function disco(ctx, t) {
  const { scene, cam, disk, arcs, L } = discoSet();
  cam.position.set(0, 0, 9.2);
  cam.lookAt(0, 0, 0);
  scene.environmentRotation.y = 0.4 + t * 0.25 + easeInOutCubic(prog(t, 90.27, 91.4)) * 2.2;
  const morph = easeInOutCubic(prog(t, 89.0, 89.45));
  arcs.group.visible = t >= 88.6 && t < 89.47;
  if (arcs.group.visible) {
    if (Math.abs(_morph - morph) > 1e-4) { T.setArcParams(arcs, ARCOS.map((a, i) => lerpArc(a, ANEL[i], morph))); _morph = morph; }
    const pin = easeOutBack(prog(t, 88.6, 89.0), 1.5);
    arcs.group.scale.setScalar(Math.max(0.001, pin) * 1.12);
    arcs.group.position.set(0, 0.42, 0);
    arcs.group.rotation.set(0.15 * (1 - morph), -0.2 * (1 - morph), -(t - 88.6) * 1.6 - morph * morph * 4);
  }
  const show = t >= 89.4;
  disk.group.visible = show;
  if (show) {
    const order = [1, 0, 3, 2, 4];
    disk.pieces.forEach((p, k) => {
      const i = order.indexOf(k), ta = 89.62 + i * 0.145, ts = ta - 0.3;
      const e = easeOutCubic(prog(t, ts, ta));
      p.mesh.visible = t >= ts;
      const len = Math.hypot(p.cx, p.cy) || 1, dx = p.cx / len, dy = p.cy / len;
      const bump = t > ta ? Math.sin((t - ta) * 30) * Math.exp(-(t - ta) * 9) * 0.06 : 0;
      p.mesh.position.set(p.cx + dx * (1 - e) * 4.5, p.cy + dy * (1 - e) * 4.5, (1 - e) * 3 + bump);
      p.mesh.rotation.set((1 - e) * 2.2, (1 - e) * -1.6, (1 - e) * 2.8);
    });
    const [x, y, s] = chave(t);
    const orbit = easeOutCubic(prog(t, 89.4, 92.0));
    const fim = easeInCubic(prog(t, 101.6, 102.8));
    disk.group.position.set(x, y * (1 - fim), fim * 6.5);
    disk.group.scale.setScalar(s);
    disk.group.rotation.set(lerp(0.35, 0.06, orbit) + wobble(t, 0.15, 0.03), lerp(-0.75, 0, orbit) + wobble(t, 0.12, 0.1) * orbit + fim * Math.PI * 1.5, 0);
    const pl = prog(t, 90.27, 90.55);
    disk.logo.visible = pl > 0;
    disk.logo.scale.setScalar(Math.max(0.001, easeOutBack(pl, 3)));
    L.key.position.set(lerp(-6, 6, easeInOutCubic(prog(t, 90.27, 91.4))), 4, 5);
  }
  T.draw3D(ctx, scene, cam);
}

// ================================================================== 12. EM BREVE (81 – 90,27)
export async function embreve(ctx, t) {
  const D = G.D;
  fundoPadrao(ctx, t, { inner: '#111a52', outer: '#01020a', bokeh: 0.16, seed: 31 });
  const trk = lerp(90, 16, easeOutCubic(prog(t, D.embreve, D.embreve + 1.6)));
  titulo(ctx, t, 'EM BREVE', W / 2, 520, D.embreve, 83.75, { size: 220, estilo: 'prata', depth: 16, tracking: trk, saida: 0.35, stagger: 0.05 });
  titulo(ctx, t, 'AGUARDE', W / 2, 470, D.aguarde, 86.55, { size: 190, depth: 14, anim: 'pop', saida: 0.3, stagger: 0.04 });
  titulo(ctx, t, 'A TODOS OS INSCRITOS', W / 2, 680, D.todos, 86.55, { size: 72, peso: 'd', estilo: '#FFD84A', saida: 0.3, stagger: 0.02 });
  // comente seu palpite
  if (t >= 86.8 && t < 88.75) {
    const a = janela(t, 86.8, 88.75, 0.2, 0.25);
    const pb = easeOutBack(prog(t, 87.4, 87.75), 2.4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, 400);
    ctx.scale(pb, pb);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    F.roundRect(ctx, -260, -150, 520, 270, 60); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-120, 110); ctx.lineTo(-170, 200); ctx.lineTo(-30, 118); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    texto(ctx, '???', 0, -14, { size: 170, estilo: '#1240c0', depth: 0, sombra: false });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    texto(ctx, 'COMENTE SEU PALPITE!', W / 2, 760, { size: 92, estilo: 'arcoiris', depth: 8, anim: 'sobe', lt: t - 86.9, stagger: 0.025 });
    ctx.restore();
  }
  if (t >= 88.6) disco(ctx, t);
  F.flash(ctx, t, 89.42, 0.3, 0.55);
  F.flash(ctx, t, 90.27, 0.5, 0.9);
  F.letterbox(ctx, 1 - prog(t, 80.95, 81.5));
}

// ================================================================== 13. TÍTULO FINAL (90,27 – 102,8)
export async function tituloFinal(ctx, t) {
  fundoPadrao(ctx, t, { inner: '#16206a', outer: '#02030b', bokeh: 0.24, bokehN: 26, seed: 41, raiosAlpha: 0.08, cy: H * 0.42 });
  disco(ctx, t);
  const sai = 1 - prog(t, 101.3, 101.7);
  ctx.save();
  ctx.globalAlpha = sai;
  // bloco 1: nome do canal
  titulo(ctx, t, 'REDE VANGUARDA ARQUIVOS', W / 2, 830, 90.6, 93.15, { size: 86, estilo: 'prata', depth: 8, stagger: 0.02, saida: 0.25 });
  titulo(ctx, t, '2023 — 2027', W / 2, 935, 91.3, 93.15, { size: 60, peso: 'd', tracking: 10, saida: 0.25 });
  // bloco 2: data
  const XR = 1370;
  titulo(ctx, t, '30 DE JANEIRO', XR, 400, 93.45, 95.2, { size: 100, saida: 0.25 });
  titulo(ctx, t, '2027', XR, 590, 93.6, 95.2, { size: 240, estilo: 'arcoiris', depth: 16, anim: 'pop', saida: 0.25 });
  titulo(ctx, t, 'ANIVERSÁRIO DE 4 ANOS', XR, 770, 93.9, 95.2, { size: 50, peso: 'd', tracking: 6, saida: 0.25 });
  // bloco 3: inscritos
  if (t >= 95.4 && t < 97.45) {
    const a = 1 - prog(t, 97.2, 97.45);
    const v = 1050 * easeOutCubic(prog(t, 95.4, 96.5));
    const cw = medir('0', 190).total * 1.04;
    const pw = medir('+', 190).total, sepW = medir('.', 190).total * 0.9;
    const tot = pw + cw * 4 + sepW;
    ctx.save();
    ctx.globalAlpha *= a * clamp((t - 95.4) * 4);
    texto(ctx, '+', XR - tot / 2 + pw / 2, 420, { size: 190, estilo: 'prata', depth: 12 });
    odometro(ctx, v, XR + tot / 2, 420, { size: 190, digitos: 4, estilo: 'prata', depth: 12, sep: '.' });
    ctx.restore();
    titulo(ctx, t, 'INSCRITOS', XR, 610, 95.55, 97.2, { size: 100, saida: 0.25 });
    titulo(ctx, t, 'OBRIGADO!', XR, 780, 96.5, 97.2, { size: 104, estilo: 'ouro', depth: 10, anim: 'pop', saida: 0.25 });
  }
  // bloco 4: o segredo
  titulo(ctx, t, 'LANÇAMENTO SECRETO', XR, 330, 97.45, 99.1, { size: 70, peso: 'd', tracking: 6, saida: 0.25 });
  if (t >= 97.5 && t < 99.35) {
    ctx.save();
    ctx.globalAlpha *= janela(t, 97.5, 99.35, 0.1, 0.25);
    const p = prog(t, 97.5, 97.75);
    ctx.translate(XR, 540);
    const sc = lerp(2.2, 1, easeOutCubic(p));
    ctx.scale(sc, sc);
    texto(ctx, '???', 0, 0, { size: 300, estilo: 'prata', depth: 18, glow: 'rgba(255,255,255,0.45)' });
    ctx.restore();
  }
  titulo(ctx, t, 'EM BREVE', XR, 750, 97.8, 99.1, { size: 96, estilo: 'arcoiris', depth: 8, saida: 0.25 });
  // bloco 5: inscreva-se
  titulo(ctx, t, 'TRAILER OFICIAL', W / 2, 92, 99.4, 101.3, { size: 40, peso: 'd', tracking: 16, saida: 0.3 });
  if (t >= 99.4) {
    const p1 = easeOutBack(prog(t, 99.4, 99.7), 2.4), p2 = easeOutBack(prog(t, 100.3, 100.6), 2.4);
    const sinoIc = (c, x, y, s, cor) => {
      c.save(); c.translate(x, y); c.rotate(Math.sin((t - 100.3) * 16) * 0.4 * Math.exp(-Math.max(0, t - 100.3) * 2));
      c.fillStyle = cor; c.beginPath();
      c.moveTo(-s * 0.08, -s * 0.38); c.bezierCurveTo(-s * 0.36, -s * 0.3, -s * 0.3, s * 0.1, -s * 0.42, s * 0.26);
      c.lineTo(s * 0.42, s * 0.26); c.bezierCurveTo(s * 0.3, s * 0.1, s * 0.36, -s * 0.3, s * 0.08, -s * 0.38); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, s * 0.34, s * 0.1, 0, 6.283); c.fill();
      c.restore();
    };
    const w1 = F.pilula(ctx, 'INSCREVA-SE', -9999, 900, { size: 56, alpha: 0 });
    const w2 = F.pilula(ctx, 'ATIVE O SININHO', -9999, 900, { size: 56, icone: sinoIc, alpha: 0 });
    const gap = 48, x1 = W / 2 - (w1 + w2 + gap) / 2 + w1 / 2, x2 = W / 2 + (w1 + w2 + gap) / 2 - w2 / 2;
    F.pilula(ctx, 'INSCREVA-SE', x1, 900, { size: 56, bg: '#e0102f', scale: Math.max(0.001, p1) });
    if (p2 > 0) F.pilula(ctx, 'ATIVE O SININHO', x2, 900, { size: 56, bg: '#ffffff', cor: '#10131f', icone: sinoIc, scale: p2 });
  }
  ctx.restore();
  F.flash(ctx, t, 90.27, 0.5, 0.9);
  F.glitch(ctx, t, t >= 97.5 && t < 97.8 ? 1 - prog(t, 97.5, 97.8) : 0, 11);
  // mergulho no disco -> branco -> vinheta
  const w = Math.pow(prog(t, 102.2, 102.8), 2);
  if (w > 0) { ctx.fillStyle = `rgba(255,255,255,${w})`; ctx.fillRect(0, 0, W, H); }
}
