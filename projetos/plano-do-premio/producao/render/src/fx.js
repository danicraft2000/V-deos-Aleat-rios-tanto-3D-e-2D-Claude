// Elementos 2D: textos com profundidade, painéis de vidro, pílulas, ícones, legendas, fundo, transições.
import { W, H, clamp, lerp, easeOutBack, easeOutCubic, easeInCubic, rng, canvas } from './util.js';

export const COR = {
  ouro: '#FFC83A', ouroEsc: '#B8860B', reserva: '#22D3A6', pai: '#FF4D8D', proj: '#4D7CFF',
  alerta: '#FF4B4B', roxo: '#9B6BFF', texto: '#F4F6FF', suave: '#AEB6D9', fundo1: '#141a46', fundo2: '#05071a',
  // cores dos símbolos do controle (triângulo, círculo, xis, quadrado)
  tri: '#3CD3AD', cir: '#FF5E5E', xis: '#7FA7FF', qua: '#E58CD6',
};

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

/** Texto com extrusão (2.5D). o: { size, weight, fill, colors, depth, depthColor, align, stroke, strokeW, glow, shadow } */
export function text3D(ctx, str, x, y, o = {}) {
  const size = o.size ?? 90, weight = o.weight ?? 900, fam = o.fam ?? 'Montserrat';
  ctx.save();
  ctx.font = font(size, weight, fam);
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const total = ctx.measureText(str).width;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  const depth = o.depth ?? Math.round(size * 0.08);
  const strokeW = o.strokeW ?? size * 0.12;
  ctx.textAlign = 'left';
  if (o.shadow !== false) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.4;
    ctx.shadowOffsetY = size * 0.14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(str, x0 + depth * 0.5, y + depth);
    ctx.restore();
  }
  ctx.fillStyle = ctx.strokeStyle = o.depthColor ?? '#0a0d24';
  ctx.lineWidth = strokeW;
  for (let k = depth; k >= 1; k--) {
    ctx.strokeText(str, x0 + k * 0.5, y + k);
    ctx.fillText(str, x0 + k * 0.5, y + k);
  }
  if (strokeW > 0) {
    ctx.strokeStyle = o.stroke ?? '#0a0d24';
    ctx.strokeText(str, x0, y);
  }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = size * 0.45; }
  if (o.colors) {
    // cores por caractere
    let cx = x0;
    [...str].forEach((c, i) => {
      ctx.fillStyle = o.colors[i % o.colors.length];
      ctx.fillText(c, cx, y);
      cx += ctx.measureText(c).width;
    });
  } else {
    ctx.fillStyle = o.fill ?? '#fff';
    ctx.fillText(str, x0, y);
  }
  ctx.shadowColor = 'transparent';
  if (o.shine !== false) {
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.15);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillText(str, x0, y);
  }
  ctx.restore();
  return total;
}

/** Título animado: entra em `at` com pop (ou slide), sai em `out`. */
export function titulo(ctx, t, str, x, y, o = {}) {
  const at = o.at ?? 0, out = o.out ?? Infinity;
  if (t < at || t > out + 0.3) return;
  const pin = clamp((t - at) / 0.4), pout = clamp((t - out) / 0.25);
  let sc = o.anim === 'slide' ? 1 : lerp(0.4, 1, easeOutBack(pin, 2.2));
  const dx = o.anim === 'slide' ? (1 - easeOutCubic(pin)) * -260 : 0;
  sc *= 1 - easeInCubic(pout) * 0.15;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, pin * 2.5) * (1 - pout);
  ctx.translate(x + dx, y);
  ctx.rotate(o.rot ?? 0);
  ctx.scale(sc, sc);
  text3D(ctx, str, 0, 0, o);
  ctx.restore();
}

/** Pílula (etiqueta arredondada). */
export function pill(ctx, str, cx, cy, o = {}) {
  const size = o.size ?? 30;
  ctx.save();
  ctx.font = font(size, o.weight ?? 800);
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(str).width + size * 1.4 + (o.dot ? size * 0.9 : 0), h = size * 1.8;
  const x = o.align === 'left' ? cx : cx - w / 2;
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(x + w / 2, cy);
  ctx.scale(o.scale ?? 1, o.scale ?? 1);
  ctx.translate(-w / 2, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = o.bg ?? 'rgba(12,16,44,0.85)';
  roundRect(ctx, 0, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 3; ctx.stroke(); }
  let tx = size * 0.7;
  if (o.dot) {
    ctx.fillStyle = o.dot;
    ctx.beginPath(); ctx.arc(tx + size * 0.25, 0, size * 0.25, 0, 6.283); ctx.fill();
    tx += size * 0.9;
  }
  ctx.fillStyle = o.color ?? '#fff';
  ctx.fillText(str, tx, 2);
  ctx.restore();
  return w;
}

/** Quebra o texto em linhas que cabem em maxW (usa a fonte atual do ctx). */
export function wrap(ctx, str, maxW) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Painel de vidro escuro com borda clara. */
export function painel(ctx, x, y, w, h, o = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, o.top ?? 'rgba(34,42,96,0.88)');
  g.addColorStop(1, o.bottom ?? 'rgba(14,18,48,0.92)');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, o.r ?? 28);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = o.borderW ?? 2.5;
  ctx.strokeStyle = o.border ?? 'rgba(255,255,255,0.16)';
  ctx.stroke();
  if (o.accent) {
    ctx.save();
    roundRect(ctx, x, y, w, h, o.r ?? 28);
    ctx.clip();
    ctx.fillStyle = o.accent;
    ctx.fillRect(x, y, 10, h);
    ctx.restore();
  }
  ctx.restore();
}

/** Linha de checklist (ícone + texto) com entrada animada. lt = tempo desde a entrada. */
export function itemCheck(ctx, lt, x, y, str, o = {}) {
  if (lt < 0) return;
  const p = clamp(lt / 0.4);
  ctx.save();
  ctx.globalAlpha *= Math.min(1, p * 2);
  ctx.translate(x + (1 - easeOutCubic(p)) * 80, y);
  const s = o.size ?? 40;
  const ok = o.ok !== false;
  const sc = easeOutBack(clamp(lt / 0.35), 3);
  ctx.save();
  ctx.scale(sc, sc);
  ctx.fillStyle = ok ? COR.reserva : COR.alerta;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#08102a';
  ctx.lineWidth = s * 0.15;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (ok) { ctx.moveTo(-s * 0.28, 0); ctx.lineTo(-s * 0.06, s * 0.22); ctx.lineTo(s * 0.3, -s * 0.22); }
  else { ctx.moveTo(-s * 0.22, -s * 0.22); ctx.lineTo(s * 0.22, s * 0.22); ctx.moveTo(s * 0.22, -s * 0.22); ctx.lineTo(-s * 0.22, s * 0.22); }
  ctx.stroke();
  ctx.restore();
  ctx.font = font(s, o.weight ?? 800);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color ?? COR.texto;
  ctx.fillText(str, s * 1.1, 2);
  if (o.sub) {
    ctx.font = font(s * 0.62, 600);
    ctx.fillStyle = COR.suave;
    ctx.fillText(o.sub, s * 1.1, s * 0.95);
  }
  ctx.restore();
}

/** Número que conta até o valor (formato R$). */
export function contador(ctx, lt, valor, x, y, o = {}) {
  if (lt < 0) return;
  const d = o.dur ?? 1.2;
  const p = easeOutCubic(clamp(lt / d));
  const v = Math.round(valor * p / (o.step ?? 1)) * (o.step ?? 1);
  const str = (o.prefix ?? 'R$ ') + v.toLocaleString('pt-BR') + (o.suffix ?? '');
  const sc = lt < 0.25 ? lerp(0.6, 1, easeOutBack(lt / 0.25, 2)) : 1;
  ctx.save();
  ctx.globalAlpha *= clamp(lt / 0.15);
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  text3D(ctx, str, 0, 0, o);
  ctx.restore();
}

/** Carimbo com batida. */
export function carimbo(ctx, lt, str, cx, cy, o = {}) {
  if (lt < 0) return;
  const p = clamp(lt / 0.18);
  const sc = lerp(2.4, 1, easeInCubic(p)) * (o.scale ?? 1);
  const color = o.color ?? COR.alerta;
  const size = o.size ?? 64;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, p * 1.5);
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? -0.1);
  ctx.scale(sc, sc);
  ctx.font = font(size);
  const w = ctx.measureText(str).width + size * 1.2, h = size * 1.7;
  ctx.fillStyle = o.bg ?? 'rgba(10,8,20,0.55)';
  roundRect(ctx, -w / 2, -h / 2, w, h, 18);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.lineWidth = 3;
  roundRect(ctx, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 10);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, 0, 4);
  ctx.globalCompositeOperation = 'destination-out';
  const r = rng(o.seed ?? 5);
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.45 * r();
    ctx.beginPath();
    ctx.arc((r() - 0.5) * w, (r() - 0.5) * h, 1.5 + r() * 6, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- fundo
let _bokeh = null;
export function initFx() {
  _bokeh = [];
  const r = rng(77);
  for (let i = 0; i < 46; i++) {
    _bokeh.push({ x: r() * W, y: r() * H, s: 20 + r() * 90, sp: 6 + r() * 18, ph: r() * 6.28, c: [COR.ouro, COR.proj, COR.pai, COR.reserva, '#ffffff'][i % 5], a: 0.04 + r() * 0.08 });
  }
}

/** Fundo: degradê radial azul-noite + bolhas de luz desfocadas. */
export function fundo(ctx, t, o = {}) {
  const g = ctx.createRadialGradient(W * (o.cx ?? 0.5), H * (o.cy ?? 0.42), 0, W * 0.5, H * 0.5, W * 0.75);
  g.addColorStop(0, o.inner ?? COR.fundo1);
  g.addColorStop(1, o.outer ?? COR.fundo2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (o.tint) {
    const g2 = ctx.createRadialGradient(W * 0.5, H * 1.1, 0, W * 0.5, H * 1.1, H * 1.1);
    g2.addColorStop(0, o.tint);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of _bokeh) {
    const y = ((b.y - t * b.sp) % (H + 200) + H + 200) % (H + 200) - 100;
    const x = b.x + Math.sin(t * 0.3 + b.ph) * 30;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, b.s);
    gg.addColorStop(0, b.c);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = b.a * (o.bokeh ?? 1) * (0.7 + 0.3 * Math.sin(t * 1.3 + b.ph));
    ctx.fillStyle = gg;
    ctx.fillRect(x - b.s, y - b.s, b.s * 2, b.s * 2);
  }
  ctx.restore();
}

/** Brilhos subindo. */
export function brilhos(ctx, t, seed, o = {}) {
  const r = rng(seed), n = o.n ?? 40;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y0 = r() * H, sp = 20 + r() * 70, ph = r() * 6.28, s = 1.5 + r() * 4;
    const y = ((y0 - t * sp) % H + H) % H;
    ctx.globalAlpha = Math.max(0, (0.4 + 0.6 * Math.sin(t * 3 + ph)) * (o.alpha ?? 0.7));
    ctx.fillStyle = o.color ?? '#fff';
    ctx.beginPath();
    ctx.arc(x, y, s, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

/** Confete com os 4 símbolos do controle. */
export function confete(ctx, lt, seed, o = {}) {
  if (lt < 0) return;
  const r = rng(seed), n = o.n ?? 90;
  const cores = [COR.tri, COR.cir, COR.xis, COR.qua, COR.ouro];
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, vy = 180 + r() * 260, vx = (r() - 0.5) * 120, s = 14 + r() * 22, rot0 = r() * 6, vr = (r() - 0.5) * 5;
    const delay = r() * 1.6;
    const tt = lt - delay;
    if (tt < 0) continue;
    const y = -60 + vy * tt + 30 * tt * tt;
    if (y > H + 60) continue;
    const x = x0 + vx * tt + Math.sin(tt * 2 + i) * 30;
    const kind = i % 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot0 + vr * tt);
    ctx.strokeStyle = cores[i % cores.length];
    ctx.lineWidth = s * 0.22;
    ctx.globalAlpha = 0.95;
    simbolo(ctx, kind, s);
    ctx.restore();
  }
  ctx.restore();
}

/** Desenha triângulo(0), círculo(1), xis(2), quadrado(3) em traço. */
export function simbolo(ctx, kind, s) {
  ctx.beginPath();
  if (kind === 0) { ctx.moveTo(0, -s * 0.55); ctx.lineTo(s * 0.5, s * 0.35); ctx.lineTo(-s * 0.5, s * 0.35); ctx.closePath(); }
  else if (kind === 1) ctx.arc(0, 0, s * 0.45, 0, 6.283);
  else if (kind === 2) { ctx.moveTo(-s * 0.42, -s * 0.42); ctx.lineTo(s * 0.42, s * 0.42); ctx.moveTo(s * 0.42, -s * 0.42); ctx.lineTo(-s * 0.42, s * 0.42); }
  else ctx.rect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
  ctx.stroke();
}

// ---------------------------------------------------------------- ícones
export function iconeCalendario(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fff';
  roundRect(ctx, -s / 2, -s * 0.42, s, s * 0.9, s * 0.12);
  ctx.fill();
  ctx.fillStyle = cor;
  ctx.save();
  roundRect(ctx, -s / 2, -s * 0.42, s, s * 0.9, s * 0.12);
  ctx.clip();
  ctx.fillRect(-s / 2, -s * 0.42, s, s * 0.26);
  ctx.restore();
  ctx.fillStyle = '#333a5c';
  [-0.25, 0.25].forEach((k) => { roundRect(ctx, k * s - s * 0.05, -s * 0.52, s * 0.1, s * 0.2, s * 0.04); ctx.fill(); });
  ctx.fillStyle = '#1d2140';
  ctx.font = font(s * 0.42, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('26', 0, s * 0.18);
  ctx.restore();
}
export function iconeRecibo(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-s * 0.36, -s * 0.5);
  ctx.lineTo(s * 0.36, -s * 0.5);
  ctx.lineTo(s * 0.36, s * 0.5);
  for (let i = 0; i < 6; i++) ctx.lineTo(s * 0.36 - (i + 0.5) * s * 0.12, s * (i % 2 ? 0.5 : 0.42));
  ctx.lineTo(-s * 0.36, s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c3c8dd';
  for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.24, -s * 0.32 + i * s * 0.14, s * (i === 3 ? 0.24 : 0.48), s * 0.05);
  ctx.fillStyle = cor;
  ctx.font = font(s * 0.3, 900);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('%', s * 0.27, s * 0.3);
  ctx.restore();
}
export function iconeRaio(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(s * 0.12, -s * 0.55);
  ctx.lineTo(-s * 0.32, s * 0.08);
  ctx.lineTo(-s * 0.02, s * 0.08);
  ctx.lineTo(-s * 0.14, s * 0.55);
  ctx.lineTo(s * 0.34, -s * 0.1);
  ctx.lineTo(s * 0.04, -s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
export function iconeCadeado(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#d9deef';
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.24, Math.PI, 0);
  ctx.lineTo(s * 0.24, s * 0.05);
  ctx.moveTo(-s * 0.24, -s * 0.1);
  ctx.lineTo(-s * 0.24, s * 0.05);
  ctx.stroke();
  ctx.fillStyle = cor;
  roundRect(ctx, -s * 0.38, -s * 0.02, s * 0.76, s * 0.56, s * 0.1);
  ctx.fill();
  ctx.fillStyle = '#0b1030';
  ctx.beginPath(); ctx.arc(0, s * 0.2, s * 0.07, 0, 6.283); ctx.fill();
  ctx.fillRect(-s * 0.03, s * 0.2, s * 0.06, s * 0.16);
  ctx.restore();
}
export function iconeCoracao(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.4);
  ctx.bezierCurveTo(-s * 0.6, 0, -s * 0.5, -s * 0.5, 0, -s * 0.22);
  ctx.bezierCurveTo(s * 0.5, -s * 0.5, s * 0.6, 0, 0, s * 0.4);
  ctx.fill();
  ctx.restore();
}
export function iconeLapis(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.8);
  ctx.fillStyle = cor;
  ctx.fillRect(-s * 0.4, -s * 0.1, s * 0.62, s * 0.2);
  ctx.fillStyle = '#ffd9a8';
  ctx.beginPath(); ctx.moveTo(s * 0.22, -s * 0.1); ctx.lineTo(s * 0.45, 0); ctx.lineTo(s * 0.22, s * 0.1); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.moveTo(s * 0.37, -s * 0.035); ctx.lineTo(s * 0.45, 0); ctx.lineTo(s * 0.37, s * 0.035); ctx.fill();
  ctx.fillStyle = '#ff9fb8';
  ctx.fillRect(-s * 0.5, -s * 0.1, s * 0.1, s * 0.2);
  ctx.restore();
}
export function iconeNota(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = cor;
  ctx.beginPath(); ctx.ellipse(-s * 0.22, s * 0.3, s * 0.17, s * 0.13, -0.4, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.26, s * 0.2, s * 0.17, s * 0.13, -0.4, 0, 6.283); ctx.fill();
  ctx.fillRect(-s * 0.08, -s * 0.4, s * 0.08, s * 0.72);
  ctx.fillRect(s * 0.4, -s * 0.5, s * 0.08, s * 0.72);
  ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.4); ctx.lineTo(s * 0.48, -s * 0.5); ctx.lineTo(s * 0.48, -s * 0.32); ctx.lineTo(-s * 0.08, -s * 0.22); ctx.fill();
  ctx.restore();
}
export function iconeControle(ctx, x, y, s, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.22);
  ctx.lineTo(s * 0.3, -s * 0.22);
  ctx.quadraticCurveTo(s * 0.52, -s * 0.22, s * 0.55, s * 0.05);
  ctx.quadraticCurveTo(s * 0.6, s * 0.38, s * 0.42, s * 0.36);
  ctx.quadraticCurveTo(s * 0.3, s * 0.34, s * 0.2, s * 0.12);
  ctx.lineTo(-s * 0.2, s * 0.12);
  ctx.quadraticCurveTo(-s * 0.3, s * 0.34, -s * 0.42, s * 0.36);
  ctx.quadraticCurveTo(-s * 0.6, s * 0.38, -s * 0.55, s * 0.05);
  ctx.quadraticCurveTo(-s * 0.52, -s * 0.22, -s * 0.3, -s * 0.22);
  ctx.fill();
  ctx.fillStyle = '#0b1030';
  ctx.fillRect(-s * 0.36, -s * 0.06, s * 0.16, s * 0.05);
  ctx.fillRect(-s * 0.305, -s * 0.115, s * 0.05, s * 0.16);
  [[0.3, -0.1], [0.38, -0.03], [0.3, 0.04], [0.22, -0.03]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * s, b * s, s * 0.035, 0, 6.283); ctx.fill(); });
  ctx.restore();
}

// ---------------------------------------------------------------- legenda e capítulo
/** Legenda na parte de baixo. */
export function legenda(ctx, str, alpha) {
  if (!str || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  let size = 38;
  ctx.font = font(size, 700);
  let lines = wrap(ctx, str, 1500);
  if (lines.length > 2) { size = 33; ctx.font = font(size, 700); lines = wrap(ctx, str, 1560); }
  const lh = size * 1.32;
  const wmax = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const bw = wmax + 70, bh = lines.length * lh + 34;
  const bx = W / 2 - bw / 2, by = H - 46 - bh;
  ctx.fillStyle = 'rgba(6,8,26,0.74)';
  roundRect(ctx, bx, by, bw, bh, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 17 + lh * (i + 0.5) + 1));
  ctx.restore();
}

/** Chip do capítulo no canto superior esquerdo. */
export function capitulo(ctx, num, nome, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font(24, 800);
  const w = ctx.measureText(nome).width + 120;
  ctx.fillStyle = 'rgba(6,8,26,0.7)';
  roundRect(ctx, 48, 40, w, 52, 26);
  ctx.fill();
  ctx.fillStyle = COR.ouro;
  ctx.beginPath(); ctx.arc(74, 66, 18, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#0b1030';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(20, 900);
  ctx.fillText(String(num), 74, 67);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = font(24, 800);
  ctx.fillText(nome, 104, 67);
  ctx.restore();
}

/** Transição: faixa diagonal dourada/índigo que varre a tela no corte de cena. */
export function transicao(ctx, t, tc) {
  const d = 0.62;
  const p = (t - (tc - d / 2)) / d;
  if (p <= 0 || p >= 1) return;
  const e = easeInOutQuad(p);
  ctx.save();
  const span = W + H * 0.7 + 900;
  const x = -H * 0.7 - 450 + e * span;
  const bands = [[COR.ouro, 0], ['#2a2f7a', 120], ['#0b0f2e', 240]];
  bands.forEach(([c, off]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    const x0 = x - off;
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + 420, 0);
    ctx.lineTo(x0 + 420 - H * 0.7, H);
    ctx.lineTo(x0 - H * 0.7, H);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}
const easeInOutQuad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** Flash. */
export function flash(ctx, t, t0, dur = 0.4, max = 0.8, color = '255,255,255') {
  const p = (t - t0) / dur;
  if (p < 0 || p > 1) return;
  ctx.fillStyle = `rgba(${color},${clamp((1 - easeOutCubic(p)) * max)})`;
  ctx.fillRect(0, 0, W, H);
}

/** Vinheta escura nas bordas + grão leve. */
let _vig = null, _grao = [];
export function acabamento(ctx, t) {
  if (!_vig) {
    _vig = canvas(W, H);
    const v = _vig.getContext('2d');
    const g = v.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    v.fillStyle = g;
    v.fillRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) {
      const c = canvas(480, 270), x = c.getContext('2d'), d = x.createImageData(480, 270), r = rng(300 + k);
      for (let i = 0; i < d.data.length; i += 4) {
        const val = r() * 255;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = val;
        d.data[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      _grao.push(c);
    }
  }
  ctx.save();
  ctx.drawImage(_vig, 0, 0);
  ctx.globalAlpha = 0.035;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(_grao[Math.floor(t * 30) % 4], 0, 0, W, H);
  ctx.restore();
}

/** Seta curva simples. */
export function seta(ctx, x0, y0, x1, y1, cor, p = 1, lw = 8) {
  if (p <= 0) return;
  const xm = lerp(x0, x1, p), ym = lerp(y0, y1, p);
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = cor;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xm, ym); ctx.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.translate(xm, ym);
  ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(lw * 1.6, 0); ctx.lineTo(-lw * 1.4, -lw * 1.5); ctx.lineTo(-lw * 1.4, lw * 1.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
