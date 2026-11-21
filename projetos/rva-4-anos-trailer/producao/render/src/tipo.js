// Tipografia do trailer: ITC Avant Garde (Bold e Demi) com os caracteres especiais do V e do A
// (lidos de material/caracteres_especiais.txt), desenhada letra a letra com cache, profundidade 2.5D,
// preenchimentos (prata, ouro, arco-íris) e animações por letra, como num "text animator" do After Effects.
import { canvas, clamp, lerp, easeOutBack, easeOutCubic } from './util.js';
import { STRIPES } from '/rva-4-anos/producao/render/src/logos.js';

// V e A alternativos (padrão: os mesmos do TXT enviado). Derivados do A seguem a mesma família (A.alt01).
let MAPA = { V: '', A: '' };
const DERIVADOS_A = { 'Á': '', 'À': '', 'Â': '', 'Ã': '' };

export function configurarCaracteres(txt) {
  for (const linha of txt.split(/\r?\n/)) {
    const m = linha.match(/letra\s+([A-Z])\b[^"]*"(.)"/u);
    if (m) MAPA[m[1]] = m[2];
  }
  if (MAPA.A === '') Object.assign(MAPA, DERIVADOS_A);
  return { ...MAPA };
}
export const ag = (s) => [...s].map((c) => MAPA[c] ?? c).join('');

export const fonte = (size, peso = 'b') => `${size}px "${peso === 'd' ? 'AGDemi' : 'AGBold'}"`;
const CAP = 0.74; // altura das maiúsculas (em)

const _m = canvas(8, 8).getContext('2d');
const cacheMedida = new Map();
export function medir(str, size, peso = 'b', tracking = 0) {
  const key = `${str}|${size}|${peso}`;
  let r = cacheMedida.get(key);
  if (!r) {
    _m.font = fonte(size, peso);
    const chars = [...ag(str)];
    const xs = chars.map((_, i) => _m.measureText(chars.slice(0, i).join('')).width);
    r = { chars, xs, total: _m.measureText(chars.join('')).width };
    cacheMedida.set(key, r);
  }
  const n = r.chars.length;
  return { chars: r.chars, xs: r.xs.map((x, i) => x + i * tracking), total: r.total + Math.max(0, n - 1) * tracking };
}

// ------------------------------------------------------------------ glifos
const cacheGlifo = new Map();
function preencher(g, estilo, size, base) {
  const top = base - size * CAP, h = size * CAP;
  if (estilo === 'prata') {
    const gr = g.createLinearGradient(0, top - size * 0.05, 0, base + size * 0.05);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.42, '#dfe4ec'); gr.addColorStop(0.5, '#8b94a5');
    gr.addColorStop(0.62, '#c9cfd9'); gr.addColorStop(1, '#f7f9fc');
    return gr;
  }
  if (estilo === 'ouro') {
    const gr = g.createLinearGradient(0, top, 0, base);
    gr.addColorStop(0, '#fff7cf'); gr.addColorStop(0.45, '#ffd54a'); gr.addColorStop(0.55, '#c98a00'); gr.addColorStop(1, '#ffe7a0');
    return gr;
  }
  if (estilo === 'vermelho') {
    const gr = g.createLinearGradient(0, top, 0, base);
    gr.addColorStop(0, '#ff8a80'); gr.addColorStop(0.5, '#ff1744'); gr.addColorStop(1, '#b0001f');
    return gr;
  }
  return estilo === 'branco' ? '#ffffff' : estilo;
}

function glifo(ch, size, peso, estilo, depth, depthColor) {
  const key = `${ch}|${size}|${peso}|${estilo}|${depth}|${depthColor}`;
  let g = cacheGlifo.get(key);
  if (g) return g;
  _m.font = fonte(size, peso);
  const adv = _m.measureText(ch).width;
  const pad = Math.ceil(size * 0.22 + depth * 1.2);
  const w = Math.ceil(adv + pad * 2), h = Math.ceil(size * 1.35 + pad * 2);
  const base = pad + size * 1.02;
  const c = canvas(Math.max(2, w), Math.max(2, h)), x = c.getContext('2d');
  x.font = fonte(size, peso);
  x.textBaseline = 'alphabetic';
  // profundidade (extrusão)
  if (depth > 0) {
    x.fillStyle = depthColor;
    for (let k = depth; k >= 1; k--) x.fillText(ch, pad + k * 0.55, base + k);
  }
  // face frontal (em camada separada para o arco-íris não pintar a extrusão)
  const f = canvas(c.width, c.height), fx = f.getContext('2d');
  fx.font = fonte(size, peso);
  fx.textBaseline = 'alphabetic';
  if (estilo === 'arcoiris') {
    fx.fillStyle = '#fff';
    fx.fillText(ch, pad, base);
    fx.globalCompositeOperation = 'source-atop';
    const top = base - size * CAP, bh = (size * CAP) / 10;
    for (let i = 0; i < 10; i++) {
      const y0 = top + i * bh;
      const gr = fx.createLinearGradient(0, y0, 0, y0 + bh);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, STRIPES[i]); gr.addColorStop(0.8, STRIPES[i]); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
      fx.fillStyle = gr;
      fx.fillRect(0, y0 - (i === 0 ? size : 0), c.width, bh + 1 + (i === 9 ? size : 0));
    }
  } else {
    fx.fillStyle = preencher(fx, estilo, size, base);
    fx.fillText(ch, pad, base);
  }
  // brilho no topo
  fx.globalCompositeOperation = 'source-atop';
  const sh = fx.createLinearGradient(0, base - size * CAP, 0, base - size * CAP * 0.35);
  sh.addColorStop(0, 'rgba(255,255,255,0.35)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  fx.fillStyle = sh;
  fx.fillRect(0, 0, c.width, c.height);
  x.drawImage(f, 0, 0);
  g = { c, adv, pad, base };
  cacheGlifo.set(key, g);
  return g;
}

/**
 * Desenha um texto. (x, y) = centro vertical das maiúsculas.
 * o: size, peso ('b'|'d'), estilo ('branco'|'prata'|'ouro'|'arcoiris'|'vermelho'|cor), depth, depthColor,
 *    tracking, align, alpha, sombra, glow, anim ('pop'|'sobe'|'desce'|'zoom'|'digita'|'cai'), lt (tempo local), stagger, dur
 */
export function texto(ctx, str, x, y, o = {}) {
  const size = o.size ?? 100, peso = o.peso ?? 'b', estilo = o.estilo ?? 'branco';
  const depth = o.depth ?? Math.round(size * 0.06), depthColor = o.depthColor ?? '#070a18';
  const L = medir(str, size, peso, o.tracking ?? 0);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.total : x - L.total / 2;
  const yb = y + (size * CAP) / 2;
  const lt = o.lt ?? 1e9, st = o.stagger ?? 0.035, dur = o.dur ?? 0.38;
  const ordem = o.ordem ?? ((i) => i);
  const n = L.chars.length;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const baseAlpha = ctx.globalAlpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? size * 0.35; }
  else if (o.sombra !== false) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = size * 0.06; }
  for (let i = 0; i < n; i++) {
    const ch = L.chars[i];
    if (ch === ' ') continue;
    const p = o.anim ? clamp((lt - ordem(i, n) * st) / dur) : 1;
    if (p <= 0) continue;
    const g = glifo(ch, size, peso, estilo, depth, depthColor);
    let sc = 1, dx = 0, dy = 0, rot = 0, a = 1;
    switch (o.anim) {
      case 'pop': sc = lerp(0.2, 1, easeOutBack(p, 2.6)); a = clamp(p * 3); break;
      case 'sobe': dy = (1 - easeOutCubic(p)) * size * 0.9; a = clamp(p * 2); break;
      case 'desce': dy = -(1 - easeOutCubic(p)) * size * 0.9; a = clamp(p * 2); break;
      case 'zoom': sc = lerp(3.2, 1, easeOutCubic(p)); a = clamp(p * 2); break;
      case 'cai': dy = -(1 - easeOutBack(p, 1.8)) * size * 1.4; rot = (1 - p) * 0.5 * (i % 2 ? 1 : -1); a = clamp(p * 3); break;
      case 'digita': a = 1; break;
      default: break;
    }
    const cx = x0 + L.xs[i] + g.adv / 2, cy = yb - size * CAP * 0.5;
    ctx.globalAlpha = baseAlpha * a;
    ctx.save();
    ctx.translate(cx + dx, cy + dy);
    if (rot) ctx.rotate(rot);
    if (sc !== 1) ctx.scale(sc, sc);
    ctx.drawImage(g.c, -g.adv / 2 - g.pad, -(g.base - size * CAP * 0.5));
    ctx.restore();
  }
  ctx.restore();
  return L.total;
}

/** Bloco de texto que entra (anim por letra) e sai (sobe e some) — o "layer" de título padrão. */
export function titulo(ctx, t, str, x, y, at, out, o = {}) {
  if (t < at || t > out + (o.saida ?? 0.25)) return;
  const po = clamp((t - out) / (o.saida ?? 0.25));
  ctx.save();
  ctx.globalAlpha *= 1 - po;
  const push = 1 + (o.push ?? 0.04) * clamp((t - at) / Math.max(0.1, out - at));
  ctx.translate(x, y - po * (o.saidaY ?? 40));
  ctx.scale(push * (1 + po * 0.05), push * (1 + po * 0.05));
  texto(ctx, str, 0, 0, { anim: 'sobe', lt: t - at, ...o });
  ctx.restore();
}
