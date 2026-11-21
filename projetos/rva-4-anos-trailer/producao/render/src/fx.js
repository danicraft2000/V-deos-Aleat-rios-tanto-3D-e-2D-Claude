// Efeitos 2D do trailer (16:9): VHS, chiado, tracking, glitch, flash, raios, bokeh, OSD, letterbox, smear.
import { W, H, clamp, lerp, easeOutCubic, rng, canvas } from './util.js';
import { STRIPES } from '/rva-4-anos/producao/render/src/logos.js';
import { ag } from './tipo.js';

export const ARCO = STRIPES;
export const CORES_AGENDA = ['#FF2D8A', '#00C2F0', '#FF8A00', '#3CD62E', '#9B4DFF', '#FFD400'];

let _scan, _vig, _noise = [], _bokeh = [];
export const snap = canvas(W, H);
export const snap2 = canvas(W, H);

export function initFx() {
  _scan = canvas(W, H);
  const s = _scan.getContext('2d');
  s.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 3) s.fillRect(0, y, W, 1);
  for (let k = 0; k < 8; k++) {
    const c = canvas(480, 270), x = c.getContext('2d'), d = x.createImageData(480, 270), r = rng(300 + k);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = r() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    _noise.push(c);
  }
  _vig = canvas(W, H);
  const v = _vig.getContext('2d');
  const g = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.65)');
  v.fillStyle = g;
  v.fillRect(0, 0, W, H);
  // sprites de bokeh (círculos suaves coloridos, como na vinheta de 4 anos)
  const cores = ['#ff4fd8', '#9b5cff', '#5aa0ff', '#33d4f1', '#5dff6a', '#ffe14a', '#ff9a3c', '#ff5a7a'];
  for (const c of cores) {
    const b = canvas(256, 256), x = b.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 60, 128, 128, 128);
    gr.addColorStop(0, c); gr.addColorStop(0.85, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 0.9;
    x.fillStyle = gr;
    x.beginPath(); x.arc(128, 128, 128, 0, 6.283); x.fill();
    _bokeh.push(b);
  }
}
export const noiseCanvas = (i) => _noise[((i % _noise.length) + _noise.length) % _noise.length];

/** Camada final de "fita": grão, linhas de varredura e vinheta escura. */
export function vhs(ctx, t, o = {}) {
  const f = Math.floor(t * 30);
  ctx.save();
  ctx.globalAlpha = o.noise ?? 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(_noise[f % _noise.length], 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = o.scan ?? 0.35;
  ctx.drawImage(_scan, 0, 0);
  ctx.globalAlpha = o.vig ?? 1;
  ctx.drawImage(_vig, 0, 0);
  ctx.restore();
}

/** Chiado de tela cheia. */
export function estatica(ctx, t, alpha = 1, x = 0, y = 0, w = W, h = H) {
  if (alpha <= 0) return;
  const f = Math.floor(t * 30);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_noise[(f * 7) % _noise.length], (f * 37) % 160, (f * 53) % 90, 320, 180, x, y, w, h);
  ctx.restore();
}

/** Faixas de tracking (deslocamento horizontal) sobre o que já está desenhado. */
export function tracking(ctx, t, intensity = 1, seed = 1) {
  if (intensity <= 0) return;
  const s = snap.getContext('2d');
  s.clearRect(0, 0, W, H);
  s.drawImage(ctx.canvas, 0, 0);
  const r = rng(Math.floor(t * 30) * 13 + seed);
  const bands = Math.round(3 + 6 * intensity);
  for (let i = 0; i < bands; i++) {
    const y = r() * H, h = 6 + r() * 50 * intensity, dx = (r() - 0.5) * 140 * intensity;
    ctx.drawImage(snap, 0, y, W, h, dx, y, W, h);
  }
  const by = ((t * 520) % (H + 300)) - 150;
  const g = ctx.createLinearGradient(0, by - 50, 0, by + 50);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,255,${0.14 * intensity})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, by - 50, W, 100);
  // faixa de ruído na base (cabeça de vídeo)
  ctx.save();
  ctx.globalAlpha = 0.5 * intensity;
  ctx.drawImage(_noise[Math.floor(t * 30) % _noise.length], 0, 0, 480, 12, 0, H - 30 - r() * 20, W, 26);
  ctx.restore();
}

/** Separação RGB + fatias (glitch). */
export function glitch(ctx, t, amount = 1, seed = 3) {
  if (amount <= 0) return;
  const s = snap.getContext('2d');
  s.clearRect(0, 0, W, H);
  s.drawImage(ctx.canvas, 0, 0);
  const r = rng(Math.floor(t * 30) * 31 + seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.4 * amount;
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)';
  ctx.drawImage(snap, 18 * amount, 0);
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(150deg)';
  ctx.drawImage(snap, -18 * amount, 0);
  ctx.filter = 'none';
  ctx.restore();
  for (let i = 0; i < 7 * amount; i++) {
    const y = r() * H, h = 14 + r() * 100, dx = (r() - 0.5) * 220 * amount;
    ctx.drawImage(snap, 0, y, W, h, dx, y, W, h);
  }
}

/** Borrão de movimento horizontal (chicote de câmera). */
export function smear(ctx, amount, dir = 1) {
  if (amount <= 0.01) return;
  const s = snap.getContext('2d');
  s.clearRect(0, 0, W, H);
  s.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  const n = 6;
  for (let i = 1; i <= n; i++) {
    ctx.globalAlpha = 0.22 * amount;
    ctx.drawImage(snap, dir * i * 26 * amount, 0);
  }
  ctx.restore();
}

/** Flash (branco por padrão). */
export function flash(ctx, t, t0, dur = 0.45, max = 1, color = '255,255,255') {
  const p = (t - t0) / dur;
  if (p < -0.12 || p > 1) return;
  const a = p < 0 ? (1 + p / 0.12) * max : (1 - easeOutCubic(p)) * max;
  ctx.fillStyle = `rgba(${color},${clamp(a)})`;
  ctx.fillRect(0, 0, W, H);
}

export function fundo(ctx, inner, outer, cx = W / 2, cy = H / 2, r = W * 0.7) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Raios de luz girando. */
export function raios(ctx, cx, cy, t, o = {}) {
  const n = o.n ?? 18, rot = (o.speed ?? 0.06) * t, len = o.len ?? W;
  const colors = o.colors ?? ['rgba(255,255,255,1)'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = o.alpha ?? 0.1;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2, w = (o.width ?? 0.07) * (0.6 + 0.4 * Math.sin(i * 2.3));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
    g.addColorStop(0, colors[i % colors.length]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len);
    ctx.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Bokeh colorido flutuando (mesma linguagem da vinheta de 4 anos). */
export function bokeh(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 26;
  ctx.save();
  ctx.globalCompositeOperation = o.modo ?? 'lighter';
  for (let i = 0; i < n; i++) {
    const s = (o.min ?? 60) + r() * ((o.max ?? 260) - (o.min ?? 60));
    const x0 = r() * (W + 400) - 200, y0 = r() * (H + 400) - 200, vx = (r() - 0.5) * 40, vy = -10 - r() * 30;
    const ph = r() * 6.28, img = _bokeh[Math.floor(r() * _bokeh.length)];
    const x = ((x0 + vx * t) % (W + 400) + W + 400) % (W + 400) - 200;
    const y = ((y0 + vy * t) % (H + 400) + H + 400) % (H + 400) - 200;
    ctx.globalAlpha = (o.alpha ?? 0.25) * (0.6 + 0.4 * Math.sin(t * 0.8 + ph));
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
}

/** Partículas de brilho. */
export function brilhos(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 50;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y0 = r() * H, sp = 20 + r() * 70, ph = r() * 6.28, s = 1.5 + r() * 4;
    const y = (y0 - t * sp + H * 20) % H;
    ctx.globalAlpha = Math.max(0, (0.4 + 0.6 * Math.sin(t * 3 + ph)) * (o.alpha ?? 0.7));
    ctx.fillStyle = o.color ?? '#fff';
    ctx.beginPath();
    ctx.arc(x, y, s, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

/** Estrias de luz vindo na direção da câmera (hiperespaço). vel 0..1 */
export function estrias(ctx, t, seed, vel, o = {}) {
  const r = rng(seed), n = o.n ?? 140, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, sp = 0.25 + r() * 0.75, ph = r();
    const z = (ph + t * sp * (0.15 + vel * 1.4)) % 1;
    const d0 = Math.pow(z, 2.2) * W * 0.9, d1 = d0 + (8 + vel * 260) * z;
    ctx.strokeStyle = o.cores ? o.cores[i % o.cores.length] : '#fff';
    ctx.globalAlpha = clamp(z * 1.6) * (o.alpha ?? 0.8);
    ctx.lineWidth = 1 + z * 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0);
    ctx.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Texto de OSD de videocassete (VT323). */
export function osd(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.size ?? 64}px "VT323"`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(str, x + 4, y + 4);
  ctx.fillStyle = o.color ?? '#fff';
  ctx.shadowColor = o.color ?? '#fff';
  ctx.shadowBlur = 14;
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Faixas pretas de cinema. k = 0..1 */
export function letterbox(ctx, k, h = 132) {
  if (k <= 0) return;
  const hh = h * easeOutCubic(k);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, hh);
  ctx.fillRect(0, H - hh, W, hh);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Desenho "cover" de imagem num retângulo. */
export function cover(ctx, img, x, y, w, h) {
  const ia = img.width / img.height, ra = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ia > ra) { sw = img.height * ra; sx = (img.width - sw) / 2; } else { sh = img.width / ra; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Barras de cor (tela de teste). */
export function barrasCor(ctx, x, y, w, h) {
  const cs = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  cs.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + (i * w) / 7, y, w / 7 + 1, h * 0.72); });
  ['#0000c0', '#111', '#c000c0', '#111', '#00c0c0', '#111', '#c0c0c0'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + (i * w) / 7, y + h * 0.72, w / 7 + 1, h * 0.08); });
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + w * 0.29, y + h * 0.8, w * 0.14, h * 0.2);
}

/** Faixas do arco-íris (V da RVA) rolando na diagonal — fundo. */
export function faixasFundo(ctx, t, o = {}) {
  const bh = o.bh ?? 120, ang = o.ang ?? -0.35, vel = o.vel ?? 300;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(ang);
  const off = (t * vel) % (bh * 10);
  for (let i = -16; i < 16; i++) {
    const y = i * bh - off;
    ctx.fillStyle = STRIPES[((i % 10) + 10) % 10];
    ctx.fillRect(-W * 1.5, y, W * 3, bh + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-W * 1.5, y, W * 3, 6);
  }
  ctx.restore();
}

/** Desliga a TV de tubo: a imagem `src` vira uma linha e depois um ponto. p 0..1 */
export function crtDesliga(ctx, src, p) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (p >= 1) return;
  const a = clamp(p / 0.55), b = clamp((p - 0.55) / 0.45);
  const sy = lerp(1, 0.004, easeOutCubic(a)), sx = lerp(1, 0.0, b * b);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(Math.max(0.002, sx), sy);
  ctx.filter = `brightness(${1 + a * 2.5})`;
  ctx.drawImage(src, -W / 2, -H / 2);
  ctx.filter = 'none';
  ctx.restore();
  if (b > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 60 * (1 - b) + 4);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - 80, H / 2 - 80, 160, 160);
  }
}

/** Pílula com texto (botão / etiqueta). */
export function pilula(ctx, str, cx, cy, o = {}) {
  const size = o.size ?? 40;
  ctx.save();
  ctx.font = `${size}px "${o.peso === 'd' ? 'AGDemi' : 'AGBold'}"`;
  ctx.textBaseline = 'middle';
  str = ag(str);
  const w = ctx.measureText(str).width + size * 1.6 + (o.icone ? size * 1.2 : 0), h = size * 1.8;
  ctx.translate(cx, cy);
  ctx.scale(o.scale ?? 1, o.scale ?? 1);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = o.bg ?? 'rgba(10,12,20,0.85)';
  roundRect(ctx, -w / 2, -h / 2, w, h, o.raio ?? h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (o.borda) { ctx.strokeStyle = o.borda; ctx.lineWidth = 4; ctx.stroke(); }
  if (o.icone) o.icone(ctx, -w / 2 + size * 1.25, 0, size * 0.95, o.cor ?? '#fff');
  ctx.fillStyle = o.cor ?? '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(str, o.icone ? size * 0.6 : 0, size * 0.04);
  ctx.restore();
  return w;
}
