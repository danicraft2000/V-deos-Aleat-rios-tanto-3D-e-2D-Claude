// Efeitos e elementos 2D no estilo "motion graphics" (After Effects): textos com extrusão e brilho,
// animações de texto, bokeh, raios, confete, explosões de linhas, lens flare, cartões, ícones, grão e glitch.
import { W, H, clamp, lerp, easeOutBack, easeOutCubic, easeInCubic, easeOutExpo, easeOutQuart, rng, canvas } from './util.js';

export const RAINBOW = ['#7413FF', '#518FFE', '#33D4F1', '#00F2A0', '#7BFC2D', '#FEE912', '#FFA101', '#FF5301', '#FF0016', '#FD007D'];
export const ARCOS_COR = { vermelho: '#F2471A', azul: '#1677D6', verde: '#2FA21E' };
export const OURO = '#FFC83D';
export const ROSA = '#FF2D8A';

export function font(size, weight = 900, fam = 'Montserrat') {
  return `${weight} ${size}px "${fam}"`;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function measure(ctx, str, size, o = {}) {
  ctx.save();
  ctx.font = font(size, o.weight ?? 900, o.fam ?? 'Montserrat');
  const tr = o.tracking ?? 0;
  const w = [...str].reduce((a, c) => a + ctx.measureText(c).width + tr, 0) - tr;
  ctx.restore();
  return w;
}

function fillFor(ctx, o, yb, size, i, cap = size * 0.72) {
  const y = yb - cap / 2;
  if (o.colors) return o.colors[i % o.colors.length];
  if (o.chrome) {
    const g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.38, '#dfe5ee');
    g.addColorStop(0.5, '#8d96a6');
    g.addColorStop(0.56, '#f4f7fb');
    g.addColorStop(1, '#aeb6c4');
    return g;
  }
  if (o.gradient) {
    const g = ctx.createLinearGradient(0, y - size * 0.45, 0, y + size * 0.45);
    o.gradient.forEach((c, k) => g.addColorStop(k / (o.gradient.length - 1), c));
    return g;
  }
  return o.fill ?? '#fff';
}

/**
 * Texto com extrusão 2.5D (camadas deslocadas), contorno, brilho e reflexo no topo.
 * o: { size, weight, fam, fill, gradient:[...], chrome, colors, stroke, strokeW, depth, depthColor,
 *      dx/dy (direção da extrusão), align, tracking, glow, shine, sweep (0..1 faixa de luz passando) }
 */
export function text3D(ctx, str, x, y, o = {}) {
  const size = o.size ?? 90, fam = o.fam ?? 'Montserrat', weight = o.weight ?? 900;
  const tracking = o.tracking ?? 0;
  ctx.save();
  ctx.font = font(size, weight, fam);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  const cap = capHeight(ctx, size, fam, weight);
  y += cap / 2; // y passa a ser o centro das maiúsculas
  const chars = [...str];
  const widths = chars.map((c) => ctx.measureText(c).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  const depth = o.depth ?? Math.round(size * 0.08);
  const strokeW = o.strokeW ?? size * 0.12;
  const ddx = o.dx ?? 0.55, ddy = o.dy ?? 1;
  const each = (fn) => {
    let cx = x0;
    chars.forEach((c, i) => { if (c !== ' ') fn(c, cx, i); cx += widths[i]; });
  };
  if (o.shadow !== false) {
    ctx.save();
    ctx.shadowColor = o.shadowColor ?? 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.3;
    ctx.shadowOffsetY = size * 0.1;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    each((c, cx) => ctx.fillText(c, cx + depth * ddx, y + depth * ddy));
    ctx.restore();
  }
  if (depth > 0) {
    const dc = o.depthColor ?? '#0b0b14';
    for (let k = depth; k >= 1; k--) {
      ctx.fillStyle = ctx.strokeStyle = typeof dc === 'function' ? dc(k / depth) : dc;
      ctx.lineWidth = strokeW;
      each((c, cx) => {
        if (strokeW > 0) ctx.strokeText(c, cx + k * ddx, y + k * ddy);
        ctx.fillText(c, cx + k * ddx, y + k * ddy);
      });
    }
  }
  if (strokeW > 0) {
    ctx.strokeStyle = o.stroke ?? '#000';
    ctx.lineWidth = strokeW;
    each((c, cx) => ctx.strokeText(c, cx, y));
  }
  if (o.glow) {
    ctx.save();
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = size * (o.glowSize ?? 0.6);
    each((c, cx, i) => { ctx.fillStyle = fillFor(ctx, o, y, size, i, cap); ctx.fillText(c, cx, y); });
    ctx.restore();
  }
  each((c, cx, i) => { ctx.fillStyle = fillFor(ctx, o, y, size, i, cap); ctx.fillText(c, cx, y); });
  if (o.shine !== false) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, y - cap * 1.05, 0, y - cap * 0.35);
    g.addColorStop(0, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    each((c, cx) => ctx.fillText(c, cx, y));
    ctx.restore();
  }
  if (o.sweep != null && o.sweep > 0 && o.sweep < 1) {
    // faixa de luz diagonal atravessando o texto (só sobre as letras)
    const sx = lerp(x0 - size, x0 + total + size, o.sweep);
    const tmp = scratch(Math.ceil(total + size * 2), Math.ceil(size * 1.6));
    const tc = tmp.getContext('2d');
    tc.clearRect(0, 0, tmp.width, tmp.height);
    tc.font = ctx.font;
    tc.textBaseline = 'alphabetic';
    let cx = size;
    chars.forEach((c, i) => { tc.fillStyle = '#fff'; tc.fillText(c, cx, size * 0.8 + cap / 2); cx += widths[i]; });
    tc.globalCompositeOperation = 'source-in';
    const lg = tc.createLinearGradient(sx - x0 + size - size * 0.6, 0, sx - x0 + size + size * 0.6, size * 1.6);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    tc.fillStyle = lg;
    tc.fillRect(0, 0, tmp.width, tmp.height);
    tc.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(tmp, x0 - size, y - cap / 2 - size * 0.8);
  }
  ctx.restore();
  return total;
}
const _caps = new Map();
function capHeight(ctx, size, fam, weight) {
  const k = fam + weight;
  if (!_caps.has(k)) {
    const f = ctx.font;
    ctx.font = font(100, weight, fam);
    _caps.set(k, ctx.measureText('H').actualBoundingBoxAscent / 100);
    ctx.font = f;
  }
  return _caps.get(k) * size;
}
const _scr = [];
function scratch(w, h) {
  let c = _scr.find((s) => s.width >= w && s.height >= h);
  if (!c) { c = canvas(Math.max(w, 256), Math.max(h, 128)); _scr.push(c); }
  return c;
}

/**
 * Texto animado. lt = tempo local (0 = início da entrada). o.anim:
 *  'pop'   escala com overshoot     'slam'  vem da câmera (grande -> 1) com tremida
 *  'track' letras se aproximam      'up'    sobe com máscara
 *  'chars' letra a letra caindo     'wipe'  revela da esquerda p/ direita
 *  'type'  máquina de escrever (sem extrusão)
 * o.out = tempo local de saída (anima saída por 0.25 s).
 */
export function kText(ctx, str, x, y, lt, o = {}) {
  if (lt < 0) return;
  const out = o.out ?? Infinity;
  if (lt > out + 0.3) return;
  const anim = o.anim ?? 'pop';
  const size = o.size ?? 90;
  const din = o.din ?? (anim === 'slam' ? 0.28 : anim === 'chars' ? 0.5 : 0.4);
  const p = clamp(lt / din);
  const po = clamp((lt - out) / 0.25);
  const sweep = o.sweepAt != null ? clamp((lt - o.sweepAt) / 0.7) : null;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  let alpha = 1 - po;
  let sc = 1;
  const outMode = o.outAnim ?? 'zoom';
  if (outMode === 'zoom') sc *= 1 + easeInCubic(po) * 0.25;
  if (outMode === 'drop') ctx.translate(0, easeInCubic(po) * 160);
  if (outMode === 'left') ctx.translate(-easeInCubic(po) * 900, 0);
  const base = { ...o, size, sweep };
  if (anim === 'pop') {
    sc *= lerp(0.2, 1, easeOutBack(p, 2.6));
    alpha *= clamp(p * 4);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= alpha;
    text3D(ctx, str, 0, 0, base);
  } else if (anim === 'slam') {
    sc *= lerp(3.2, 1, easeInCubic(p));
    alpha *= clamp(p * 3);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= alpha;
    text3D(ctx, str, 0, 0, base);
  } else if (anim === 'track') {
    const e = easeOutExpo(p);
    ctx.globalAlpha *= alpha * clamp(p * 2.5);
    ctx.scale(sc * lerp(1.15, 1, e), sc * lerp(1.15, 1, e));
    text3D(ctx, str, 0, 0, { ...base, tracking: (o.tracking ?? 0) + lerp(size * 0.6, 0, e) });
  } else if (anim === 'up' || anim === 'wipe') {
    const e = easeOutQuart(p);
    const w = measure(ctx, str, size, o) + size;
    ctx.globalAlpha *= alpha;
    ctx.scale(sc, sc);
    ctx.beginPath();
    if (anim === 'up') ctx.rect(-w, -size * 0.75, w * 2, size * 1.6);
    else ctx.rect((o.align === 'left' ? 0 : -w / 2) - size * 0.5, -size, (w + size) * e, size * 2.2);
    ctx.clip();
    ctx.translate(0, anim === 'up' ? (1 - e) * size * 1.3 : 0);
    text3D(ctx, str, 0, 0, base);
  } else if (anim === 'chars') {
    ctx.globalAlpha *= alpha;
    ctx.scale(sc, sc);
    const chars = [...str];
    const total = measure(ctx, str, size, o);
    let cx = o.align === 'left' ? 0 : -total / 2;
    ctx.font = font(size, o.weight ?? 900, o.fam ?? 'Montserrat');
    const tr = o.tracking ?? 0;
    chars.forEach((c, i) => {
      const cw = (() => { ctx.font = font(size, o.weight ?? 900, o.fam ?? 'Montserrat'); return ctx.measureText(c).width; })();
      const st = i * (o.stagger ?? 0.035);
      const q = clamp((lt - st) / 0.32);
      if (q > 0 && c !== ' ') {
        ctx.save();
        ctx.translate(cx + cw / 2, (1 - easeOutBack(q, 2)) * -size * 0.9);
        ctx.rotate((1 - easeOutCubic(q)) * (i % 2 ? 0.5 : -0.5));
        ctx.globalAlpha *= clamp(q * 3);
        text3D(ctx, c, 0, 0, { ...base, align: 'center', colors: o.colors ? [o.colors[i % o.colors.length]] : undefined });
        ctx.restore();
      }
      cx += cw + tr;
    });
  } else if (anim === 'type') {
    const n = Math.floor(clamp(lt / (o.cps ? str.length / o.cps : din)) * str.length + 1e-6);
    ctx.globalAlpha *= alpha;
    ctx.font = font(size, o.weight ?? 400, o.fam ?? 'VT323');
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const full = ctx.measureText(str).width;
    const x0 = o.align === 'left' ? 0 : -full / 2;
    const s = str.slice(0, n);
    ctx.shadowColor = o.glow ?? o.fill ?? '#fff';
    ctx.shadowBlur = size * 0.4;
    ctx.fillStyle = o.fill ?? '#fff';
    ctx.fillText(s, x0, 0);
    if (Math.floor(lt * 3) % 2 === 0 || n < str.length) ctx.fillRect(x0 + ctx.measureText(s).width + 6, -size * 0.38, size * 0.45, size * 0.76);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- fundos
export function gradientBg(ctx, inner, outer, cx = W / 2, cy = H / 2, r = W * 0.75) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
export function linearBg(ctx, stops, angle = Math.PI / 2) {
  const dx = Math.cos(angle) * W / 2, dy = Math.sin(angle) * H / 2;
  const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Bokeh: círculos coloridos desfocados flutuando (como na vinheta dos 4 anos). */
const _bokehSprites = new Map();
function bokehSprite(color, soft) {
  const key = color + soft;
  if (_bokehSprites.has(key)) return _bokehSprites.get(key);
  const c = canvas(256, 256), x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, color);
  g.addColorStop(soft, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.beginPath(); x.arc(128, 128, 128, 0, 6.283); x.fill();
  _bokehSprites.set(key, c);
  return c;
}
export function bokeh(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 26, colors = o.colors ?? RAINBOW;
  ctx.save();
  ctx.globalCompositeOperation = o.blend ?? 'lighter';
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, y0 = r() * H, s = (o.min ?? 40) + r() * ((o.max ?? 220) - (o.min ?? 40));
    const sp = (o.speed ?? 18) * (0.4 + r());
    const ang = r() * 6.283;
    const x = ((x0 + Math.cos(ang) * sp * t) % (W + 400) + W + 400) % (W + 400) - 200;
    const y = ((y0 + Math.sin(ang) * sp * t - (o.rise ?? 0) * t) % (H + 400) + H + 400) % (H + 400) - 200;
    const a = (o.alpha ?? 0.35) * (0.55 + 0.45 * Math.sin(t * (0.6 + r()) + i));
    ctx.globalAlpha = Math.max(0, a);
    ctx.drawImage(bokehSprite(colors[i % colors.length], o.soft ?? 0.72), x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
}

/** Raios de luz girando. */
export function rays(ctx, cx, cy, t, o = {}) {
  const n = o.n ?? 16, rot = (o.speed ?? 0.1) * t, len = o.len ?? W;
  const colors = o.colors ?? ['rgba(255,255,255,1)'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = o.alpha ?? 0.12;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2, w = (o.width ?? 0.08) * (0.6 + 0.4 * Math.sin(i * 2.3));
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

/** Chão em grade com perspectiva (2.5D), andando em direção à câmera. */
export function gridFloor(ctx, t, o = {}) {
  const hy = o.horizon ?? H * 0.58, color = o.color ?? 'rgba(120,90,255,0.6)', speed = o.speed ?? 0.6;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, hy, W, H - hy); ctx.clip();
  const g = ctx.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, o.floor ?? 'rgba(40,10,90,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, hy, W, H - hy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = -24; i <= 24; i++) {
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 18, hy);
    ctx.lineTo(W / 2 + i * 260, H + 40);
    ctx.stroke();
  }
  for (let k = 0; k < 14; k++) {
    const z = ((k + (t * speed) % 1) / 14);
    const yy = hy + Math.pow(z, 2.4) * (H - hy + 60);
    ctx.globalAlpha = 0.15 + z * 0.75;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
  }
  ctx.restore();
  // brilho do horizonte
  const hg = ctx.createLinearGradient(0, hy - 60, 0, hy + 30);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(0.7, o.glow ?? 'rgba(180,120,255,0.35)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, hy - 60, W, 90);
}

/** Listras arco-íris diagonais correndo (identidade do V da RVA). */
export function rainbowStripes(ctx, t, o = {}) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(W / 2, H / 2);
  ctx.rotate(o.angle ?? -0.35);
  const bw = o.band ?? 90, n = RAINBOW.length, off = (t * (o.speed ?? 120)) % (bw * n);
  for (let i = -n * 3; i < n * 3; i++) {
    ctx.fillStyle = RAINBOW[((i % n) + n) % n];
    ctx.fillRect(-W * 1.5, i * bw + off - bw * n, W * 3, bw + 1);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- partículas e explosões
export function sparkles(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 40;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y0 = r() * H, sp = 20 + r() * 70, ph = r() * 6.28, s = 1.5 + r() * 4;
    const y = (y0 - t * sp + H * 10) % H;
    const a = (0.4 + 0.6 * Math.sin(t * 3 + ph)) * (o.alpha ?? 0.8);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = o.color ?? '#fff';
    star4(ctx, x, y, s * 3, s * 0.6);
  }
  ctx.restore();
}
/** Estrelinha de 4 pontas (brilho). */
export function star4(ctx, x, y, r, w) {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, w, 0, 6.283); ctx.fill();
}

/** Confete 2.5D (papéis girando com gravidade e balanço). lt = tempo desde a explosão. */
export function confetti(ctx, lt, seed, o = {}) {
  if (lt < 0) return;
  const dur = o.dur ?? 4;
  if (lt > dur) return;
  const r = rng(seed), n = o.n ?? 140, colors = o.colors ?? RAINBOW;
  const ox = o.x ?? W / 2, oy = o.y ?? H / 2;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (r() - 0.5) * (o.spread ?? 2.6);
    const sp = (o.power ?? 1500) * (0.35 + r() * 0.75);
    const drag = 2.2;
    const k = (1 - Math.exp(-drag * lt)) / drag;
    const x = ox + Math.cos(ang) * sp * k + Math.sin(lt * (2 + r() * 3) + i) * 40 * lt;
    const y = oy + Math.sin(ang) * sp * k + (o.gravity ?? 520) * lt * lt * 0.5;
    const w = 10 + r() * 16, h = 6 + r() * 10, spin = (r() - 0.5) * 18;
    ctx.save();
    ctx.globalAlpha = clamp((dur - lt) / 0.8);
    ctx.translate(x, y);
    ctx.rotate(spin * lt);
    ctx.scale(1, Math.cos(lt * (6 + r() * 8) + i));
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}
/** Confete caindo do topo (contínuo). */
export function confettiRain(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 90, colors = o.colors ?? RAINBOW;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, sp = 120 + r() * 220, ph = r() * 50;
    const y = ((t + ph) * sp) % (H + 100) - 50;
    const x = x0 + Math.sin((t + ph) * 1.7) * 50;
    const w = 10 + r() * 14, h = 6 + r() * 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((t + ph) * (r() - 0.5) * 6);
    ctx.scale(1, Math.cos((t + ph) * (4 + r() * 6)));
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

/** Anel que expande (camada de forma). */
export function ring(ctx, x, y, lt, o = {}) {
  const dur = o.dur ?? 0.6;
  if (lt < 0 || lt > dur) return;
  const p = lt / dur, e = easeOutExpo(p);
  ctx.save();
  ctx.globalAlpha = (1 - p) * (o.alpha ?? 1);
  ctx.strokeStyle = o.color ?? '#fff';
  ctx.lineWidth = (o.width ?? 14) * (1 - p) + 1;
  if (o.glow) { ctx.shadowColor = o.color ?? '#fff'; ctx.shadowBlur = 30; }
  ctx.beginPath();
  ctx.arc(x, y, (o.r0 ?? 20) + e * (o.r ?? 420), 0, 6.283);
  ctx.stroke();
  ctx.restore();
}

/** Explosão de linhas radiais (burst). */
export function burst(ctx, x, y, lt, o = {}) {
  const dur = o.dur ?? 0.55;
  if (lt < 0 || lt > dur) return;
  const p = lt / dur, n = o.n ?? 16, r0 = o.r0 ?? 60, len = o.len ?? 360;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = o.color ?? '#fff';
  ctx.lineWidth = (o.width ?? 10) * (1 - p * 0.7);
  if (o.glow) { ctx.shadowColor = o.color ?? '#fff'; ctx.shadowBlur = 24; }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + (o.rot ?? 0);
    const a1 = r0 + easeOutExpo(p) * len, a0 = r0 + easeInCubic(p) * len;
    if (o.colors) ctx.strokeStyle = o.colors[i % o.colors.length];
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * a0, y + Math.sin(a) * a0);
    ctx.lineTo(x + Math.cos(a) * a1, y + Math.sin(a) * a1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Riscos de luz horizontais (velocidade). */
export function streaks(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 24;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const y = r() * H, len = 200 + r() * 700, sp = (o.speed ?? 2400) * (0.5 + r());
    const x = ((r() * W + t * sp * (o.dir ?? 1)) % (W + len * 2) + W + len * 2) % (W + len * 2) - len;
    const g = ctx.createLinearGradient(x, 0, x + len, 0);
    const c = o.colors ? o.colors[i % o.colors.length] : (o.color ?? '#ffffff');
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.8, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = (o.alpha ?? 0.5) * (0.3 + r() * 0.7);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, len, 1.5 + r() * 4);
  }
  ctx.restore();
}

/** Lens flare simples (brilho central + halos alinhados ao centro da tela). */
export function flare(ctx, x, y, a = 1, o = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  const s = o.size ?? 1;
  let g = ctx.createRadialGradient(x, y, 0, x, y, 260 * s);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.08, o.color ?? 'rgba(255,220,170,0.8)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 260 * s, y - 260 * s, 520 * s, 520 * s);
  // risco anamórfico
  g = ctx.createLinearGradient(x - 900 * s, 0, x + 900 * s, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, o.streak ?? 'rgba(140,190,255,0.9)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 900 * s, y - 3 * s, 1800 * s, 6 * s);
  // halos refletidos
  const cx = W / 2, cy = H / 2;
  [[0.5, 60, 'rgba(120,255,200,0.18)'], [-0.3, 110, 'rgba(255,120,200,0.14)'], [-0.8, 40, 'rgba(120,160,255,0.22)'], [1.4, 26, 'rgba(255,255,180,0.25)']]
    .forEach(([k, rr, c]) => {
      const hx = cx + (cx - x) * k, hy = cy + (cy - y) * k;
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, rr * s);
      hg.addColorStop(0, c);
      hg.addColorStop(0.7, c);
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hx, hy, rr * s, 0, 6.283); ctx.fill();
    });
  ctx.restore();
}

// ---------------------------------------------------------------- cartões e etiquetas
/** Painel "vidro" com borda em degradê (estilo broadcast). */
export function card(ctx, x, y, w, h, o = {}) {
  const r = o.radius ?? 28;
  ctx.save();
  ctx.shadowColor = o.shadow ?? 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, o.top ?? 'rgba(34,30,64,0.94)');
  g.addColorStop(1, o.bottom ?? 'rgba(10,10,24,0.94)');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  (o.border ?? [RAINBOW[0], RAINBOW[2], RAINBOW[5], RAINBOW[9]]).forEach((c, i, a) => bg.addColorStop(i / (a.length - 1), c));
  ctx.strokeStyle = bg;
  ctx.lineWidth = o.borderW ?? 5;
  ctx.stroke();
  // reflexo
  ctx.beginPath();
  roundRect(ctx, x + 6, y + 6, w - 12, h * 0.45, r - 4);
  const rg = ctx.createLinearGradient(0, y, 0, y + h * 0.45);
  rg.addColorStop(0, 'rgba(255,255,255,0.10)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.restore();
}

export function pill(ctx, str, cx, cy, o = {}) {
  const size = o.size ?? 40;
  ctx.save();
  ctx.font = font(size, o.weight ?? 800, o.fam ?? 'Montserrat');
  ctx.textBaseline = 'middle';
  const icon = o.icon ? size * 1.2 : 0;
  const w = ctx.measureText(str).width + size * 1.4 + icon, h = size * 1.75;
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(cx, cy);
  ctx.scale(o.scale ?? 1, o.scale ?? 1);
  ctx.translate(o.align === 'left' ? 0 : -w / 2, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = o.bg ?? 'rgba(10,12,24,0.9)';
  roundRect(ctx, 0, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 4; ctx.stroke(); }
  if (o.icon) o.icon(ctx, size * 0.7 + size * 0.5, 0, size * 0.95, o.iconColor ?? o.color ?? '#fff');
  ctx.fillStyle = o.color ?? '#fff';
  ctx.fillText(str, size * 0.7 + icon, 2);
  ctx.restore();
  return w;
}

/** Carimbo com batida (escala grande -> 1) e textura gasta. */
export function stamp(ctx, lines, cx, cy, lt, o = {}) {
  if (lt < 0) return;
  const p = clamp(lt / 0.16);
  const sc = lerp(o.from ?? 2.8, 1, easeInCubic(p)) * (o.scale ?? 1);
  const color = o.color ?? '#E3122B';
  ctx.save();
  ctx.globalAlpha *= Math.min(1, p * 1.5) * (o.alpha ?? 1);
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? -0.12);
  ctx.scale(sc, sc);
  const sizes = lines.map((l) => l.size ?? 100);
  const fam = o.fam ?? 'Montserrat';
  const wmax = Math.max(...lines.map((l, i) => { ctx.font = font(sizes[i], 900, fam); return ctx.measureText(l.t).width; }));
  const hTot = sizes.reduce((a, b) => a + b * 1.05, 0);
  const w = wmax + 90, h = hTot + 60;
  if (o.bg) { ctx.fillStyle = o.bg; roundRect(ctx, -w / 2, -h / 2, w, h, 22); ctx.fill(); }
  ctx.lineWidth = 14;
  ctx.strokeStyle = color;
  roundRect(ctx, -w / 2, -h / 2, w, h, 22);
  ctx.stroke();
  ctx.lineWidth = 4;
  roundRect(ctx, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 12);
  ctx.stroke();
  let y = -hTot / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => {
    ctx.font = font(sizes[i], 900, fam);
    ctx.fillStyle = color;
    ctx.fillText(l.t, 0, y + sizes[i] * 0.55);
    y += sizes[i] * 1.05;
  });
  ctx.globalCompositeOperation = 'destination-out';
  const r = rng(o.seed ?? 7);
  for (let i = 0; i < 140; i++) {
    ctx.globalAlpha = 0.45 * r();
    ctx.beginPath();
    ctx.arc((r() - 0.5) * w, (r() - 0.5) * h, 2 + r() * 8, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- ícones (vetor simples)
export const ICON = {
  calendar(ctx, x, y, s, c, o = {}) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#fff';
    roundRect(ctx, -s / 2, -s * 0.38, s, s * 0.86, s * 0.1); ctx.fill();
    ctx.fillStyle = c;
    roundRect(ctx, -s / 2, -s * 0.38, s, s * 0.26, s * 0.1); ctx.fill();
    ctx.fillRect(-s / 2, -s * 0.2, s, s * 0.08);
    ctx.fillStyle = '#333';
    [-0.25, 0.25].forEach((k) => { roundRect(ctx, k * s - s * 0.05, -s * 0.5, s * 0.1, s * 0.22, s * 0.05); ctx.fill(); });
    ctx.fillStyle = c;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) ctx.fillRect(-s * 0.38 + j * s * 0.2, -s * 0.06 + i * s * 0.16, s * 0.12, s * 0.1);
    ctx.restore();
  },
  lock(ctx, x, y, s, c, o = {}) {
    const open = o.open ?? 0;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = o.shackle ?? '#c9ced8';
    ctx.lineWidth = s * 0.13;
    ctx.beginPath();
    ctx.arc(0, -s * 0.12 - open * s * 0.18, s * 0.26, Math.PI, 0);
    ctx.lineTo(s * 0.26, -s * 0.02 - open * s * 0.18);
    ctx.moveTo(-s * 0.26, -s * 0.12 - open * s * 0.18);
    ctx.lineTo(-s * 0.26, open > 0 ? -s * 0.12 - open * s * 0.18 : -s * 0.02);
    ctx.stroke();
    const g = ctx.createLinearGradient(0, -s * 0.05, 0, s * 0.5);
    g.addColorStop(0, c);
    g.addColorStop(1, o.dark ?? '#7a5a00');
    ctx.fillStyle = g;
    roundRect(ctx, -s * 0.4, -s * 0.06, s * 0.8, s * 0.56, s * 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.arc(0, s * 0.16, s * 0.08, 0, 6.283); ctx.fill();
    ctx.fillRect(-s * 0.035, s * 0.18, s * 0.07, s * 0.16);
    ctx.restore();
  },
  bell(ctx, x, y, s, c, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, s * 0.25);
    ctx.quadraticCurveTo(-s * 0.32, s * 0.12, -s * 0.32, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.32, -s * 0.4, 0, -s * 0.42);
    ctx.quadraticCurveTo(s * 0.32, -s * 0.4, s * 0.32, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.32, s * 0.12, s * 0.4, s * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, s * 0.33, s * 0.1, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -s * 0.46, s * 0.06, 0, 6.283); ctx.fill();
    ctx.restore();
  },
  chat(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    roundRect(ctx, -s / 2, -s * 0.4, s, s * 0.66, s * 0.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.22, s * 0.24); ctx.lineTo(-s * 0.34, s * 0.48); ctx.lineTo(s * 0.04, s * 0.24); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    [-0.2, 0, 0.2].forEach((k) => { ctx.beginPath(); ctx.arc(k * s, -s * 0.07, s * 0.06, 0, 6.283); ctx.fill(); });
    ctx.restore();
  },
  star(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.22 : s * 0.5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  live(ctx, x, y, s, c, o = {}) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, 6.283); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
    [0.3, 0.46].forEach((r) => {
      ctx.beginPath(); ctx.arc(0, 0, s * r, -0.75, 0.75); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * r, Math.PI - 0.75, Math.PI + 0.75); ctx.stroke();
    });
    ctx.restore();
  },
  note(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-s * 0.22, s * 0.3, s * 0.17, s * 0.13, -0.4, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.28, s * 0.2, s * 0.17, s * 0.13, -0.4, 0, 6.283); ctx.fill();
    ctx.fillRect(-s * 0.08, -s * 0.42, s * 0.07, s * 0.72);
    ctx.fillRect(s * 0.42, -s * 0.52, s * 0.07, s * 0.72);
    ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.42); ctx.lineTo(s * 0.49, -s * 0.52); ctx.lineTo(s * 0.49, -s * 0.36); ctx.lineTo(-s * 0.08, -s * 0.26); ctx.fill();
    ctx.restore();
  },
  headphones(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.arc(0, s * 0.05, s * 0.38, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = c;
    roundRect(ctx, -s * 0.48, s * 0.0, s * 0.2, s * 0.38, s * 0.07); ctx.fill();
    roundRect(ctx, s * 0.28, s * 0.0, s * 0.2, s * 0.38, s * 0.07); ctx.fill();
    ctx.restore();
  },
  robot(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    roundRect(ctx, -s * 0.4, -s * 0.28, s * 0.8, s * 0.62, s * 0.14); ctx.fill();
    ctx.fillRect(-s * 0.03, -s * 0.44, s * 0.06, s * 0.16);
    ctx.beginPath(); ctx.arc(0, -s * 0.46, s * 0.07, 0, 6.283); ctx.fill();
    ctx.fillRect(-s * 0.5, -s * 0.06, s * 0.1, s * 0.2); ctx.fillRect(s * 0.4, -s * 0.06, s * 0.1, s * 0.2);
    ctx.fillStyle = '#0b0d18';
    ctx.beginPath(); ctx.arc(-s * 0.16, -s * 0.02, s * 0.08, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.16, -s * 0.02, s * 0.08, 0, 6.283); ctx.fill();
    ctx.fillRect(-s * 0.18, s * 0.16, s * 0.36, s * 0.06);
    ctx.restore();
  },
  check(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.22, 0); ctx.lineTo(-s * 0.05, s * 0.17); ctx.lineTo(s * 0.25, -s * 0.15); ctx.stroke();
    ctx.restore();
  },
  cross(ctx, x, y, s, c, o = {}) {
    const p = o.p ?? 1;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
    const a = clamp(p * 2), b = clamp(p * 2 - 1);
    ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.4); ctx.lineTo(-s * 0.4 + s * 0.8 * a, -s * 0.4 + s * 0.8 * a); ctx.stroke();
    if (b > 0) { ctx.beginPath(); ctx.moveTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 0.4 - s * 0.8 * b, -s * 0.4 + s * 0.8 * b); ctx.stroke(); }
    ctx.restore();
  },
  heart(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.42);
    ctx.bezierCurveTo(-s * 0.62, 0, -s * 0.42, -s * 0.52, 0, -s * 0.2);
    ctx.bezierCurveTo(s * 0.42, -s * 0.52, s * 0.62, 0, 0, s * 0.42);
    ctx.fill();
    ctx.restore();
  },
  users(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    [[-0.24, 0.8], [0.24, 0.8], [0, 1]].forEach(([dx, k]) => {
      ctx.globalAlpha = k === 1 ? 1 : 0.7;
      ctx.beginPath(); ctx.arc(dx * s, -s * 0.14, s * 0.15 * k, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(dx * s, s * 0.28, s * 0.27 * k, s * 0.2 * k, 0, Math.PI, 0); ctx.fill();
    });
    ctx.restore();
  },
  tape(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#1b1d24';
    roundRect(ctx, -s * 0.5, -s * 0.3, s, s * 0.6, s * 0.06); ctx.fill();
    ctx.fillStyle = c;
    ctx.fillRect(-s * 0.42, -s * 0.22, s * 0.84, s * 0.2);
    ctx.fillStyle = '#ddd';
    [-0.2, 0.2].forEach((k) => { ctx.beginPath(); ctx.arc(k * s, s * 0.1, s * 0.09, 0, 6.283); ctx.fill(); });
    ctx.restore();
  },
  pencil(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.8);
    ctx.fillStyle = c; ctx.fillRect(-s * 0.36, -s * 0.09, s * 0.56, s * 0.18);
    ctx.fillStyle = '#f4c9a0'; ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.09); ctx.lineTo(s * 0.42, 0); ctx.lineTo(s * 0.2, s * 0.09); ctx.fill();
    ctx.fillStyle = '#ff7ab0'; ctx.fillRect(-s * 0.46, -s * 0.09, s * 0.1, s * 0.18);
    ctx.restore();
  },
  wand(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.save(); ctx.rotate(0.8); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-s * 0.04, -s * 0.1, s * 0.08, s * 0.6); ctx.restore();
    ctx.fillStyle = c; star4(ctx, -s * 0.12, -s * 0.18, s * 0.28, s * 0.05);
    star4(ctx, s * 0.22, -s * 0.38, s * 0.12, s * 0.03);
    ctx.restore();
  },
  gift(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c; ctx.fillRect(-s * 0.4, -s * 0.1, s * 0.8, s * 0.5);
    ctx.fillRect(-s * 0.46, -s * 0.26, s * 0.92, s * 0.18);
    ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.06, -s * 0.26, s * 0.12, s * 0.66);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.ellipse(-s * 0.14, -s * 0.34, s * 0.14, s * 0.08, 0.4, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s * 0.14, -s * 0.34, s * 0.14, s * 0.08, -0.4, 0, 6.283); ctx.stroke();
    ctx.restore();
  },
  party(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-s * 0.42, s * 0.42); ctx.lineTo(-s * 0.1, -s * 0.3); ctx.lineTo(s * 0.3, s * 0.1); ctx.closePath(); ctx.fill();
    ['#FEE912', '#33D4F1', '#FD007D', '#7BFC2D'].forEach((cc, i) => {
      ctx.fillStyle = cc;
      ctx.beginPath(); ctx.arc(s * (0.05 + i * 0.12), -s * (0.42 - (i % 2) * 0.16), s * 0.06, 0, 6.283); ctx.fill();
    });
    ctx.restore();
  },
  money(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c; roundRect(ctx, -s * 0.5, -s * 0.28, s, s * 0.56, s * 0.08); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = s * 0.04; roundRect(ctx, -s * 0.42, -s * 0.2, s * 0.84, s * 0.4, s * 0.05); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.font = font(Math.round(s * 0.34), 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('R$', 0, s * 0.02);
    ctx.restore();
  },
  play(ctx, x, y, s, c) {
    ctx.save(); ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.38); ctx.lineTo(x + s * 0.42, y); ctx.lineTo(x - s * 0.3, y + s * 0.38); ctx.fill();
    ctx.restore();
  },
};

// ---------------------------------------------------------------- acabamento (grão, vinheta, glitch, flash)
let _noise = [], _vig = null;
const _snap = canvas(W, H);
export function initFx() {
  for (let k = 0; k < 6; k++) {
    const c = canvas(480, 270), x = c.getContext('2d'), d = x.createImageData(480, 270), r = rng(100 + k);
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
  const g = v.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  v.fillStyle = g;
  v.fillRect(0, 0, W, H);
}
export function finish(ctx, t, o = {}) {
  const frame = Math.floor(t * 30);
  ctx.save();
  ctx.globalAlpha = o.grain ?? 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(_noise[frame % _noise.length], 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = o.vignette ?? 0.9;
  ctx.drawImage(_vig, 0, 0);
  ctx.restore();
}
export function staticNoise(ctx, t, alpha = 1) {
  const frame = Math.floor(t * 30);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_noise[(frame * 7) % _noise.length], (frame * 37) % 120, (frame * 53) % 60, 320, 180, 0, 0, W, H);
  ctx.restore();
}
/** Separação RGB + fatias deslocadas (glitch digital). */
export function glitch(ctx, t, amount = 1, seed = 3) {
  if (amount <= 0) return;
  const s = _snap.getContext('2d');
  s.clearRect(0, 0, W, H);
  s.drawImage(ctx.canvas, 0, 0);
  const r = rng(Math.floor(t * 30) * 31 + seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.4 * Math.min(1, amount);
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)';
  ctx.drawImage(_snap, 18 * amount, 0);
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(150deg)';
  ctx.drawImage(_snap, -18 * amount, 0);
  ctx.filter = 'none';
  ctx.restore();
  for (let i = 0; i < 7 * amount; i++) {
    const y = r() * H, h = 10 + r() * 90, dx = (r() - 0.5) * 220 * amount;
    ctx.drawImage(_snap, 0, y, W, h, dx, y, W, h);
  }
}
export function flash(ctx, t, t0, dur = 0.45, max = 1, color = '255,255,255') {
  const p = (t - t0) / dur;
  if (p < -0.12 || p > 1) return;
  const a = p < 0 ? (1 + p / 0.12) * max : (1 - easeOutCubic(p)) * max;
  ctx.fillStyle = `rgba(${color},${clamp(a)})`;
  ctx.fillRect(0, 0, W, H);
}
