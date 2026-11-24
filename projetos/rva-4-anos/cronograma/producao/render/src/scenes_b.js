// Cenas das Narrações 2 e 3 + o teaser do 30 de janeiro: dezembro (RVA Lives), janeiro, o segredo e a revelação da data.
import { W, H, clamp, lerp, prog, easeOutBack, easeOutCubic, easeInCubic, easeInOutCubic, easeOutExpo, rng, inOut } from './util.js';
import * as F from './fx.js';
import * as T from './three3d.js';
import { at, livesText, arcs2D, isoCube, chatBubble, PX_PER_UNIT } from './common.js';

let S = {};
export function buildB(E) {
  S.cam = T.camera(35);
  S.cam.position.set(0, 0, 10);
  S.arcScene = T.newScene();
  T.lights(S.arcScene, { key: 1.7, rim: 1.6, amb: 0.45 });
  S.arcs = T.buildArcs();
  S.arcScene.add(S.arcs.group);
  S.boxScene = T.newScene();
  T.lights(S.boxScene, { key: 1.2, rim: 3.2, rimColor: '#7a5cff', amb: 0.1 });
  S.spot = new T.THREE.SpotLight('#ffffff', 60, 30, 0.45, 0.6, 1.5);
  S.spot.position.set(0, 7, 4);
  S.boxScene.add(S.spot, S.spot.target);
  S.box1 = T.buildSecretBox('?', 'SECRETO #1');
  S.box2 = T.buildSecretBox('?', 'SECRETO #2');
  S.boxScene.add(S.box1.group, S.box2.group);
}

/** Logo RVA LIVES: 3 arcos em 3D girando + "LIVES" cromado. p = entrada (0..1). */
function livesLogo(ctx, t, cx, cy, scale, p, o = {}) {
  if (p <= 0) return;
  const e = easeOutBack(clamp(p), 1.4);
  const ax = cx - 330 * scale, ay = cy;
  const g = S.arcs.group;
  g.visible = true;
  g.position.set((ax - W / 2) / PX_PER_UNIT, -(ay - H / 2) / PX_PER_UNIT, 0);
  const s = 1.7 * scale * e;
  g.scale.set(s, s, s);
  g.rotation.set(0.18 + Math.sin(t * 0.8) * 0.1, (1 - e) * 4 + 0.22 + Math.sin(t * 0.6) * 0.18, (1 - e) * -2 + (o.spin ?? 0) * t);
  T.draw3D(ctx, S.arcScene, S.cam);
  const pt = clamp((p - 0.35) / 0.65);
  if (pt > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(pt * 2);
    const slide = (1 - easeOutCubic(pt)) * 400;
    livesText(ctx, cx - 120 * scale + slide, cy + 20 * scale, 230 * scale, { sweep: o.sweep });
    ctx.restore();
  }
}

function snow(ctx, t, seed, a = 0.6) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) {
    const x0 = r() * W, sp = 40 + r() * 90, s = 1.5 + r() * 4, ph = r() * 30;
    const y = ((t + ph) * sp) % (H + 20) - 10;
    ctx.globalAlpha = a * (0.4 + r() * 0.6);
    ctx.beginPath(); ctx.arc(x0 + Math.sin((t + ph) * 0.9) * 30, y, s, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}

function monthTitle(ctx, t, t0, tOut, mes, ano, parte, depthColor) {
  const lt = t - t0;
  const out = tOut - t0;
  F.kText(ctx, mes, W / 2, 440, lt, { anim: 'slam', size: 260, fam: 'Anton', weight: 400, fill: '#fff', stroke: '#06060f', strokeW: 16, depth: 20, depthColor, out, sweepAt: 0.6, tracking: 4 });
  F.kText(ctx, ano, W / 2, 650, lt - 0.3, { anim: 'pop', size: 120, gradient: ['#FFF1B8', '#FFC83D', '#E08A00'], depth: 8, out: out - 0.3 });
  F.kText(ctx, parte, W / 2, 800, lt - 0.55, { anim: 'up', size: 40, fill: '#ffffffcc', depth: 0, strokeW: 0, out: out - 0.55, tracking: 8 });
  F.ring(ctx, W / 2, 460, lt, { color: '#fff', r: 1100, width: 24 });
}

/** Etiqueta do mês no canto depois do título. */
function monthChip(ctx, t, t0, str, color) {
  if (t < t0) return;
  const p = easeOutBack(clamp((t - t0) / 0.4), 2);
  F.pill(ctx, str, 1720, 80, { size: 34, bg: color, scale: p, icon: F.ICON.calendar, iconColor: color === '#fff' ? '#333' : color });
}

// ------------------------------------------------------------------ 8) DEZEMBRO · RVA Lives
export function dezembro(ctx, t, E) {
  const n = (x) => at('N2', x);
  F.gradientBg(ctx, '#1a0e2e', '#030208', W / 2, H * 0.45);
  F.bokeh(ctx, t, 81, { colors: ['#F2471A', '#1677D6', '#2FA21E'], alpha: 0.28, n: 24 });
  snow(ctx, t, 3, 0.5);
  monthTitle(ctx, t, n(-0.85), n(1.85), 'DEZEMBRO', '2026', 'CRONOGRAMA  •  PARTE 1', '#7a0a14');
  monthChip(ctx, t, n(2.0), 'DEZ 2026', '#C8102E');
  // RVA Lives
  const pl = clamp((t - n(1.95)) / 0.9);
  const up = easeInOutCubic(prog(t, n(3.7), n(4.3)));
  const fade = 1 - prog(t, n(9.55), n(9.85));
  if (pl > 0 && fade > 0) {
    ctx.save();
    ctx.globalAlpha = fade;
    livesLogo(ctx, t, W / 2 + 60, lerp(480, 250, up), lerp(1, 0.62, up), pl, { sweep: clamp((t - n(3.0)) / 0.7) });
    ctx.restore();
  } else S.arcs.group.visible = false;
  if (pl > 0 && pl < 1) F.flash(ctx, t, n(2.4), 0.35, 0.5);
  // eventos especiais com PIGGY, direto do Roblox
  const lt = t - n(3.9);
  const outB = n(9.55) - n(3.9);
  F.kText(ctx, 'EVENTOS ESPECIAIS COM', W / 2, 470, lt, { anim: 'up', size: 66, fill: '#fff', depth: 5, out: outB });
  if (t > n(6.3)) {
    const q = t - n(6.35);
    // bloquinhos voando
    const r = rng(17);
    for (let i = 0; i < 16; i++) {
      const ang = r() * 6.283, d = 380 + r() * 420, s = 40 + r() * 60;
      const k = easeOutExpo(clamp(q / 0.8));
      const x = W / 2 + Math.cos(ang) * d * k, y = 600 + Math.sin(ang) * d * 0.45 * k + Math.sin(t * 2 + i) * 14;
      ctx.globalAlpha = clamp(q * 3) * (1 - prog(t, n(9.55), n(9.85)));
      isoCube(ctx, x, y, s, ['#FF6FA8', '#FFC83D', '#33D4F1', '#7BFC2D', '#B06BFF'][i % 5], Math.sin(t + i) * 0.3);
    }
    ctx.globalAlpha = 1;
    F.flash(ctx, t, n(6.35), 0.3, 0.4, '255,120,180');
    F.kText(ctx, 'PIGGY', W / 2, 640, q, { anim: 'slam', size: 200, fam: 'Bungee', weight: 400, gradient: ['#FFD3E6', '#FF6FA8', '#D61F6E'], stroke: '#2b0616', strokeW: 16, depth: 16, depthColor: '#5a0a2e', out: n(9.55) - n(6.35), rot: Math.sin(t * 3) * 0.03 });
  }
  if (t > n(7.3)) {
    const q = t - n(7.3);
    const p = easeOutBack(clamp(q / 0.4), 2);
    const o = 1 - prog(t, n(9.55), n(9.85));
    ctx.save();
    ctx.globalAlpha = o;
    ctx.translate(W / 2, 830);
    ctx.rotate(-0.04);
    ctx.scale(p, p);
    ctx.fillStyle = '#111';
    F.roundRect(ctx, -380, -62, 760, 124, 12); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke();
    F.text3D(ctx, 'DIRETO DO ROBLOX', 0, 4, { size: 66, fam: 'Bungee', weight: 400, fill: '#fff', depth: 0, strokeW: 0, shine: false });
    ctx.restore();
  }
  // diversão · interação com os inscritos
  const lt2 = t - n(9.8);
  if (lt2 > -0.1 && t < n(14.6)) {
    const out = n(14.3) - n(9.8);
    F.kText(ctx, 'DIVERSÃO', 560, 420, lt2, { anim: 'slam', size: 150, gradient: ['#FFF3A8', '#FFC83D', '#FF7A00'], depth: 12, out });
    F.kText(ctx, 'INTERAÇÃO COM', 560, 600, lt2 - 1.5, { anim: 'up', size: 74, fill: '#fff', depth: 5, out: out - 1.5 });
    F.kText(ctx, 'OS INSCRITOS', 560, 700, lt2 - 1.75, { anim: 'up', size: 90, gradient: ['#B8F0FF', '#33D4F1', '#1677D6'], depth: 7, out: out - 1.75 });
    const msgs = ['BORA!!', 'KKKKKK', 'QUE TOP!', 'PIGGY!!', 'AO VIVO!', 'SALVE RVA', 'GG', 'VAMOS!'];
    const cols = ['#F2471A', '#1677D6', '#2FA21E', '#B06BFF', '#FF6FA8'];
    msgs.forEach((m, i) => {
      const st = 0.4 + i * 0.5;
      const q = lt2 - st;
      if (q < 0) return;
      const y = 900 - q * 150;
      const a = clamp(q * 4) * clamp((y + 50) / 200) * (1 - prog(t, n(14.3), n(14.6)));
      chatBubble(ctx, 1380 + (i % 2 ? 170 : -60), y, m, cols[i % cols.length], a, easeOutBack(clamp(q / 0.3), 2));
    });
  }
  // AO VIVO · muita emoção
  const lt3 = t - n(14.46);
  if (lt3 > -0.1 && t < n(18.6)) {
    const out = n(18.25) - n(14.46);
    const o = 1 - prog(t, n(18.25), n(18.55));
    const p = easeOutBack(clamp(lt3 / 0.4), 2);
    const pulse = 1 + 0.05 * Math.sin(t * 8);
    for (let k = 0; k < 3; k++) F.ring(ctx, W / 2, 430, ((lt3 + k * 0.5) % 1.5), { color: '#ff3355', r: 600, width: 10, dur: 1.5, alpha: o });
    ctx.save();
    ctx.globalAlpha = o;
    ctx.translate(W / 2, 430);
    ctx.scale(p * pulse, p * pulse);
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 60;
    ctx.fillStyle = '#E3122B';
    F.roundRect(ctx, -330, -100, 660, 200, 40); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha *= 0.5 + 0.5 * (Math.sin(t * 9) > 0 ? 1 : 0);
    ctx.beginPath(); ctx.arc(-220, 0, 36, 0, 6.283); ctx.fill();
    ctx.globalAlpha = o;
    F.text3D(ctx, 'AO VIVO', 50, 6, { size: 120, fam: 'Anton', weight: 400, depth: 0, strokeW: 0 });
    ctx.restore();
    F.kText(ctx, 'MUITA EMOÇÃO', W / 2, 680, lt3 - 0.9, { anim: 'pop', size: 110, gradient: ['#FFD1E8', '#FF4FA3', '#C4006A'], depth: 9, out: out - 0.9 });
    F.kText(ctx, 'NAS TRANSMISSÕES AO VIVO', W / 2, 820, lt3 - 1.6, { anim: 'up', size: 56, fill: '#fff', depth: 4, out: out - 1.6 });
  }
  // acompanhe nossas lives · fique atento
  const lt4 = t - n(18.3);
  if (lt4 > -0.1) {
    F.kText(ctx, 'ACOMPANHE NOSSAS LIVES', W / 2, 520, lt4, { anim: 'track', size: 100, fill: '#fff', depth: 8, din: 0.6, out: n(20.4) - n(18.3) });
    const lb = t - n(20.5);
    if (lb > 0) {
      const p = easeOutBack(clamp(lb / 0.45), 2.2);
      const rot = Math.sin(lb * 16) * 0.35 * Math.exp(-lb * 1.6);
      ctx.save();
      ctx.translate(W / 2, 430);
      ctx.scale(p, p);
      ctx.shadowColor = '#FFC83D'; ctx.shadowBlur = 50;
      F.ICON.bell(ctx, 0, 0, 260, '#FFC83D', { rot });
      ctx.restore();
      F.ring(ctx, W / 2, 430, lb, { color: '#FFC83D', r: 500, width: 14 });
      F.ring(ctx, W / 2, 430, lb - 0.3, { color: '#FFC83D', r: 600, width: 10 });
      F.kText(ctx, 'FIQUE ATENTO', W / 2, 690, lb - 0.2, { anim: 'pop', size: 120, gradient: ['#FFF6CF', '#FFC83D', '#C77700'], depth: 9 });
      F.kText(ctx, 'ÀS NOVIDADES QUE ESTÃO CHEGANDO!', W / 2, 830, lb - 0.7, { anim: 'up', size: 56, fill: '#fff', depth: 4 });
      F.sparkles(ctx, t, 21, { n: 30, color: '#FFE9A8', alpha: clamp(lb) });
    }
  }
}

// ------------------------------------------------------------------ 9) JANEIRO
export function janeiro(ctx, t, E) {
  const n = (x) => at('N3', x);
  F.gradientBg(ctx, '#0c2a5a', '#02040c', W / 2, H * 0.4);
  F.rays(ctx, W / 2, -100, t, { alpha: 0.07, colors: ['#8fd3ff', '#ffffff'], n: 14, speed: 0.04 });
  F.bokeh(ctx, t, 91, { colors: ['#33D4F1', '#518FFE', '#ffffff', '#FFC83D'], alpha: 0.22, n: 22 });
  monthTitle(ctx, t, n(-1.3), n(1.3), 'JANEIRO', '2027', 'CRONOGRAMA  •  PARTE 2', '#0a2a6a');
  monthChip(ctx, t, n(1.45), 'JAN 2027', '#1677D6');
  F.kText(ctx, 'UM MÊS MUITO', W / 2, 390, t - n(1.45), { anim: 'up', size: 110, fill: '#fff', depth: 8, out: n(4.5) - n(1.45) });
  F.kText(ctx, 'IMPORTANTE', W / 2, 580, t - n(1.75), { anim: 'slam', size: 170, fam: 'Anton', weight: 400, gradient: ['#E6F6FF', '#8FD3FF', '#2E86FF'], stroke: '#020814', strokeW: 12, depth: 14, depthColor: '#0a2a6a', out: n(4.5) - n(1.75), sweepAt: 0.7 });
  F.kText(ctx, 'PARA A NOSSA HISTÓRIA', W / 2, 770, t - n(3.0), { anim: 'up', size: 62, gradient: ['#FFF1B8', '#FFC83D', '#E08A00'], depth: 5, out: n(4.5) - n(3.0) });
  // RVA Lives continua
  const pl = clamp((t - n(4.6)) / 0.9);
  const fade = 1 - prog(t, n(10.2), n(10.5));
  const up = easeInOutCubic(prog(t, n(8.6), n(9.1)));
  if (pl > 0 && fade > 0) {
    ctx.save();
    ctx.globalAlpha = fade;
    livesLogo(ctx, t, W / 2 + 60, lerp(430, 250, up), lerp(0.9, 0.6, up), pl, { sweep: clamp((t - n(5.4)) / 0.7) });
    ctx.restore();
  } else S.arcs.group.visible = false;
  if (t > n(6.2) && t < n(10.5)) {
    const o = 1 - prog(t, n(10.2), n(10.5));
    ctx.save(); ctx.globalAlpha = o;
    F.stamp(ctx, [{ t: 'CONTINUA!', size: 90 }], W / 2 + 40, lerp(720, 500, up), t - n(6.2), { color: '#2FD14A', rot: -0.08, scale: lerp(1, 0.8, up) });
    ctx.restore();
  }
  if (t > n(9.0) && t < n(10.5)) {
    const q = t - n(9.07);
    F.kText(ctx, 'PIGGY NO ROBLOX', W / 2, 700, q, { anim: 'slam', size: 120, fam: 'Bungee', weight: 400, gradient: ['#FFD3E6', '#FF6FA8', '#D61F6E'], stroke: '#2b0616', strokeW: 12, depth: 12, depthColor: '#5a0a2e', out: n(10.2) - n(9.07) });
    const r = rng(23);
    for (let i = 0; i < 10; i++) {
      const x = 200 + r() * 1520, y = 830 + r() * 90;
      ctx.globalAlpha = clamp(q * 3) * (1 - prog(t, n(10.2), n(10.5)));
      isoCube(ctx, x, y + Math.sin(t * 2 + i) * 12, 50 + r() * 40, ['#FF6FA8', '#FFC83D', '#33D4F1', '#7BFC2D'][i % 4], 0);
    }
    ctx.globalAlpha = 1;
  }
  // novas transmissões · momentos com a comunidade
  const lt = t - n(10.45);
  if (lt > -0.1) {
    const o = 1 - prog(t, n(14.9), n(15.2));
    ctx.save();
    ctx.globalAlpha = o;
    // rede de avatares (comunidade)
    const r = rng(41);
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.283 + 0.2, d = 300 + r() * 140;
      pts.push([W / 2 + Math.cos(a + t * 0.08) * d * 2.0, 540 + Math.sin(a + t * 0.08) * d * 0.78, i]);
    }
    const pc = clamp((lt - 2.0) / 1.2);
    ctx.strokeStyle = 'rgba(140,200,255,0.35)';
    ctx.lineWidth = 3;
    pts.forEach(([x, y], i) => {
      const [x2, y2] = pts[(i + 3) % pts.length];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, x2, pc), lerp(y, y2, pc)); ctx.stroke();
    });
    pts.forEach(([x, y, i]) => {
      const q = clamp((lt - 2.0 - i * 0.05) / 0.35);
      if (q <= 0) return;
      const s = easeOutBack(q, 2) * 38;
      ctx.fillStyle = ['#F2471A', '#1677D6', '#2FA21E', '#B06BFF', '#FF6FA8', '#FFC83D'][i % 6];
      ctx.beginPath(); ctx.arc(x, y, s, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(x, y - s * 0.22, s * 0.32, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y + s * 0.5, s * 0.55, s * 0.35, 0, Math.PI, 0); ctx.fill();
    });
    ctx.restore();
    F.kText(ctx, 'NOVAS TRANSMISSÕES', W / 2, 470, lt, { anim: 'pop', size: 104, fill: '#fff', depth: 8, out: n(14.9) - n(10.45) });
    F.kText(ctx, 'MOMENTOS COM A', W / 2, 610, lt - 1.9, { anim: 'up', size: 70, fill: '#cfe8ff', depth: 5, out: n(14.9) - n(10.45) - 1.9 });
    F.kText(ctx, 'COMUNIDADE', W / 2, 720, lt - 2.1, { anim: 'slam', size: 130, fam: 'Anton', weight: 400, gradient: ['#FFF1B8', '#FFC83D', '#E08A00'], stroke: '#140b00', strokeW: 10, depth: 10, depthColor: '#4a2a00', out: n(14.9) - n(10.45) - 2.1 });
  }
}

// ------------------------------------------------------------------ 10) "Enquanto isso..." · a surpresa · 2 lançamentos secretos
export function segredo(ctx, t, E) {
  const n = (x) => at('N3', x);
  ctx.fillStyle = '#030308';
  ctx.fillRect(0, 0, W, H);
  const lightOn = n(17.0);
  const L = clamp((t - lightOn) / 0.25);
  // cone de luz
  if (L > 0) {
    const flick = t - lightOn < 0.3 ? (Math.sin((t - lightOn) * 90) > 0 ? 1 : 0.3) : 1;
    ctx.save();
    ctx.globalAlpha = L * flick;
    const cx = W / 2;
    const g = ctx.createLinearGradient(0, -100, 0, H);
    g.addColorStop(0, 'rgba(200,210,255,0.35)');
    g.addColorStop(1, 'rgba(200,210,255,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - 90, -50); ctx.lineTo(cx + 90, -50); ctx.lineTo(cx + 620, H); ctx.lineTo(cx - 620, H); ctx.closePath(); ctx.fill();
    const fg = ctx.createRadialGradient(cx, 900, 0, cx, 900, 700);
    fg.addColorStop(0, 'rgba(150,160,255,0.35)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, 400, W, H);
    ctx.restore();
  }
  // poeira no ar
  const r = rng(61);
  ctx.save();
  ctx.fillStyle = '#cfd6ff';
  for (let i = 0; i < 60; i++) {
    const x = W / 2 + (r() - 0.5) * 900, y = (r() * H + t * (10 + r() * 20)) % H, s = 1 + r() * 2.5;
    ctx.globalAlpha = 0.5 * L * r();
    ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 20, y, s, 0, 6.283); ctx.fill();
  }
  ctx.restore();
  // "ENQUANTO ISSO..."
  F.kText(ctx, 'ENQUANTO ISSO...', W / 2, H / 2, t - n(15.4), { anim: 'type', size: 110, fill: '#9dffb8', glow: '#2fff7a', out: n(16.85) - n(15.4), cps: 14 });
  // caixas
  const two = n(23.37);
  const sl = easeInOutCubic(prog(t, two, two + 0.5));
  if (t > lightOn) {
    const b1 = S.box1, b2 = S.box2;
    const rise = easeOutCubic(clamp((t - lightOn - 0.15) / 0.9));
    b1.group.visible = true;
    b1.group.position.set(lerp(0, -2.3, sl), lerp(-3.5, 0.45, rise), 0);
    b1.group.scale.setScalar(2.2);
    b1.group.rotation.set(0.15, t * 0.5, 0);
    const d = clamp((t - two - 0.15) / 0.45);
    b2.group.visible = d > 0;
    b2.group.position.set(2.3, lerp(7, 0.45, easeInCubic(d)) + (d >= 1 ? Math.max(0, Math.sin((t - two - 0.6) * 18) * 0.1 * Math.exp(-(t - two - 0.6) * 6)) : 0), 0);
    b2.group.scale.setScalar(2.2);
    b2.group.rotation.set(0.15, -t * 0.5 + 1, 0);
    [b1, b2].forEach((b, i) => (b.mat.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 4 + i * 2)));
    S.spot.target.position.set(0, 0, 0);
    // halo roxo atrás
    const hg = ctx.createRadialGradient(W / 2, 470, 0, W / 2, 470, 700);
    hg.addColorStop(0, `rgba(150,90,255,${0.35 * rise})`);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);
    T.draw3D(ctx, S.boxScene, S.cam);
  }
  F.kText(ctx, 'UMA SURPRESA', W / 2, 850, t - n(19.4), { anim: 'pop', size: 110, fill: '#fff', depth: 8, out: two - n(19.4) - 0.2 });
  F.kText(ctx, 'MUITO AGUARDADA', W / 2, 975, t - n(20.6), { anim: 'up', size: 74, gradient: ['#E9D9FF', '#B06BFF', '#6A1FD6'], depth: 6, out: two - n(20.6) - 0.2 });
  if (t > two) {
    const lt = t - two;
    F.flash(ctx, t, two + 0.6, 0.3, 0.4, '200,160,255');
    F.kText(ctx, 'LANÇAMENTO SECRETO #1', W / 2 - 394, 850, lt - 0.8, { anim: 'up', size: 42, fill: '#fff', depth: 4 });
    F.kText(ctx, 'LANÇAMENTO SECRETO #2', W / 2 + 394, 850, lt - 1.1, { anim: 'up', size: 42, fill: '#fff', depth: 4 });
    F.kText(ctx, 'PARA O GRANDE ANIVERSÁRIO', W / 2, 975, t - n(26.2), { anim: 'track', size: 66, gradient: ['#FFF1B8', '#FFC83D', '#E08A00'], depth: 5, din: 0.6 });
    if (lt > 1.8) F.stamp(ctx, [{ t: 'ULTRASSECRETO', size: 84 }], W / 2, 170, lt - 1.8, { rot: -0.06, color: '#FF2A3D' });
  }
}

// ------------------------------------------------------------------ 11) TEASER: 30 DE JANEIRO · LANÇAMENTO SECRETO
export function teaser(ctx, t, E) {
  const t0 = at('N3', 29.6);
  const lt = t - t0;
  const landing = 3.15; // dia 30 acende
  const boom = 3.55;
  ctx.fillStyle = '#04030a';
  ctx.fillRect(0, 0, W, H);
  if (lt < boom) {
    // calendário de janeiro 2027 correndo até o dia 30
    const zoom = easeInExpo2(prog(lt, landing + 0.05, boom));
    const cell = 112, gx = W / 2 - cell * 3.5, gy = 190;
    const c30 = { x: gx + 6 * cell + cell / 2, y: gy + 40 + 4 * cell + cell / 2 }; // 30/01/2027 cai num sábado
    ctx.save();
    ctx.translate(c30.x, c30.y);
    ctx.scale(1 + zoom * 9, 1 + zoom * 9);
    ctx.translate(-c30.x, -c30.y);
    F.gradientBg(ctx, '#151033', '#04030a', W / 2, H / 2);
    F.text3D(ctx, 'JANEIRO 2027', W / 2, 105, { size: 80, fam: 'Anton', weight: 400, fill: '#fff', depth: 6, sweep: (lt % 2) / 2 });
    const dias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    ctx.font = F.font(30, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    dias.forEach((d, i) => { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText(d, gx + i * cell + cell / 2, gy + 10); });
    // ritmo acelerando: dia k acende em tempo k^0.7
    const prog30 = clamp(lt / landing);
    const lit = Math.floor(Math.pow(prog30, 0.62) * 30 + 1e-6);
    for (let d = 1; d <= 31; d++) {
      const idx = d + 4; // 1º de janeiro de 2027 é sexta-feira
      const col = idx % 7, row = Math.floor(idx / 7);
      const x = gx + col * cell, y = gy + 40 + row * cell;
      const on = d <= lit;
      const isCur = d === lit;
      const is30 = d === 30;
      ctx.fillStyle = is30 && lit >= 30 ? '#FFC83D' : isCur ? '#ffffff' : on ? 'rgba(130,90,255,0.55)' : 'rgba(255,255,255,0.08)';
      if (is30 && lit >= 30) { ctx.shadowColor = '#FFC83D'; ctx.shadowBlur = 50; }
      F.roundRect(ctx, x + 8, y + 8, cell - 16, cell - 16, 16);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = (isCur && !is30) || (is30 && lit >= 30) ? '#120a00' : '#fff';
      ctx.font = F.font(44, 900);
      ctx.fillText(String(d), x + cell / 2, y + cell / 2 + 2);
    }
    ctx.restore();
    if (lt > landing) F.flash(ctx, t, t0 + landing, 0.25, 0.4, '255,200,80');
  } else {
    const q = lt - boom;
    F.gradientBg(ctx, '#3a2200', '#050200', W / 2, H * 0.42);
    F.rays(ctx, W / 2, H * 0.42, t, { alpha: 0.18, colors: ['#FFD36B', '#FF9A1F', '#ffffff'], n: 24, speed: 0.15 });
    F.streaks(ctx, t, 101, { n: 26, alpha: 0.45, colors: F.RAINBOW });
    F.flash(ctx, t, t0 + boom, 0.8, 1);
    F.ring(ctx, W / 2, 400, q, { color: '#FFE08A', r: 1300, width: 34, dur: 0.8 });
    F.burst(ctx, W / 2, 400, q, { colors: ['#FFE08A', '#ffffff', '#FF9A1F'], n: 30, r0: 420, len: 800, width: 14, dur: 0.7 });
    F.kText(ctx, '30 DE JANEIRO', W / 2, 360, q, { anim: 'slam', size: 230, fam: 'Anton', weight: 400, chrome: true, stroke: '#140a00', strokeW: 18, depth: 20, depthColor: '#4a2a00', sweepAt: 1.0, glow: '#FFB000', glowSize: 0.2, out: 4.45 });
    F.kText(ctx, '2027', W / 2, 545, q - 0.4, { anim: 'pop', size: 110, gradient: ['#FFF6CF', '#FFC83D', '#C77700'], depth: 9, out: 4.05 });
    // tarja preta que revela "LANÇAMENTO SECRETO"
    const rv = easeInOutCubic(prog(q, 0.9, 1.6));
    if (q > 0.7 && q < 4.75) {
      const o = 1 - prog(q, 4.45, 4.75);
      ctx.save();
      ctx.globalAlpha = o;
      const bw = 1240, bx = W / 2 - bw / 2, by = 640;
      ctx.fillStyle = '#E3122B';
      ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 40;
      ctx.fillRect(bx, by, bw, 150);
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.rect(bx, by, bw * rv, 150); ctx.clip();
      F.ICON.lock(ctx, bx + 90, by + 70, 110, '#FFC83D');
      F.text3D(ctx, 'LANÇAMENTO SECRETO', W / 2 + 60, by + 80, { size: 96, fam: 'Anton', weight: 400, fill: '#fff', stroke: '#5a0010', strokeW: 10, depth: 6, depthColor: '#5a0010' });
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = o;
      ctx.fillStyle = '#000';
      ctx.fillRect(bx + bw * rv, by, bw * (1 - rv), 150);
      ctx.restore();
    }
    F.kText(ctx, '4 ANOS DA REDE VANGUARDA ARQUIVOS', W / 2, 890, q - 1.9, { anim: 'up', size: 56, fill: '#fff', depth: 4, out: 2.55 });
    F.sparkles(ctx, t, 31, { n: 50, color: '#FFE9A8', alpha: clamp(q) * (1 - prog(q, 4.4, 4.8)) });
    // "AGUARDE." no final
    if (q > 4.75) {
      ctx.fillStyle = `rgba(0,0,0,${clamp((q - 4.75) / 0.15)})`;
      ctx.fillRect(0, 0, W, H);
      F.kText(ctx, '> CONTEÚDO CONFIDENCIAL. AGUARDE.', W / 2, H / 2, q - 4.95, { anim: 'type', size: 72, fill: '#FFC83D', glow: '#ff9a00', cps: 22 });
    }
  }
}
function easeInExpo2(x) { return x === 0 ? 0 : Math.pow(2, 10 * x - 10); }
