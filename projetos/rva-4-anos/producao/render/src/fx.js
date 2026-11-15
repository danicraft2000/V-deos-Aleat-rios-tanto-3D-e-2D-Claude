// Efeitos e elementos 2D: textos com profundidade, carimbos, polaroides, balão, ícones, VHS, raios.
import { W, H, clamp, lerp, prog, easeOutBack, easeOutCubic, easeInCubic, rng, canvas } from './util.js';

export const CORES_AGENDA = ['#FF2D8A', '#00C2F0', '#FF8A00', '#3CD62E', '#9B4DFF', '#FFD400'];
export const AMARELO = '#FFD400';
export const ARCO_IRIS = ['#9B4DFF', '#518FFE', '#33D4F1', '#00E39A', '#7BFC2D', '#FFD400', '#FFA101', '#FF5301', '#FF1744', '#FF2D8A'];

export function font(size, weight = 900, fam = 'Montserrat') {
  return `${weight} ${size}px "${fam}"`;
}

/**
 * Texto com extrusão (2.5D): camadas deslocadas formam a "espessura".
 * o: { size, weight, fam, fill, stroke, strokeW, depth, depthColor, align, colors, tracking, glow }
 */
export function text3D(ctx, str, x, y, o = {}) {
  const size = o.size ?? 90, fam = o.fam ?? 'Montserrat', weight = o.weight ?? 900;
  const tracking = o.tracking ?? 0;
  ctx.save();
  ctx.font = font(size, weight, fam);
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const chars = [...str];
  const widths = chars.map((c) => ctx.measureText(c).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let x0 = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  const depth = o.depth ?? Math.round(size * 0.09);
  const strokeW = o.strokeW ?? size * 0.16;
  const each = (fn) => {
    let cx = x0;
    chars.forEach((c, i) => { fn(c, cx, i); cx += widths[i]; });
  };
  // sombra suave
  if (o.shadow !== false) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.35;
    ctx.shadowOffsetY = size * 0.12;
    ctx.fillStyle = 'rgba(0,0,0,0.01)';
    each((c, cx) => ctx.fillText(c, cx + depth * 0.6, y + depth));
    ctx.restore();
  }
  // extrusão
  ctx.fillStyle = ctx.strokeStyle = o.depthColor ?? '#0b0b10';
  ctx.lineWidth = strokeW;
  for (let k = depth; k >= 1; k--) {
    each((c, cx) => { ctx.strokeText(c, cx + k * 0.6, y + k); ctx.fillText(c, cx + k * 0.6, y + k); });
  }
  // contorno + frente
  if (strokeW > 0) {
    ctx.strokeStyle = o.stroke ?? '#000';
    each((c, cx) => ctx.strokeText(c, cx, y));
  }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = size * 0.5; }
  each((c, cx, i) => {
    let f = o.fill ?? '#fff';
    if (o.colors) f = o.colors[i % o.colors.length];
    if (c === ' ') return;
    ctx.fillStyle = f;
    ctx.fillText(c, cx, y);
  });
  // brilho no topo das letras
  if (o.shine !== false) {
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.1);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    each((c, cx) => ctx.fillText(c, cx, y));
  }
  ctx.restore();
  return total;
}

/**
 * Bloco de título animado. linhas: [{t:'TEXTO', size, colors, fill, fam, weight, tracking}]
 * entra em `at` (pop com overshoot, linha a linha), sai em `out`.
 */
export function title(ctx, t, spec) {
  const { at, out = Infinity, x = W / 2, y, lines, gap = 1.08, anim = 'pop', rot = 0 } = spec;
  if (t < at || t > out + 0.25) return;
  let yy = y;
  lines.forEach((ln, i) => {
    const size = ln.size ?? 96;
    const st = at + i * (spec.stagger ?? 0.09);
    const pin = clamp((t - st) / 0.32);
    const pout = clamp((t - out) / 0.22);
    if (pin <= 0) { yy += size * gap; return; }
    let sc = anim === 'pop' ? lerp(0.3, 1, easeOutBack(pin, 2.4)) : 1;
    let dx = anim === 'slide' ? (1 - easeOutCubic(pin)) * (i % 2 ? -700 : 700) : 0;
    sc *= 1 + easeInCubic(pout) * 0.4;
    const alpha = Math.min(1, pin * 3) * (1 - pout);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + dx + (ln.dx ?? 0), yy + size / 2);
    ctx.rotate(rot + (ln.rot ?? 0));
    ctx.scale(sc, sc);
    text3D(ctx, ln.t, 0, 0, { size, ...ln });
    ctx.restore();
    yy += size * gap;
  });
}

/** Etiqueta em pílula (ex.: legenda, local). */
export function pill(ctx, str, cx, cy, o = {}) {
  const size = o.size ?? 40;
  ctx.save();
  ctx.font = font(size, o.weight ?? 800, o.fam ?? 'Montserrat');
  ctx.textBaseline = 'middle';
  const icon = o.icon ? size * 1.15 : 0;
  const w = ctx.measureText(str).width + size * 1.4 + icon, h = size * 1.75;
  const x = o.align === 'left' ? cx : cx - w / 2;
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(x + w / 2, cy);
  ctx.scale(o.scale ?? 1, o.scale ?? 1);
  ctx.translate(-w / 2, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = o.bg ?? 'rgba(10,12,20,0.88)';
  roundRect(ctx, 0, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 4; ctx.stroke(); }
  if (o.icon) o.icon(ctx, size * 0.7 + size * 0.45, 0, size * 0.9, o.iconColor ?? o.color ?? '#fff');
  ctx.fillStyle = o.color ?? '#fff';
  ctx.fillText(str, size * 0.7 + icon, 2);
  ctx.restore();
  return w;
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

/** Desenha uma imagem cobrindo o retângulo (corte central), com cantos e borda. */
export function drawCover(ctx, img, x, y, w, h, o = {}) {
  if (!img) return;
  const iw = img.width || img.videoWidth, ih = img.height || img.videoHeight;
  const s = Math.max(w / iw, h / ih) * (o.zoom ?? 1);
  const sw = w / s, sh = h / s;
  const sx = (iw - sw) / 2 + (o.ox ?? 0) * iw, sy = (ih - sh) / 2 + (o.oy ?? 0) * ih;
  ctx.save();
  if (o.radius) { roundRect(ctx, x, y, w, h, o.radius); ctx.clip(); }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

/** Vídeo em moldura (borda branca, sombra, leve rotação). */
export function videoFrame(ctx, img, cx, cy, w, h, o = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? 0);
  ctx.scale(o.scale ?? 1, o.scale ?? 1);
  ctx.globalAlpha *= o.alpha ?? 1;
  const b = o.border ?? 10;
  ctx.shadowColor = o.glow ?? 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = o.glow ? 60 : 40;
  ctx.shadowOffsetY = o.glow ? 0 : 18;
  ctx.fillStyle = o.borderColor ?? '#fff';
  roundRect(ctx, -w / 2 - b, -h / 2 - b, w + b * 2, h + b * 2, (o.radius ?? 18) + b);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#000';
  roundRect(ctx, -w / 2, -h / 2, w, h, o.radius ?? 18);
  ctx.fill();
  drawCover(ctx, img, -w / 2, -h / 2, w, h, { radius: o.radius ?? 18, zoom: o.zoom });
  ctx.restore();
}

/** Fundo desfocado a partir de uma imagem (barato: desfoca em tamanho pequeno e amplia). */
const _blur = canvas(270, 480);
export function blurredBg(ctx, img, darken = 0.55, blurPx = 9) {
  if (!img) return;
  const b = _blur.getContext('2d');
  b.filter = `blur(${blurPx}px) saturate(1.4)`;
  drawCover(b, img, -30, -30, 330, 540);
  b.filter = 'none';
  ctx.drawImage(_blur, 0, 0, W, H);
  ctx.fillStyle = `rgba(0,0,0,${darken})`;
  ctx.fillRect(0, 0, W, H);
}

/** Fundo em degradê radial. */
export function gradientBg(ctx, inner, outer, cx = W / 2, cy = H * 0.45) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.75);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Raios de luz girando (como nas vinhetas de aniversário). */
export function rays(ctx, cx, cy, t, o = {}) {
  const n = o.n ?? 18, rot = (o.speed ?? 0.08) * t, len = o.len ?? H * 1.2;
  const colors = o.colors ?? ['rgba(255,255,255,1)'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = o.alpha ?? 0.12;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2, w = (o.width ?? 0.09) * (0.6 + 0.4 * Math.sin(i * 2.3));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
    const c = colors[i % colors.length];
    g.addColorStop(0, c);
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

/** Partículas de brilho. */
export function sparkles(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 40;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y0 = r() * H, sp = 30 + r() * 80, ph = r() * 6.28, s = 2 + r() * 5;
    const y = (y0 - t * sp + H * 10) % H;
    const a = (0.4 + 0.6 * Math.sin(t * 3 + ph)) * (o.alpha ?? 0.8);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = o.color ?? '#fff';
    ctx.beginPath();
    ctx.arc(x, y, s, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

/** Confete de letras coloridas (homenagem à vinheta do Agenda). */
export function letterConfetti(ctx, lt, seed, o = {}) {
  if (lt < 0 || lt > (o.dur ?? 3.2)) return;
  const r = rng(seed), n = o.n ?? 46, letters = o.letters ?? 'AGENDAVANGUARDA';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2, sp = 500 + r() * 1300, size = 50 + r() * 90;
    const x0 = W / 2 + (r() - 0.5) * 200, y0 = (o.y ?? H * 0.42) + (r() - 0.5) * 120;
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp - 600;
    const x = x0 + vx * lt, y = y0 + vy * lt + 0.5 * 2200 * lt * lt;
    const rot = (r() - 0.5) * 12 * lt;
    ctx.save();
    ctx.globalAlpha = clamp(1.6 - lt / (o.dur ?? 3.2) * 1.6);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = font(size, 900);
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = '#000';
    ctx.strokeText(letters[i % letters.length], 0, 0);
    ctx.fillStyle = CORES_AGENDA[i % CORES_AGENDA.length];
    ctx.fillText(letters[i % letters.length], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** Carimbo com batida (escala grande -> 1). */
export function stamp(ctx, lines, cx, cy, lt, o = {}) {
  if (lt < 0) return;
  const p = clamp(lt / 0.18);
  const sc = lerp(o.from ?? 2.6, 1, easeInCubic(p)) * (o.scale ?? 1);
  const color = o.color ?? '#E3122B';
  ctx.save();
  ctx.globalAlpha = Math.min(1, p * 1.5) * (o.alpha ?? 1);
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? -0.12);
  ctx.scale(sc, sc);
  const sizes = lines.map((l) => l.size ?? 110);
  ctx.font = font(sizes[0]);
  const wmax = Math.max(...lines.map((l, i) => { ctx.font = font(sizes[i]); return ctx.measureText(l.t).width; }));
  const iconW = o.icon ? sizes[0] * 1.1 : 0;
  const hTot = sizes.reduce((a, b) => a + b * 1.05, 0);
  const w = wmax + iconW + 90, h = hTot + 70;
  ctx.fillStyle = o.bg ?? 'rgba(255,255,255,0.0)';
  roundRect(ctx, -w / 2, -h / 2, w, h, 26);
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.lineWidth = 5;
  roundRect(ctx, -w / 2 + 18, -h / 2 + 18, w - 36, h - 36, 14);
  ctx.stroke();
  if (o.icon) o.icon(ctx, -w / 2 + 45 + iconW / 2, 0, sizes[0] * 0.95, color);
  let y = -hTot / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => {
    ctx.font = font(sizes[i]);
    ctx.fillStyle = color;
    ctx.fillText(l.t, iconW / 2, y + sizes[i] * 0.55);
    y += sizes[i] * 1.05;
  });
  // textura gasta de carimbo
  ctx.globalCompositeOperation = 'destination-out';
  const r = rng(o.seed ?? 7);
  for (let i = 0; i < 160; i++) {
    ctx.globalAlpha = 0.5 * r();
    ctx.beginPath();
    ctx.arc((r() - 0.5) * w, (r() - 0.5) * h, 2 + r() * 9, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

/** Polaroide com foto (ou espaço reservado). */
export function polaroid(ctx, img, cx, cy, w, o = {}) {
  const h = w * 1.18, ph = w * 0.86;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? 0);
  ctx.scale(o.scale ?? 1, o.scale ?? 1);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 25;
  ctx.fillStyle = '#f7f5ef';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  const px = -w / 2 + w * 0.06, py = -h / 2 + w * 0.06, pw = w * 0.88;
  if (img) {
    drawCover(ctx, img, px, py, pw, ph, { zoom: o.zoom, ox: o.ox, oy: o.oy });
  } else {
    // espaço reservado para a foto do usuário
    ctx.fillStyle = '#2a2d36';
    ctx.fillRect(px, py, pw, ph);
    ctx.setLineDash([22, 14]);
    ctx.strokeStyle = '#8a91a6';
    ctx.lineWidth = 5;
    ctx.strokeRect(px + 18, py + 18, pw - 36, ph - 36);
    ctx.setLineDash([]);
    iconCamera(ctx, 0, py + ph * 0.42, w * 0.2, '#c5cbe0');
    ctx.fillStyle = '#c5cbe0';
    ctx.font = font(Math.round(w * 0.06), 800);
    ctx.textAlign = 'center';
    ctx.fillText(o.placeholder ?? 'SUA FOTO AQUI', 0, py + ph * 0.72);
  }
  // brilho do papel fotográfico
  const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(px, py, pw, ph);
  if (o.caption) {
    ctx.fillStyle = '#23252c';
    ctx.font = font(Math.round(w * 0.085), 700, 'Caveat');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.caption, 0, py + ph + (h / 2 - (py + ph)) / 2 + h * 0.0);
  }
  ctx.restore();
}

/** Balão de comentário (anônimo, sem nome nem foto do autor). */
export function commentBubble(ctx, cx, cy, w, lt, o = {}) {
  if (lt < 0) return;
  const p = easeOutBack(clamp(lt / 0.35), 2);
  const lines = o.lines ?? [];
  const lh = 50, h = 150 + lines.length * lh;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? -0.03);
  ctx.scale(p, p);
  ctx.globalAlpha = clamp(lt / 0.15);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#1d1f26';
  roundRect(ctx, -w / 2, -h / 2, w, h, 34);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();
  // avatar anônimo
  const ax = -w / 2 + 70, ay = -h / 2 + 72;
  ctx.fillStyle = '#4a4f5e';
  ctx.beginPath(); ctx.arc(ax, ay, 40, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#9aa1b5';
  ctx.beginPath(); ctx.arc(ax, ay - 9, 14, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ax, ay + 24, 24, 15, 0, Math.PI, 0); ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#aab0c0';
  ctx.font = font(34, 800);
  ctx.fillText(o.name ?? '@anônimo', ax + 62, ay - 12);
  ctx.fillStyle = '#6f7588';
  ctx.font = font(28, 700);
  ctx.fillText(o.when ?? 'há 1 ano', ax + 62, ay + 24);
  ctx.fillStyle = '#f2f3f7';
  ctx.font = font(42, 800);
  lines.forEach((l, i) => ctx.fillText(l, -w / 2 + 40, -h / 2 + 150 + i * lh));
  ctx.restore();
}

// ---------------------------------------------------------------- ícones simples
export function iconPin(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -s * 0.15, s * 0.36, Math.PI * 0.85, Math.PI * 2.15);
  ctx.lineTo(0, s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0b0d14';
  ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.14, 0, 6.283); ctx.fill();
  ctx.restore();
}
export function iconCamera(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  roundRect(ctx, -s / 2, -s * 0.3, s, s * 0.65, s * 0.1);
  ctx.fill();
  ctx.fillRect(-s * 0.18, -s * 0.42, s * 0.36, s * 0.16);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(0, s * 0.03, s * 0.2, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath(); ctx.arc(0, s * 0.03, s * 0.12, 0, 6.283); ctx.fill();
  ctx.restore();
}
export function iconWarning(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.48); ctx.lineTo(s * 0.52, s * 0.42); ctx.lineTo(-s * 0.52, s * 0.42); ctx.closePath();
  ctx.stroke(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-s * 0.05, -s * 0.18, s * 0.1, s * 0.34);
  ctx.beginPath(); ctx.arc(0, s * 0.28, s * 0.06, 0, 6.283); ctx.fill();
  ctx.restore();
}
export function iconBlock(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.14;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, 6.283); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.3); ctx.lineTo(s * 0.3, s * 0.3); ctx.stroke();
  ctx.restore();
}
export function iconComment(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  roundRect(ctx, -s / 2, -s * 0.42, s, s * 0.68, s * 0.18);
  ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.24); ctx.lineTo(-s * 0.32, s * 0.5); ctx.lineTo(s * 0.05, s * 0.24); ctx.fill();
  ctx.restore();
}
export function iconPlay(ctx, x, y, s, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - s * 0.35, y - s * 0.42); ctx.lineTo(x + s * 0.45, y); ctx.lineTo(x - s * 0.35, y + s * 0.42); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- VHS / tela
let _scan = null, _noise = [], _vig = null;
export function initFx() {
  _scan = canvas(W, H);
  const s = _scan.getContext('2d');
  s.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < H; y += 4) s.fillRect(0, y, W, 2);
  for (let k = 0; k < 6; k++) {
    const c = canvas(360, 640), x = c.getContext('2d'), d = x.createImageData(360, 640), r = rng(100 + k);
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
  const g = v.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.6)');
  v.fillStyle = g;
  v.fillRect(0, 0, W, H);
}
export function noiseCanvas(i) { return _noise[i % _noise.length]; }

/** Camada final de "fita": grão, linhas de varredura, vinheta escura. */
export function vhsOverlay(ctx, t, o = {}) {
  const frame = Math.floor(t * 30);
  ctx.save();
  ctx.globalAlpha = o.noise ?? 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(_noise[frame % _noise.length], 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = o.scan ?? 0.5;
  ctx.drawImage(_scan, 0, 0);
  ctx.globalAlpha = o.vignette ?? 1;
  ctx.drawImage(_vig, 0, 0);
  ctx.restore();
}

/** Ruído de tela cheia (chiado). */
export function staticNoise(ctx, t, alpha = 1, x = 0, y = 0, w = W, h = H) {
  const frame = Math.floor(t * 30);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_noise[(frame * 7) % _noise.length], (frame * 37) % 100, (frame * 53) % 200, 240, 420, x, y, w, h);
  ctx.restore();
}

/** Faixas de tracking (deslocamento horizontal) sobre o que já está desenhado. */
const _snap = canvas(W, H);
export function tracking(ctx, t, intensity = 1, seed = 1) {
  if (intensity <= 0) return;
  const s = _snap.getContext('2d');
  s.clearRect(0, 0, W, H);
  s.drawImage(ctx.canvas, 0, 0);
  const r = rng(Math.floor(t * 30) * 13 + seed);
  const bands = Math.round(3 + 5 * intensity);
  for (let i = 0; i < bands; i++) {
    const y = r() * H, h = 8 + r() * 60 * intensity, dx = (r() - 0.5) * 90 * intensity;
    ctx.drawImage(_snap, 0, y, W, h, dx, y, W, h);
  }
  // faixa clara rolando
  const by = ((t * 600) % (H + 300)) - 150;
  const g = ctx.createLinearGradient(0, by - 60, 0, by + 60);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,255,${0.12 * intensity})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, by - 60, W, 120);
}

/** Separação RGB + fatias (glitch). */
export function glitch(ctx, t, amount = 1, seed = 3) {
  if (amount <= 0) return;
  const s = _snap.getContext('2d');
  s.clearRect(0, 0, W, H);
  s.drawImage(ctx.canvas, 0, 0);
  const r = rng(Math.floor(t * 30) * 31 + seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 * amount;
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)';
  ctx.drawImage(_snap, 14 * amount, 0);
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(150deg)';
  ctx.drawImage(_snap, -14 * amount, 0);
  ctx.filter = 'none';
  ctx.restore();
  for (let i = 0; i < 6 * amount; i++) {
    const y = r() * H, h = 20 + r() * 120, dx = (r() - 0.5) * 160 * amount;
    ctx.drawImage(_snap, 0, y, W, h, dx, y, W, h);
  }
}

/** Texto de OSD de videocassete. */
export function osd(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = font(o.size ?? 64, 400, 'VT323');
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(str, x + 4, y + 4);
  ctx.fillStyle = o.color ?? '#fff';
  ctx.shadowColor = o.color ?? '#fff';
  ctx.shadowBlur = 12;
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Flash branco. */
export function flash(ctx, t, t0, dur = 0.45, max = 1, color = '255,255,255') {
  const p = (t - t0) / dur;
  if (p < -0.15 || p > 1) return;
  const a = p < 0 ? (1 + p / 0.15) * max : (1 - easeOutCubic(p)) * max;
  ctx.fillStyle = `rgba(${color},${clamp(a)})`;
  ctx.fillRect(0, 0, W, H);
}
