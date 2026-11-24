// Cenas das Narrações 4 e 5: orçamento da trilha sonora, fechamento (4 anos, agradecimento, lema) e final.
import { W, H, clamp, lerp, prog, easeOutBack, easeOutCubic, easeInCubic, easeInOutCubic, easeOutExpo, rng, inOut } from './util.js';
import * as F from './fx.js';
import * as T from './three3d.js';
import { drawRVA25D } from './logos.js';
import { at, lockup, textPoints, drawParticles } from './common.js';
import { measure as _m } from './fx.js';

let S = {};
export function buildC(E) {
  S.cam = T.camera(35);
  S.cam.position.set(0, 0, 10);
  S.disk = T.buildDisk();
  S.diskScene = T.newScene();
  T.lights(S.diskScene, { key: 2.6, rim: 2.0 });
  S.diskScene.add(S.disk.group);
}

function equalizer(ctx, t, a = 0.5, boost = 0) {
  const n = 56, bw = W / n;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const v = 0.5 + 0.5 * Math.sin(t * (3 + (i % 5)) + i * 1.7) * Math.sin(t * 1.3 + i * 0.4);
    const h = 26 + v * (80 + 45 * boost) + 18 * Math.max(0, Math.sin(t * 2.42 * Math.PI)) * boost;
    ctx.globalAlpha = a;
    ctx.fillStyle = F.RAINBOW[Math.floor((i / n) * 10)];
    F.roundRect(ctx, i * bw + 4, H - h, bw - 8, h + 20, 6);
    ctx.fill();
  }
  ctx.restore();
}
function floatingNotes(ctx, t, seed, a = 0.25) {
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const x = r() * W, sp = 30 + r() * 50, ph = r() * 40, s = 40 + r() * 60;
    const y = H + 60 - ((t + ph) * sp) % (H + 160);
    ctx.save();
    ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t + i));
    F.ICON.note(ctx, x + Math.sin(t * 0.8 + i) * 30, y, s, i % 2 ? '#7dffe0' : '#ffffff');
    ctx.restore();
  }
}

/** Contador estilo "caça-níquel": dígitos rolando até o valor final. */
function slotNumber(ctx, str, cx, cy, size, p, o = {}) {
  ctx.save();
  ctx.font = F.font(size, 400, 'Anton');
  const chars = [...str];
  const ws = chars.map((c) => ctx.measureText(c).width + 6);
  const total = ws.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  chars.forEach((c, i) => {
    const d = parseInt(c, 10);
    if (Number.isNaN(d)) {
      F.text3D(ctx, c, x + ws[i] / 2, cy, { size, fam: 'Anton', weight: 400, align: 'center', ...o });
    } else {
      const k = clamp((p - i * 0.05) / (1 - chars.length * 0.05));
      const spins = 3 + i;
      const v = (1 - easeOutCubic(k)) * spins * 10 + d;
      const base = Math.floor(v), frac = v - base;
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 4, cy - size * 0.56, ws[i] + 8, size * 1.12); ctx.clip();
      [0, 1].forEach((j) => {
        const digit = (((base + j) % 10) + 10) % 10;
        F.text3D(ctx, String(digit), x + ws[i] / 2, cy + (frac - j) * size * 1.1 * -1 + (j ? 0 : 0), { size, fam: 'Anton', weight: 400, align: 'center', ...o });
      });
      ctx.restore();
    }
    x += ws[i];
  });
  ctx.restore();
}

// ------------------------------------------------------------------ 12) orçamento · trilha sonora sem IA
export function orcamento(ctx, t, E) {
  const n = (x) => at('N4', x);
  F.gradientBg(ctx, '#0a3b3f', '#010708', W / 2, H * 0.4);
  F.bokeh(ctx, t, 121, { colors: ['#00F2A0', '#33D4F1', '#FFC83D'], alpha: 0.13, n: 16 });
  floatingNotes(ctx, t, 5, 0.18);
  const boostEq = inOut(t, n(13.5), n(20.0), 0.5, 0.6);
  equalizer(ctx, t, 0.35 + 0.25 * boostEq, boostEq);
  // "PARA TORNAR ESSES LANÇAMENTOS / AINDA MAIS ESPECIAIS"
  const o1 = n(3.55);
  F.kText(ctx, 'PARA TORNAR ESSES LANÇAMENTOS', W / 2, 400, t - n(-0.6), { anim: 'track', size: 70, fill: '#fff', depth: 5, din: 0.7, out: o1 - n(-0.6) });
  F.kText(ctx, 'AINDA MAIS ESPECIAIS', W / 2, 560, t - n(1.6), { anim: 'slam', size: 140, fam: 'Anton', weight: 400, gradient: ['#FFF6CF', '#FFC83D', '#C77700'], stroke: '#140a00', strokeW: 12, depth: 12, depthColor: '#4a2a00', out: o1 - n(1.6), sweepAt: 0.6 });
  if (t > n(1.6) && t < o1 + 0.3) F.sparkles(ctx, t, 41, { n: 40, color: '#FFE9A8', alpha: inOut(t, n(1.6), o1, 0.3, 0.3) });
  // orçamento mínimo R$ 700
  const o2 = n(9.5);
  F.kText(ctx, 'A RVA ESTABELECEU UM', W / 2, 230, t - n(3.75), { anim: 'up', size: 56, fill: '#bff5ea', depth: 4, out: o2 - n(3.75) });
  F.kText(ctx, 'ORÇAMENTO MÍNIMO', W / 2, 350, t - n(5.4), { anim: 'pop', size: 100, fill: '#fff', depth: 8, out: o2 - n(5.4) });
  if (t > n(6.0) && t < o2 + 0.3) {
    const p = clamp((t - n(6.0)) / 1.55);
    const o = 1 - prog(t, o2, o2 + 0.3);
    ctx.save();
    ctx.globalAlpha = o;
    const land = n(7.55);
    const sc = t > land ? 1 + 0.12 * Math.exp(-(t - land) * 7) * Math.cos((t - land) * 25) : 1;
    ctx.translate(W / 2, 620);
    ctx.scale(sc, sc);
    slotNumber(ctx, 'R$ 700', 0, 0, 300, p, { gradient: ['#E9FFF6', '#7dffc8', '#00B37A'], stroke: '#002a1c', strokeW: 18, depth: 18, depthColor: '#003a26', glow: t > land ? '#00F2A0' : undefined, glowSize: 0.25 });
    ctx.restore();
    if (t > land) {
      F.ring(ctx, W / 2, 620, t - land, { color: '#7dffc8', r: 800, width: 22 });
      F.burst(ctx, W / 2, 620, t - land, { color: '#ffffff', n: 22, r0: 380, len: 400, width: 10 });
      F.confetti(ctx, t - land, 131, { x: W / 2, y: 650, power: 1300, spread: 6.2, n: 60, colors: ['#00F2A0', '#FFC83D', '#ffffff'], gravity: 900, dur: 2 });
      F.kText(ctx, 'REAIS', W / 2, 830, t - land - 0.1, { anim: 'pop', size: 70, fill: '#bff5ea', depth: 5, out: o2 - land - 0.1 });
    }
  }
  // objetivo: contratar um freelancer de trilhas sonoras · 99Freelas
  const o3 = n(20.1);
  if (t > n(9.6) && t < o3 + 0.3) {
    const p = easeOutBack(clamp((t - n(9.7)) / 0.4), 2);
    const o = 1 - prog(t, o3, o3 + 0.3);
    ctx.save(); ctx.globalAlpha = o;
    F.pill(ctx, 'O OBJETIVO', W / 2, 150, { size: 40, bg: '#00B37A', scale: p, icon: F.ICON.star, iconColor: '#FFF' });
    ctx.restore();
  }
  F.kText(ctx, 'CONTRATAR UM PROFISSIONAL', W / 2, 275, t - n(10.9), { anim: 'up', size: 72, fill: '#fff', depth: 5, out: o3 - n(10.9) });
  F.kText(ctx, 'FREELANCER', W / 2, 455, t - n(12.6), { anim: 'slam', size: 190, fam: 'Anton', weight: 400, chrome: true, stroke: '#00140f', strokeW: 14, depth: 16, depthColor: '#003a2e', out: o3 - n(12.6), sweepAt: 0.6, tracking: 6 });
  if (t > n(13.9) && t < o3 + 0.3) {
    const q = t - n(13.95);
    const o = 1 - prog(t, o3, o3 + 0.3);
    const p = easeOutBack(clamp(q / 0.4), 2);
    ctx.save(); ctx.globalAlpha = o;
    ctx.save(); ctx.translate(330, 650); ctx.scale(p, p); ctx.rotate(Math.sin(t * 3) * 0.06);
    ctx.shadowColor = '#33D4F1'; ctx.shadowBlur = 40;
    F.ICON.headphones(ctx, 0, 0, 170, '#33D4F1');
    ctx.restore();
    ctx.restore();
    F.kText(ctx, 'ESPECIALIZADO EM', 1060, 600, q, { anim: 'up', size: 56, fill: '#d6fff6', depth: 4, out: o3 - n(13.95) });
    F.kText(ctx, 'TRILHAS SONORAS', 1060, 705, q - 0.4, { anim: 'pop', size: 104, gradient: ['#E0FBFF', '#33D4F1', '#1677D6'], depth: 9, out: o3 - n(13.95) - 0.4 });
    // notas explodindo
    const r = rng(7);
    for (let i = 0; i < 12; i++) {
      const a = r() * 6.283, d = easeOutExpo(clamp(q / 1.2)) * (200 + r() * 260);
      ctx.save();
      ctx.globalAlpha = clamp(1.6 - q * 0.5) * o;
      F.ICON.note(ctx, 330 + Math.cos(a) * d, 650 + Math.sin(a) * d * 0.7, 46, i % 2 ? '#7dffe0' : '#fff');
      ctx.restore();
    }
  }
  F.kText(ctx, 'ATRAVÉS DA PLATAFORMA', W / 2, 810, t - n(16.3), { anim: 'up', size: 48, fill: '#bff5ea', depth: 3, out: o3 - n(16.3) });
  if (t > n(18.0) && t < o3 + 0.3) {
    const p = easeOutBack(clamp((t - n(18.05)) / 0.4), 2.2);
    const o = 1 - prog(t, o3, o3 + 0.3);
    ctx.save(); ctx.globalAlpha = o;
    F.pill(ctx, '99FREELAS', W / 2, 900, { size: 70, bg: '#ffffff', color: '#0a3b3f', scale: p, border: '#00F2A0' });
    ctx.restore();
    F.ring(ctx, W / 2, 900, t - n(18.05), { color: '#00F2A0', r: 400, width: 10 });
  }
  // produção profissional
  const o4 = n(24.2);
  F.kText(ctx, 'PRODUÇÃO', W / 2, 400, t - n(20.45), { anim: 'track', size: 140, fill: '#fff', depth: 10, din: 0.6, out: o4 - n(20.45) });
  if (t > n(22.8) && t < o4 + 0.3) {
    const q = t - n(22.84);
    F.kText(ctx, 'PROFISSIONAL', W / 2 + 60, 600, q, { anim: 'slam', size: 170, fam: 'Anton', weight: 400, gradient: ['#FFF6CF', '#FFC83D', '#C77700'], stroke: '#140a00', strokeW: 12, depth: 14, depthColor: '#4a2a00', out: o4 - n(22.84) });
    const p = easeOutBack(clamp((q - 0.2) / 0.35), 2.5);
    ctx.save(); ctx.globalAlpha = 1 - prog(t, o4, o4 + 0.3);
    ctx.translate(W / 2 - 520, 600); ctx.scale(p, p);
    F.ICON.check(ctx, 0, 0, 150, '#2FD14A');
    ctx.restore();
  }
  // sem IA na composição musical
  const o5 = n(30.0);
  if (t > n(24.3) && t < o5 + 0.3) {
    const q = t - n(24.37);
    const o = 1 - prog(t, o5, o5 + 0.3);
    const slash = n(25.55);
    const p = easeOutBack(clamp(q / 0.4), 2);
    ctx.save(); ctx.globalAlpha = o;
    ctx.save(); ctx.translate(560, 450); ctx.scale(p, p);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.arc(0, 0, 230, 0, 6.283); ctx.fill();
    F.ICON.robot(ctx, 0, 10, 300, '#9aa3b8');
    if (t > slash) {
      const k = clamp((t - slash) / 0.18);
      ctx.strokeStyle = '#FF1E3C';
      ctx.lineWidth = 34;
      ctx.shadowColor = '#ff1e3c'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(0, 0, 220, 0, 6.283 * k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-155, -155); ctx.lineTo(-155 + 310 * k, -155 + 310 * k); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    F.kText(ctx, 'INTELIGÊNCIA ARTIFICIAL', 560, 770, q - 0.2, { anim: 'up', size: 44, fill: '#c9cfdd', depth: 3, out: o5 - n(24.37) - 0.2 });
    if (t > slash) {
      F.flash(ctx, t, slash, 0.25, 0.3, '255,40,60');
      F.kText(ctx, 'SEM IA', 1300, 400, t - slash, { anim: 'slam', size: 220, fam: 'Anton', weight: 400, gradient: ['#FFD0D6', '#FF1E3C', '#9A0018'], stroke: '#1a0003', strokeW: 16, depth: 16, depthColor: '#4a0010', out: o5 - slash });
    }
    F.kText(ctx, 'NA COMPOSIÇÃO', 1300, 600, t - n(27.8), { anim: 'up', size: 72, fill: '#fff', depth: 5, out: o5 - n(27.8) });
    F.kText(ctx, 'MUSICAL', 1300, 700, t - n(28.3), { anim: 'up', size: 72, fill: '#fff', depth: 5, out: o5 - n(28.3) });
  }
  // valorizar o trabalho humano, a criatividade e a qualidade musical
  if (t > n(30.3)) {
    const q = t - n(30.4);
    F.stamp(ctx, [{ t: '100% HUMANO', size: 110 }], W / 2, 230, q, { color: '#2FD14A', rot: -0.05, bg: 'rgba(0,0,0,0.25)' });
    F.kText(ctx, 'QUEREMOS VALORIZAR', W / 2, 420, q - 0.3, { anim: 'up', size: 56, fill: '#d6fff6', depth: 4 });
    const pil = [
      { s: 'TRABALHO', s2: 'HUMANO', t0: n(31.5), x: 440, icon: 'heart', c: '#FF3D6E' },
      { s: 'CRIATIVIDADE', t0: n(33.05), x: 960, icon: 'wand', c: '#B06BFF' },
      { s: 'QUALIDADE', s2: 'MUSICAL', t0: n(34.95), x: 1480, icon: 'note', c: '#33D4F1' },
    ];
    pil.forEach((it, i) => {
      const lt = t - it.t0;
      if (lt < 0) return;
      const p = easeOutBack(clamp(lt / 0.45), 1.8);
      ctx.save();
      ctx.translate(it.x, 700 + Math.sin(t * 2 + i) * 6);
      ctx.scale(p, p);
      F.card(ctx, -220, -170, 440, 340, { border: [it.c, '#ffffff', it.c], top: 'rgba(8,40,44,0.95)', bottom: 'rgba(2,12,14,0.95)' });
      F.ICON[it.icon](ctx, 0, -60, 130, it.c);
      F.text3D(ctx, it.s, 0, it.s2 ? 70 : 90, { size: it.s2 ? 54 : 52, depth: 4 });
      if (it.s2) F.text3D(ctx, it.s2, 0, 125, { size: 46, depth: 4, fill: it.c });
      ctx.restore();
      F.ring(ctx, it.x, 700, lt, { color: it.c, r: 360, width: 12 });
    });
  }
}

// ------------------------------------------------------------------ 13) fechamento
export function fechamento(ctx, t, E) {
  const n = (x) => at('N5', x);
  const darkK = clamp((t - n(21.9)) / 0.5);
  // fase clara (estúdio branco, como o final da vinheta)
  if (darkK < 1) {
    F.gradientBg(ctx, '#ffffff', '#b9c0cf', W / 2, H * 0.45, W * 0.8);
    F.bokeh(ctx, t, 141, { alpha: 0.12, n: 18, blend: 'source-over', soft: 0.5 });
  }
  if (darkK > 0) {
    ctx.save(); ctx.globalAlpha = darkK;
    F.gradientBg(ctx, '#141a3c', '#020309', W / 2, H / 2);
    ctx.restore();
  }
  const NAVY = '#16203d';
  const lightText = { fill: NAVY, stroke: '#ffffff', strokeW: 0, depth: 6, depthColor: '#aeb6c8', shadowColor: 'rgba(40,50,80,0.25)' };
  // disco do 4
  const dIn = clamp((t - n(-0.45)) / 1.3);
  const toTop = easeInOutCubic(prog(t, n(4.9), n(5.6)));
  const dOut = prog(t, n(11.6), n(12.0));
  if (dIn > 0 && dOut < 1) {
    const d = S.disk;
    T.assembleDisk(d, easeOutCubic(dIn), 5);
    d.group.visible = true;
    d.group.scale.setScalar(lerp(2.25, 1.1, toTop) * (1 - easeInCubic(dOut)));
    d.group.position.set(lerp(-2.35, 0, toTop), lerp(0, 1.95, toTop), 0);
    d.group.rotation.set(Math.sin(t * 0.8) * 0.08, 0.25 * Math.sin(t * 0.5) + lerp(0.3, 0, toTop), 0);
    d.logo.visible = dIn > 0.7;
    T.draw3D(ctx, S.diskScene, S.cam);
  }
  const oA = n(4.9) - n(0.05);
  F.kText(ctx, '4 ANOS', 1340, 410, t - n(0.05), { anim: 'slam', size: 250, fam: 'Anton', weight: 400, ...lightText, depth: 14, out: oA });
  F.kText(ctx, 'DE HISTÓRIA', 1340, 620, t - n(0.55), { anim: 'up', size: 100, gradient: ['#7413FF', '#518FFE', '#00B37A'], depth: 6, depthColor: '#aeb6c8', strokeW: 0, shadowColor: 'rgba(40,50,80,0.25)', out: n(2.3) - n(0.55) });
  F.kText(ctx, 'DE DEDICAÇÃO', 1340, 620, t - n(2.5), { anim: 'up', size: 100, gradient: ['#FF5301', '#FF0016', '#FD007D'], depth: 6, depthColor: '#aeb6c8', strokeW: 0, shadowColor: 'rgba(40,50,80,0.25)', out: n(4.9) - n(2.5) });
  // preservando · recriando · restaurando
  const o2 = n(11.75);
  const cols = [
    { s: 'PRESERVANDO', t0: n(5.55), x: 470, icon: 'tape', c: '#7413FF' },
    { s: 'RECRIANDO', t0: n(7.3), x: 960, icon: 'pencil', c: '#FF7A00' },
    { s: 'RESTAURANDO', t0: n(8.45), x: 1450, icon: 'wand', c: '#00B3A0' },
  ];
  cols.forEach((c, i) => {
    const lt = t - c.t0;
    if (lt < 0 || t > o2 + 0.35) return;
    const p = easeOutBack(clamp(lt / 0.45), 1.8);
    const o = 1 - prog(t, o2, o2 + 0.3);
    ctx.save();
    ctx.globalAlpha = o;
    ctx.translate(c.x, 590);
    ctx.scale(p, p);
    ctx.shadowColor = 'rgba(30,40,80,0.3)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#ffffff';
    F.roundRect(ctx, -210, -150, 420, 300, 30); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = c.c;
    F.roundRect(ctx, -210, 110, 420, 40, 20); ctx.fill();
    ctx.fillRect(-210, 110, 420, 20);
    ctx.fillStyle = c.c + '22';
    ctx.beginPath(); ctx.arc(0, -40, 85, 0, 6.283); ctx.fill();
    F.ICON[c.icon](ctx, 0, -40, 120, c.c);
    F.text3D(ctx, c.s, 0, 78, { size: 46, fill: NAVY, strokeW: 0, depth: 0, shadow: false, shine: false });
    ctx.restore();
    F.ring(ctx, c.x, 590, lt, { color: c.c, r: 340, width: 10 });
  });
  F.kText(ctx, 'MEMÓRIAS AUDIOVISUAIS', W / 2, 860, t - n(9.8), { anim: 'track', size: 92, ...lightText, din: 0.6, out: o2 - n(9.8) });
  // agradecimento
  const o3 = n(21.95);
  F.kText(ctx, 'A REDE VANGUARDA ARQUIVOS AGRADECE', W / 2, 200, t - n(12.1), { anim: 'up', size: 58, ...lightText, depth: 4, out: o3 - n(12.1) });
  const ob = n(13.5);
  if (t > ob - 0.05 && t < o3 + 0.4) {
    const lt = t - ob;
    F.confetti(ctx, lt, 151, { x: W * 0.15, y: H + 20, power: 1700, spread: 1.2, n: 90 });
    F.confetti(ctx, lt, 152, { x: W * 0.85, y: H + 20, power: 1700, spread: 1.2, n: 90 });
    if (lt > 1) { ctx.save(); ctx.globalAlpha = clamp(lt - 1) * (1 - prog(t, o3, o3 + 0.4)); F.confettiRain(ctx, t, 153, { n: 70 }); ctx.restore(); }
    F.kText(ctx, 'OBRIGADO!', W / 2, 410, lt, { anim: 'chars', size: 250, fam: 'Anton', weight: 400, colors: F.RAINBOW.filter((_, i) => i % 2 === 0), stroke: '#ffffff', strokeW: 14, depth: 14, depthColor: '#9aa3b8', out: o3 - ob, stagger: 0.05 });
  }
  const who = [
    { s: 'INSCRITOS', t0: n(15.45), x: 430, c: '#E3122B', icon: 'users' },
    { s: 'COLABORADORES', t0: n(17.15), x: 960, c: '#1677D6', icon: 'heart' },
    { s: 'AMIGOS', t0: n(18.9), x: 1490, c: '#2FA21E', icon: 'chat' },
  ];
  who.forEach((w) => {
    if (t < w.t0 || t > o3 + 0.35) return;
    const p = easeOutBack(clamp((t - w.t0) / 0.4), 2.2);
    ctx.save();
    ctx.globalAlpha = 1 - prog(t, o3, o3 + 0.3);
    F.pill(ctx, w.s, w.x, 690, { size: 44, bg: w.c, scale: p, icon: F.ICON[w.icon], iconColor: '#fff' });
    ctx.restore();
  });
  F.kText(ctx, 'QUE FIZERAM PARTE DESSA TRAJETÓRIA', W / 2, 850, t - n(19.6), { anim: 'up', size: 58, ...lightText, depth: 4, out: o3 - n(19.6) });
  // fase escura: "E lembre-se" · "Tudo que se perde..." · "...recria ou restaura."
  if (darkK > 0) {
    F.bokeh(ctx, t, 161, { alpha: 0.12 * darkK, n: 14 });
    F.kText(ctx, 'E LEMBRE-SE...', W / 2, 380, t - n(22.35), { anim: 'track', size: 84, fill: '#c8d0ff', depth: 5, din: 0.6, out: n(23.9) - n(22.35) });
    const tq = n(24.05), blow = n(25.9), back = n(26.75), done = n(27.45);
    if (t > tq && t < blow) F.kText(ctx, 'TUDO QUE SE PERDE...', W / 2, 480, t - tq, { anim: 'track', size: 124, fill: '#ffffff', depth: 8, din: 0.7 });
    if (t >= blow && t < back + 0.3) {
      const pts = textPoints('TUDO QUE SE PERDE...', 124, { step: 4 });
      drawParticles(ctx, pts, W / 2, 480, clamp((t - blow) / 0.85), 3, { size: 4, fromLeft: true, colors: ['#ffffff', '#c8d0ff'] });
    }
    if (t >= back) {
      const pts = textPoints('...RECRIA OU RESTAURA.', 124, { step: 4 });
      const k = 1 - easeOutCubic(clamp((t - back) / 0.7));
      if (t < done) drawParticles(ctx, pts, W / 2, 600, k, 9, { size: 4, colors: F.RAINBOW, dir: -1 });
      else {
        F.flash(ctx, t, done, 0.4, 0.5);
        F.kText(ctx, '...RECRIA OU RESTAURA.', W / 2, 600, t - done, { anim: 'pop', size: 124, colors: undefined, gradient: ['#E9D9FF', '#FFFFFF', '#9FE8FF'], depth: 10, depthColor: '#2a1f5a', glow: '#b06bff', glowSize: 0.35, din: 0.25, sweepAt: 0.4 });
        F.sparkles(ctx, t, 171, { n: 40, alpha: clamp(t - done) });
      }
    }
  }
}

// ------------------------------------------------------------------ 14) final: RVA · 30/01/2023 -> 30/01/2027 · Feliz 4 anos
export function final(ctx, t, E) {
  const n = (x) => at('N5', x);
  const party = n(38.96);
  const P = clamp((t - party) / 0.3);
  F.gradientBg(ctx, '#1d1446', '#03020a', W / 2, H * 0.45);
  if (P > 0) {
    ctx.save(); ctx.globalAlpha = P * 0.5;
    F.rainbowStripes(ctx, t, { speed: 90, band: 80 });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = P;
    F.gradientBg(ctx, 'rgba(40,20,90,0.55)', 'rgba(3,2,10,0.92)', W / 2, H * 0.42);
    ctx.restore();
  }
  F.rays(ctx, W / 2, H * 0.4, t, { alpha: 0.07 + 0.1 * P, colors: F.RAINBOW, n: 20 });
  F.bokeh(ctx, t, 181, { alpha: 0.2, n: 20 });
  // logo RVA + REDE VANGUARDA ARQUIVOS
  const l0 = n(29.2);
  const up = easeInOutCubic(prog(t, n(31.6), n(32.2)));
  const out1 = prog(t, party - 0.2, party);
  if (t > l0 - 0.05 && out1 < 1) {
    const lt = t - l0;
    ctx.save();
    ctx.globalAlpha = 1 - out1;
    drawRVA25D(ctx, W / 2, lerp(400, 230, up), lerp(800, 470, up), { stripes: clamp(lt / 0.8) * 10, r: clamp(lt / 0.4), a: clamp((lt - 0.1) / 0.4), depth: 16, outline: 10, gap: 16, letterShade: true, glow: 'rgba(176,107,255,0.6)' });
    lockup(ctx, E, W / 2, lerp(760, 450, up), lerp(80, 52, up), { p: clamp((t - n(29.75)) / 0.6), chrome: true });
    ctx.restore();
    F.flash(ctx, t, l0, 0.4, 0.6);
  }
  // datas
  if (t > n(31.9) && out1 < 1) {
    const o = 1 - out1;
    ctx.save(); ctx.globalAlpha = o;
    const d1 = t - n(32.07), d2 = t - n(35.45);
    F.kText(ctx, '30.01.2023', 500, 680, d1, { anim: 'slam', size: 130, fam: 'Anton', weight: 400, chrome: true, stroke: '#0b0f1e', strokeW: 12, depth: 12, depthColor: '#2a3550' });
    if (d1 > 0.4) F.pill(ctx, 'O INÍCIO', 500, 820, { size: 36, bg: '#518FFE', scale: easeOutBack(clamp((d1 - 0.4) / 0.35), 2) });
    const pa = easeInOutCubic(prog(t, n(35.6), n(36.9)));
    if (pa > 0) {
      const g = ctx.createLinearGradient(780, 0, 1140, 0);
      F.RAINBOW.forEach((c, i) => g.addColorStop(i / 9, c));
      ctx.strokeStyle = g; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(780, 680); ctx.lineTo(lerp(780, 1140, pa), 680); ctx.stroke();
    }
    F.kText(ctx, '30.01.2027', 1420, 680, d2, { anim: 'slam', size: 130, fam: 'Anton', weight: 400, gradient: ['#FFF6CF', '#FFC83D', '#C77700'], stroke: '#140a00', strokeW: 12, depth: 12, depthColor: '#4a2a00', glow: '#FFB000', glowSize: 0.2 });
    if (d2 > 0.5) F.pill(ctx, '4 ANOS', 1420, 820, { size: 36, bg: '#E08A00', scale: easeOutBack(clamp((d2 - 0.5) / 0.35), 2) });
    if (pa >= 1) F.ring(ctx, 960, 680, t - n(36.9), { color: '#fff', r: 300, width: 10 });
    ctx.restore();
  }
  // FELIZ 4 ANOS, RVA!
  if (t > party - 0.05) {
    const lt = t - party;
    const endCard = n(45.4);
    const ec = easeInOutCubic(prog(t, endCard, endCard + 0.8));
    F.flash(ctx, t, party, 0.6, 1);
    // disco girando no centro
    const d = S.disk;
    T.assembleDisk(d, 1, 0);
    d.group.visible = true;
    const spin = (1 - easeOutCubic(clamp(lt / 1.4))) * Math.PI * 4;
    d.group.scale.setScalar(lerp(lerp(0.2, 2.0, easeOutBack(clamp(lt / 0.7), 1.5)), 1.85, ec));
    d.group.position.set(0, lerp(1.0, 0.95, ec) + Math.sin(t * 1.4) * 0.05, 0);
    d.group.rotation.set(Math.sin(t * 0.9) * 0.08, spin + Math.sin(t * 0.7) * 0.18, 0);
    d.logo.visible = true;
    const hg = ctx.createRadialGradient(W / 2, 370, 0, W / 2, 370, 520);
    hg.addColorStop(0, 'rgba(255,220,150,0.45)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);
    T.draw3D(ctx, S.diskScene, S.cam);
    // fogos (explosões de linhas coloridas)
    const r = rng(191);
    for (let i = 0; i < 14; i++) {
      const ft = 0.2 + i * 0.42; // mesmos tempos dos estalos no timeline.json
      const x = 200 + r() * 1520, y = 120 + r() * 380;
      F.burst(ctx, x, y, lt - ft, { color: F.RAINBOW[i % 10], n: 14, r0: 10, len: 130 + r() * 90, width: 6, dur: 0.8, glow: true });
      F.ring(ctx, x, y, lt - ft, { color: F.RAINBOW[(i + 3) % 10], r: 120, width: 4, dur: 0.6 });
    }
    F.confetti(ctx, lt, 201, { x: 0, y: H, power: 2000, spread: 0.9, n: 120 });
    F.confetti(ctx, lt, 202, { x: W, y: H, power: 2000, spread: 0.9, n: 120 });
    if (lt > 1.2) { ctx.save(); ctx.globalAlpha = clamp(lt - 1.2) * (1 - prog(t, n(52.2), n(52.8))); F.confettiRain(ctx, t, 203, { n: 80 }); ctx.restore(); }
    // textos
    const outF = endCard - party;
    const s1 = 'FELIZ 4 ANOS,', s2 = 'RVA!';
    const size = 150;
    const w1 = _m(ctx, s1 + ' ', size, { fam: 'Anton', weight: 400 }), w2 = _m(ctx, s2, size, { fam: 'Anton', weight: 400 });
    const x0 = W / 2 - (w1 + w2) / 2;
    const tx = { size, fam: 'Anton', weight: 400, stroke: '#140a00', strokeW: 14, depth: 14, depthColor: '#4a2a00' };
    F.kText(ctx, s1, x0 + w1 / 2 - 20, 860, lt - 0.05, { ...tx, anim: 'slam', gradient: ['#FFF6CF', '#FFC83D', '#C77700'], out: outF, sweepAt: 0.8 });
    F.kText(ctx, s2, x0 + w1 + w2 / 2, 860, t - n(41.2), { ...tx, anim: 'slam', colors: ['#FF0016', '#518FFE', '#2FA21E', '#FFC83D'], out: endCard - n(41.2) });
    F.kText(ctx, 'E QUE VENHAM MUITOS OUTROS!', W / 2, 1000, t - n(42.45), { anim: 'up', size: 58, fill: '#fff', depth: 4, out: endCard - n(42.45) });
    // cartela final: 30 de janeiro de 2027 · lançamento secreto
    if (t > endCard + 0.3) {
      const q = t - endCard - 0.3;
      F.kText(ctx, '30 DE JANEIRO DE 2027', W / 2, 835, q, { anim: 'track', size: 104, fam: 'Anton', weight: 400, chrome: true, stroke: '#0b0f1e', strokeW: 10, depth: 10, depthColor: '#2a3550', din: 0.7, sweepAt: 1.2 });
      if (q > 0.7) F.pill(ctx, 'LANÇAMENTO SECRETO', W / 2, 955, { size: 44, bg: '#E3122B', scale: easeOutBack(clamp((q - 0.7) / 0.4), 2), icon: F.ICON.lock, iconColor: '#FFC83D' });
      if (q > 1.6) F.pill(ctx, 'INSCREVA-SE E ATIVE O SININHO', 1560, 1025, { size: 26, bg: 'rgba(10,10,24,0.85)', scale: easeOutBack(clamp((q - 1.6) / 0.4), 2), icon: F.ICON.bell, iconColor: '#FFC83D' });
    }
  }
  // fade final
  const fe = prog(t, n(51.9), n(52.95));
  if (fe > 0) { ctx.fillStyle = `rgba(0,0,0,${fe})`; ctx.fillRect(0, 0, W, H); }
}
