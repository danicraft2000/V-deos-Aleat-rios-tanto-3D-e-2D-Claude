// Camada 2D por cima do 3D: textos em movimento, legendas de peças (callouts), cotas e etiqueta do capítulo.
import * as THREE from 'three';
import { W, H, clamp, prog, easeOutExpo, easeOutCubic, easeInCubic, smooth, lerp } from './util.js';

export const COR = { ouro: '#f0c66a', ouroEsc: '#b8862e', branco: '#f6f4ee', cinza: '#b4b2aa', vermelho: '#ff3b30', azul: '#5cb8ff', preto: '#0b0b0c' };
const _v = new THREE.Vector3();

/** projeta um ponto 3D (mundo) para pixels da tela */
export function projetar(cam, p) {
  _v.copy(p).project(cam);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, atras: _v.z > 1 };
}

function fonte(ctx, peso, tam, fam = 'Montserrat') { ctx.font = `${peso} ${tam}px "${fam}"`; }

/** texto com revelação letra a letra (sobe de baixo com máscara), e saída. */
export function textoKinetico(ctx, s, x, y, tam, lt, t0, o = {}) {
  const t1 = o.t1 ?? null;
  const stg = o.stagger ?? 0.022, dur = o.dur ?? 0.55;
  ctx.save();
  fonte(ctx, o.peso ?? 800, tam, o.fam ?? 'Montserrat');
  ctx.textBaseline = 'alphabetic';
  if (o.esp) ctx.letterSpacing = `${o.esp}px`;
  const larg = ctx.measureText(s).width;
  let px = o.al === 'centro' ? x - larg / 2 : o.al === 'dir' ? x - larg : x;
  // máscara da linha
  ctx.beginPath();
  ctx.rect(px - tam, y - tam * 1.05, larg + tam * 2, tam * 1.35);
  ctx.clip();
  const chars = [...s];
  chars.forEach((ch, i) => {
    const w = ctx.measureText(ch).width; // (letterSpacing já incluso na medida)
    const p = clamp((lt - t0 - i * stg) / dur);
    let ps = 0;
    if (t1 != null) ps = clamp((lt - t1 - i * stg * 0.5) / (dur * 0.7));
    const e = easeOutExpo(p);
    const dy = (1 - e) * tam * 1.1 - easeInCubic(ps) * tam * 1.1;
    ctx.globalAlpha = (o.alfa ?? 1) * Math.min(1, p * 3) * (1 - ps);
    if (o.sombra !== false) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = tam * 0.25; ctx.shadowOffsetY = tam * 0.06; }
    if (o.grad) {
      const g = ctx.createLinearGradient(0, y - tam, 0, y);
      g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = o.cor ?? COR.branco;
    ctx.fillText(ch, px, y + dy);
    px += w;
  });
  ctx.restore();
  return larg;
}

/** linha fina dourada que cresce */
export function linha(ctx, x0, y0, x1, y1, p, cor = COR.ouro, larg = 3) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = larg;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(lerp(x0, x1, p), lerp(y0, y1, p));
  ctx.stroke();
  ctx.restore();
}

/**
 * Legenda apontando para uma peça 3D. o: { lado: 'dir'|'esq', dx, dy, t1, sub, cor }
 */
export function callout(ctx, cam, p3, texto, lt, t0, o = {}) {
  const t1 = o.t1 ?? 1e9;
  if (lt < t0 || lt > t1 + 0.6) return;
  const a = projetar(cam, p3);
  if (a.atras) return;
  // se o rótulo sair da tela, inverte o lado
  {
    ctx.save();
    fonte(ctx, 700, o.tam ?? 40, 'Rajdhani');
    const lw = Math.max(ctx.measureText(texto.toUpperCase()).width, o.sub ? ctx.measureText(o.sub).width * 0.75 : 0);
    ctx.restore();
    const ld = o.lado === 'esq' ? -1 : 1;
    const fimX = a.x + ld * ((o.dx ?? 130) + (o.ext ?? 40) + 14 + lw);
    if (fimX < 40 || fimX > W - 40) o = { ...o, lado: ld > 0 ? 'esq' : 'dir' };
  }
  const pin = easeOutCubic(prog(lt, t0, t0 + 0.35));
  const pl = easeOutCubic(prog(lt, t0 + 0.1, t0 + 0.55));
  const sai = smooth(prog(lt, t1, t1 + 0.45));
  const lado = o.lado === 'esq' ? -1 : 1;
  const dx = (o.dx ?? 130) * lado, dy = o.dy ?? -90;
  const bx = a.x + dx, by = a.y + dy;
  const hx = bx + lado * (o.ext ?? 40);
  ctx.save();
  ctx.globalAlpha = 1 - sai;
  // ponto pulsante
  ctx.fillStyle = o.cor ?? COR.ouro;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(a.x, a.y, 7 * pin, 0, 7); ctx.fill();
  ctx.strokeStyle = o.cor ?? COR.ouro;
  ctx.lineWidth = 2;
  const pulso = ((lt - t0) % 1.4) / 1.4;
  ctx.globalAlpha = (1 - sai) * (1 - pulso) * pin;
  ctx.beginPath(); ctx.arc(a.x, a.y, 7 + pulso * 22, 0, 7); ctx.stroke();
  ctx.globalAlpha = 1 - sai;
  // linha em cotovelo
  const L1 = Math.hypot(dx, dy), L2 = Math.abs(hx - bx), tot = L1 + L2;
  const d = pl * tot;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if (d <= L1) ctx.lineTo(a.x + (dx * d) / L1, a.y + (dy * d) / L1);
  else { ctx.lineTo(bx, by); ctx.lineTo(bx + lado * (d - L1), by); }
  ctx.stroke();
  ctx.restore();
  // texto
  const tx = hx + lado * 14;
  const pt = lt - t0 - 0.4;
  if (pt > 0) {
    ctx.save();
    ctx.globalAlpha = 1 - sai;
    fonte(ctx, 700, o.tam ?? 40, 'Rajdhani');
    const larg = ctx.measureText(texto.toUpperCase()).width;
    ctx.restore();
    textoKinetico(ctx, texto.toUpperCase(), lado > 0 ? tx : tx, by + (o.tam ?? 40) * 0.36, o.tam ?? 40, lt, t0 + 0.4, { fam: 'Rajdhani', peso: 700, al: lado > 0 ? 'esq' : 'dir', t1: o.t1, cor: COR.branco, alfa: 1 - sai, stagger: 0.015 });
    if (o.sub) textoKinetico(ctx, o.sub, tx, by + (o.tam ?? 40) * 0.36 + (o.tamSub ?? 28) * 1.2, o.tamSub ?? 28, lt, t0 + 0.6, { fam: 'Rajdhani', peso: 600, al: lado > 0 ? 'esq' : 'dir', t1: o.t1, cor: o.corSub ?? COR.ouro, alfa: 1 - sai, stagger: 0.012 });
    void larg;
  }
}

/** Cota (linha de medida) entre dois pontos 3D com o valor no meio. */
export function cota(ctx, cam, pa, pb, texto, lt, t0, o = {}) {
  const t1 = o.t1 ?? 1e9;
  if (lt < t0 || lt > t1 + 0.6) return;
  const a = projetar(cam, pa), b = projetar(cam, pb);
  const p = easeOutCubic(prog(lt, t0, t0 + 0.7));
  const sai = smooth(prog(lt, t1, t1 + 0.4));
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const ax = lerp(mx, a.x, p), ay = lerp(my, a.y, p), bx = lerp(mx, b.x, p), by = lerp(my, b.y, p);
  ctx.save();
  ctx.globalAlpha = 1 - sai;
  ctx.strokeStyle = o.cor ?? COR.ouro;
  ctx.fillStyle = o.cor ?? COR.ouro;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const ang = Math.atan2(by - ay, bx - ax);
  for (const [x, y, s] of [[ax, ay, 1], [bx, by, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang + s * 0.4) * 16 * s, y + Math.sin(ang + s * 0.4) * 16 * s);
    ctx.lineTo(x + Math.cos(ang - s * 0.4) * 16 * s, y + Math.sin(ang - s * 0.4) * 16 * s);
    ctx.closePath(); ctx.fill();
    // traço perpendicular
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang + Math.PI / 2) * 14, y + Math.sin(ang + Math.PI / 2) * 14);
    ctx.lineTo(x - Math.cos(ang + Math.PI / 2) * 14, y - Math.sin(ang + Math.PI / 2) * 14);
    ctx.stroke();
  }
  ctx.restore();
  if (p > 0.6) {
    ctx.save();
    ctx.globalAlpha = (1 - sai) * smooth(prog(p, 0.6, 1));
    fonte(ctx, 400, o.tam ?? 40, 'Share Tech Mono');
    const w = ctx.measureText(texto).width;
    const ox = o.ox ?? 0, oy = o.oy ?? -36;
    ctx.fillStyle = 'rgba(8,8,10,0.72)';
    ctx.fillRect(mx + ox - w / 2 - 14, my + oy - (o.tam ?? 40) * 0.8, w + 28, (o.tam ?? 40) * 1.15);
    ctx.fillStyle = COR.branco;
    ctx.textAlign = 'center';
    ctx.fillText(texto, mx + ox, my + oy + (o.tam ?? 40) * 0.08);
    ctx.restore();
  }
}

/** Etiqueta do capítulo no canto inferior esquerdo. a = 0..1 (entrada), s = 0..1 (saída) */
export function etiquetaCapitulo(ctx, num, titulo, a, s = 0) {
  if (a <= 0 || s >= 1) return;
  const e = easeOutExpo(a) * (1 - easeInCubic(s));
  const x = 70, y = 104;
  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate((1 - e) * -60, 0);
  // número
  ctx.fillStyle = COR.ouro;
  ctx.fillRect(x, y - 44, 64, 52);
  fonte(ctx, 900, 34);
  ctx.fillStyle = COR.preto;
  ctx.textAlign = 'center';
  ctx.fillText(String(num).padStart(2, '0'), x + 32, y - 6);
  // título
  ctx.textAlign = 'left';
  fonte(ctx, 700, 34, 'Rajdhani');
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = COR.branco;
  const t = titulo.toUpperCase();
  ctx.fillText(t, x + 82, y - 8);
  const w = ctx.measureText(t).width;
  ctx.fillStyle = COR.ouro;
  ctx.fillRect(x + 82, y + 2, w * e, 3);
  ctx.restore();
}

/** Assinatura discreta no canto superior direito (formato/assunto). */
export function selo(ctx, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.85;
  const x = W - 70, y = 70;
  fonte(ctx, 800, 22);
  ctx.textAlign = 'right';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = COR.branco;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText('BETACAM SP  ·  EM 3D', x, y);
  ctx.fillStyle = COR.vermelho;
  ctx.beginPath(); ctx.arc(x - ctx.measureText('BETACAM SP  ·  EM 3D').width - 22, y - 8, 7, 0, 7); ctx.fill();
  ctx.restore();
}

/** Caixa de texto informativa (fundo escuro translúcido) com título e linhas. */
export function cartao(ctx, x, y, linhas, lt, t0, t1, o = {}) {
  if (lt < t0 || lt > t1 + 0.6) return;
  const a = easeOutExpo(prog(lt, t0, t0 + 0.6));
  const s = smooth(prog(lt, t1, t1 + 0.45));
  const w = o.w ?? 620, lh = o.lh ?? 52, h = (o.pad ?? 34) * 2 + linhas.length * lh - 10;
  ctx.save();
  ctx.globalAlpha = a * (1 - s);
  ctx.translate(0, (1 - a) * 30);
  ctx.fillStyle = 'rgba(10,10,12,0.66)';
  ctx.fillRect(x, y, w * a, h);
  ctx.fillStyle = o.cor ?? COR.ouro;
  ctx.fillRect(x, y, 6, h);
  ctx.restore();
  linhas.forEach((l, i) => {
    const [txt, estilo] = Array.isArray(l) ? l : [l, {}];
    textoKinetico(ctx, txt, x + 34, y + (o.pad ?? 34) + i * lh + (estilo.tam ?? 36) * 0.8, estilo.tam ?? 36, lt, t0 + 0.15 + i * 0.12, {
      fam: estilo.fam ?? 'Rajdhani', peso: estilo.peso ?? 600, cor: estilo.cor ?? COR.branco, t1, alfa: 1 - s, stagger: 0.012,
    });
  });
}
