// Cenas da Narração 1: vinheta, abertura, RVA 4 anos, "especial", período, o que vem, título e visão geral.
import { W, H, clamp, lerp, prog, easeOutBack, easeOutCubic, easeInCubic, easeInOutCubic, easeOutExpo, rng, inOut } from './util.js';
import * as F from './fx.js';
import * as T from './three3d.js';
import { drawRVA25D } from './logos.js';
import { at, lockup, livesText, arcs2D, calendarPage, toWorld, PX_PER_UNIT } from './common.js';

const { THREE } = T;
let S = {};

export function buildA(E) {
  // disco do 4 (cena rva4)
  S.disk = T.buildDisk();
  S.diskScene = T.newScene();
  T.lights(S.diskScene, { key: 2.6, rim: 2.2 });
  S.diskScene.add(S.disk.group);
  S.cam = T.camera(35);
  S.cam.position.set(0, 0, 10);
  // calendários (cena período)
  S.calScene = T.newScene();
  T.lights(S.calScene, { key: 2.4, rim: 1.2, amb: 0.5 });
  S.calDez = T.buildCard(3.0, 3.4, (c, w, h) => calendarPage(c, w, h, { month: 'DEZEMBRO', year: '2026', color: '#D3122B' }));
  S.calJan = T.buildCard(3.0, 3.4, (c, w, h) => calendarPage(c, w, h, { month: 'JANEIRO', year: '2027', color: '#1677D6' }));
  S.calScene.add(S.calDez.mesh, S.calJan.mesh);
  // caixas secretas (cena novidades)
  S.boxScene = T.newScene();
  T.lights(S.boxScene, { key: 1.6, rim: 3.0, rimColor: '#ff3a6a', amb: 0.15 });
  S.box1 = T.buildSecretBox('?', 'SECRETO');
  S.box2 = T.buildSecretBox('?', 'SECRETO');
  S.boxScene.add(S.box1.group, S.box2.group);
}

// ------------------------------------------------------------------ 0) vinheta enviada (RVA 4 anos)
export async function vinheta(ctx, t, E) {
  const img = await E.frame('vinheta', t);
  ctx.drawImage(img, 0, 0, W, H);
}

// ------------------------------------------------------------------ 1) abertura
export function abertura(ctx, t, E) {
  const n = (x) => at('N1', x);
  // fundo: roxo profundo, bokeh e o "VAN GUAR DA" gigante girando
  const drop = n(6.65);
  const hot = clamp((t - drop) / 0.4);
  F.gradientBg(ctx, hot > 0 ? '#3a0a3f' : '#1c0f3d', '#05030c', W / 2, H / 2);
  if (hot > 0) {
    ctx.globalAlpha = hot;
    F.gradientBg(ctx, '#7a0a55', '#0c0215', W / 2, H * 0.55);
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.translate(W * 0.72, H * 0.5);
  ctx.rotate(-0.25 + t * 0.03);
  const em = E.img.empilhado;
  ctx.drawImage(em, -520, -520, 1040, 1040 * (em.height / em.width));
  ctx.restore();
  F.bokeh(ctx, t, 11, { alpha: 0.22 + hot * 0.12, n: 22 });
  F.rays(ctx, W / 2, H / 2, t, { alpha: 0.05 + hot * 0.07, colors: hot > 0 ? F.RAINBOW : ['#ffffff'] });

  // "UMA HISTÓRIA / CONSTRUÍDA COM DEDICAÇÃO"
  const o1 = n(3.3) - n(0);
  F.kText(ctx, 'UMA HISTÓRIA', W / 2, 440, t - n(0.0), { anim: 'track', size: 130, out: o1, din: 0.9, sweepAt: 1.6 });
  F.kText(ctx, 'CONSTRUÍDA COM DEDICAÇÃO', W / 2, 590, t - n(0.95), { anim: 'up', size: 78, gradient: ['#FFF1B8', '#FFC83D', '#E08A00'], out: o1 - 0.95, depth: 6 });
  if (t > n(0.1) && t < n(3.6)) {
    // linha que se desenha por baixo
    const p = easeInOutCubic(prog(t, n(0.3), n(1.6)));
    ctx.save();
    ctx.globalAlpha = 1 - prog(t, n(3.2), n(3.55));
    const g = ctx.createLinearGradient(W / 2 - 520, 0, W / 2 + 520, 0);
    F.RAINBOW.forEach((c, i) => g.addColorStop(i / 9, c));
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - 520 * p, 680, 1040 * p, 8);
    ctx.restore();
  }
  // NOSTALGIA · CRIATIVIDADE · MUITA PAIXÃO PELA TELEVISÃO
  const words = [
    { s: 'NOSTALGIA', t0: n(3.52), t1: n(4.95), g: ['#E7D2FF', '#A66BFF', '#5A12D6'], icon: 'tape', c: '#A66BFF' },
    { s: 'CRIATIVIDADE', t0: n(4.98), t1: n(6.1), g: ['#FFF3A8', '#FFB31A', '#FF5A00'], icon: 'pencil', c: '#FFB31A' },
  ];
  words.forEach((w, i) => {
    const lt = t - w.t0;
    if (lt < -0.1 || t > w.t1 + 0.35) return;
    F.flash(ctx, t, w.t0, 0.3, 0.35, i ? '255,170,40' : '160,90,255');
    F.ring(ctx, W / 2, H / 2, lt, { color: w.c, r: 900, width: 20 });
    F.kText(ctx, w.s, W / 2, H / 2, lt, { anim: 'slam', size: 210, gradient: w.g, out: w.t1 - w.t0, depth: 14, glow: w.c, glowSize: 0.25 });
    F.streaks(ctx, t, 5 + i, { alpha: 0.25 * inOut(t, w.t0, w.t1, 0.1, 0.2), colors: [w.c, '#ffffff'] });
  });
  // "MUITA PAIXÃO" no drop + "PELA TELEVISÃO"
  if (t > drop - 0.1) {
    const lt = t - drop;
    F.flash(ctx, t, drop, 0.5, 0.8);
    F.confetti(ctx, lt, 77, { x: W / 2, y: H + 40, power: 1900, n: 160 });
    F.burst(ctx, W / 2, 400, lt, { colors: F.RAINBOW, n: 20, r0: 220, len: 600, width: 14 });
    F.ring(ctx, W / 2, 400, lt, { color: '#ff4fa3', r: 1100, width: 26 });
    // corações subindo
    const r = rng(5);
    for (let i = 0; i < 18; i++) {
      const x = r() * W, sp = 120 + r() * 200, ph = r() * 3, s = 30 + r() * 50;
      const y = H + 80 - ((lt + ph) * sp) % (H + 200);
      ctx.globalAlpha = 0.55 * clamp(lt * 2);
      F.ICON.heart(ctx, x + Math.sin(lt * 2 + i) * 30, y, s, i % 2 ? '#ff2d6f' : '#ff7ab8');
    }
    ctx.globalAlpha = 1;
    F.kText(ctx, 'MUITA PAIXÃO', W / 2, 400, lt, { anim: 'slam', size: 190, gradient: ['#FFD1E8', '#FF4FA3', '#C4006A'], depth: 14, glow: '#ff4fa3', glowSize: 0.3, sweepAt: 0.6 });
    const tv = n(9.25) - drop;
    F.kText(ctx, 'PELA', W / 2 - 480, 650, lt - 1.25, { anim: 'pop', size: 96, fill: '#fff' });
    F.kText(ctx, 'TELEVISÃO', W / 2 + 120, 650, lt - 1.35, { anim: 'chars', size: 130, colors: F.RAINBOW, depth: 10, stagger: 0.04 });
    // TV retrô desenhada (ícone)
    if (lt > 1.35) {
      const p = easeOutBack(clamp((lt - 1.35) / 0.4), 2);
      ctx.save();
      ctx.translate(W / 2, 860);
      ctx.scale(p, p);
      ctx.fillStyle = '#1b1d27';
      F.roundRect(ctx, -120, -70, 240, 150, 26); ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
      const gg = ctx.createLinearGradient(-90, -50, 90, 50);
      F.RAINBOW.forEach((c, i) => gg.addColorStop(i / 9, c));
      ctx.fillStyle = gg;
      F.roundRect(ctx, -92, -48, 150, 104, 16); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(92, -20, 9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(92, 16, 9, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-40, -70); ctx.lineTo(-80, -120); ctx.moveTo(40, -70); ctx.lineTo(80, -120); ctx.stroke();
      ctx.restore();
    }
    void tv;
  }
}

// ------------------------------------------------------------------ 2) Rede Vanguarda Arquivos · 4 anos de história
export function rva4(ctx, t, E) {
  const n = (x) => at('N1', x);
  F.gradientBg(ctx, '#1a2248', '#03040b', W / 2, H * 0.45);
  F.bokeh(ctx, t, 21, { alpha: 0.18, n: 20 });
  const t0 = n(9.42);
  const lt = t - t0;
  // fase 1: logo 2D se monta
  const move = easeInOutCubic(prog(t, n(11.9), n(13.0)));
  const diskIn = prog(t, n(11.9), n(13.6));
  const toSide = easeInOutCubic(prog(t, n(14.0), n(14.8)));
  F.rays(ctx, lerp(W / 2, 600, toSide), lerp(H * 0.44, H / 2, toSide), t, { alpha: 0.06 + 0.1 * diskIn, colors: F.RAINBOW, n: 20 });
  if (diskIn > 0) {
    const d = S.disk;
    T.assembleDisk(d, easeOutCubic(diskIn), 2);
    const sc = lerp(2.0, 2.15, toSide);
    d.group.scale.setScalar(sc);
    d.group.position.set(lerp(0, -2.1, toSide), lerp(0.25, 0, toSide), 0);
    d.group.rotation.set(Math.sin(t * 0.9) * 0.08, lerp(-0.35, 0.28, toSide) + Math.sin(t * 0.6) * 0.1, 0);
    d.logo.visible = t > n(13.0);
    d.logo.scale.setScalar(t > n(13.0) ? easeOutBack(prog(t, n(13.0), n(13.35)), 2) : 1);
    T.draw3D(ctx, S.diskScene, S.cam);
  }
  if (t < n(13.15)) {
    const st = clamp(lt / 1.0) * 10;
    const w = lerp(900, 560, move);
    const y = lerp(440, 520, move);
    ctx.save();
    ctx.globalAlpha = 1 - prog(t, n(12.9), n(13.15));
    drawRVA25D(ctx, W / 2, y, w, { stripes: st, r: clamp(lt / 0.5), a: clamp((lt - 0.15) / 0.5), depth: 18, outline: 10, gap: 16, letterShade: true });
    ctx.restore();
  }
  // "REDE VANGUARDA ARQUIVOS"
  if (t < n(14.3)) {
    ctx.save();
    ctx.globalAlpha = 1 - prog(t, n(11.7), n(12.1));
    lockup(ctx, E, W / 2, 820, 74, { p: clamp((t - n(9.9)) / 0.6), chrome: true });
    ctx.restore();
  }
  // "ESTÁ SE PREPARANDO PARA COMEMORAR"
  F.kText(ctx, 'SE PREPARANDO PARA COMEMORAR...', W / 2, 960, t - n(10.3), { anim: 'type', size: 54, fill: '#bfe6ff', out: n(12.75) - n(10.3), cps: 22 });
  // "4 ANOS / DE HISTÓRIA"
  if (t > n(14.15)) {
    const l2 = t - n(14.2);
    F.kText(ctx, '4 ANOS', 1310, 430, l2, { anim: 'slam', size: 250, fam: 'Anton', weight: 400, chrome: true, stroke: '#0b0f1e', strokeW: 18, depth: 18, depthColor: '#2a3550', sweepAt: 0.8 });
    F.kText(ctx, 'DE HISTÓRIA', 1310, 660, l2 - 0.45, { anim: 'up', size: 96, gradient: ['#FFF1B8', '#FFC83D', '#E08A00'], depth: 8 });
    F.ring(ctx, 1310, 430, l2, { color: '#cfe0ff', r: 700, width: 18 });
    F.sparkles(ctx, t, 8, { n: 30, alpha: 0.7 * clamp(l2) });
  }
}

// ------------------------------------------------------------------ 3) "E essa comemoração será especial!"
export function especial(ctx, t, E) {
  const n = (x) => at('N1', x);
  F.gradientBg(ctx, '#4a2400', '#0d0500', W / 2, H * 0.55);
  const hit = n(18.45);
  const k = clamp((t - hit) / 0.3);
  F.rays(ctx, W / 2, H * 0.55, t, { alpha: 0.06 + 0.16 * k, colors: ['#FFD36B', '#FFB000'], n: 22, speed: 0.12 });
  F.bokeh(ctx, t, 31, { colors: ['#FFC83D', '#FF9A1F', '#FFF1B8'], alpha: 0.2, n: 18 });
  F.kText(ctx, 'E ESSA COMEMORAÇÃO', W / 2, 270, t - n(16.72), { anim: 'track', size: 92, din: 0.7, fill: '#fff' });
  if (t > hit - 0.05) {
    const lt = t - hit;
    F.flash(ctx, t, hit, 0.4, 0.7, '255,220,150');
    F.confetti(ctx, lt, 91, { x: W * 0.2, y: H + 30, power: 1700, spread: 1.4, n: 110, colors: ['#FFC83D', '#ffffff', '#FF9A1F', '#FFE9A8', '#FD007D'] });
    F.confetti(ctx, lt, 92, { x: W * 0.8, y: H + 30, power: 1700, spread: 1.4, n: 110, colors: ['#FFC83D', '#ffffff', '#FF9A1F', '#FFE9A8', '#33D4F1'] });
    F.burst(ctx, W / 2, 600, lt, { color: '#FFE08A', n: 24, r0: 300, len: 520, width: 10, glow: true });
    F.kText(ctx, 'SERÁ', W / 2, 420, lt, { anim: 'pop', size: 80, fill: '#fff' });
    F.kText(ctx, 'ESPECIAL!', W / 2, 640, lt - 0.12, { anim: 'slam', size: 250, fam: 'Anton', weight: 400, gradient: ['#FFF6CF', '#FFC83D', '#C77700'], stroke: '#2a1400', strokeW: 16, depth: 16, depthColor: '#5a3000', glow: '#FFB000', glowSize: 0.3, sweepAt: 0.7 });
    F.sparkles(ctx, t, 12, { n: 50, color: '#FFE9A8', alpha: clamp(lt) });
  }
}

// ------------------------------------------------------------------ 4) "Entre dezembro de 2026 e janeiro de 2027"
export function periodo(ctx, t, E) {
  const n = (x) => at('N1', x);
  F.gradientBg(ctx, '#12204a', '#02030a', W / 2, H * 0.4);
  F.gridFloor(ctx, t, { horizon: H * 0.66, color: 'rgba(90,140,255,0.55)', floor: 'rgba(10,30,90,0.6)', glow: 'rgba(90,150,255,0.35)' });
  F.bokeh(ctx, t, 41, { alpha: 0.15, n: 14, colors: ['#D3122B', '#1677D6', '#ffffff'] });
  F.kText(ctx, 'ENTRE', W / 2, 120, t - n(20.55), { anim: 'pop', size: 70, fill: '#fff', depth: 6 });
  const fl = (t0) => clamp((t - t0) / 0.7);
  const pd = fl(n(20.9)), pj = fl(n(23.6));
  const bob = (ph) => Math.sin(t * 1.6 + ph) * 0.06;
  const place = (card, p, x, ph) => {
    card.mesh.visible = p > 0;
    card.mesh.position.set(x, 0.15 + bob(ph) + (1 - easeOutCubic(p)) * -1.5, (1 - easeOutCubic(p)) * 3);
    card.mesh.rotation.set(-0.08, (1 - easeOutBack(p, 1.6)) * Math.PI * 0.9 + (x < 0 ? 0.22 : -0.22), (x < 0 ? 0.04 : -0.04));
  };
  place(S.calDez, pd, -2.4, 0);
  place(S.calJan, pj, 2.4, 1.3);
  // brilho atrás dos cartões
  [[pd, -2.4, '#ff2a40'], [pj, 2.4, '#2a8cff']].forEach(([p, x, c]) => {
    if (p <= 0) return;
    const px = W / 2 + x * PX_PER_UNIT;
    const g = ctx.createRadialGradient(px, H / 2, 0, px, H / 2, 420);
    g.addColorStop(0, c + '88');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - 420, H / 2 - 420, 840, 840);
  });
  T.draw3D(ctx, S.calScene, S.cam);
  // seta ligando os meses
  const pa = easeInOutCubic(prog(t, n(22.6), n(23.5)));
  if (pa > 0) {
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 26]);
    ctx.lineDashOffset = -t * 60;
    const x0 = 790, x1 = 1130;
    ctx.beginPath(); ctx.moveTo(x0, 520); ctx.lineTo(lerp(x0, x1, pa), 520); ctx.stroke();
    ctx.setLineDash([]);
    if (pa > 0.95) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x1 + 30, 520); ctx.lineTo(x1 - 6, 494); ctx.lineTo(x1 - 6, 546); ctx.fill();
    }
    ctx.restore();
  }
  F.kText(ctx, 'DEZEMBRO · 2026', 520, 930, t - n(21.4), { anim: 'up', size: 50, fill: '#ffb3bd', depth: 4 });
  F.kText(ctx, 'JANEIRO · 2027', 1400, 930, t - n(24.2), { anim: 'up', size: 50, fill: '#b5d8ff', depth: 4 });
}

// ------------------------------------------------------------------ 5) eventos · transmissões · novidades -> 2 lançamentos secretos
export function novidades(ctx, t, E) {
  const n = (x) => at('N1', x);
  const secret = n(31.62);
  const dark = clamp((t - secret) / 0.35);
  F.gradientBg(ctx, '#2a1458', '#06030f', W / 2, H * 0.45);
  if (dark > 0) {
    ctx.fillStyle = `rgba(0,0,0,${dark * 0.85})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = dark;
    F.gradientBg(ctx, 'rgba(120,0,30,0.55)', 'rgba(0,0,0,0)', W / 2, H * 0.5, W * 0.6);
    ctx.globalAlpha = 1;
  }
  F.bokeh(ctx, t, 51, { alpha: 0.16 * (1 - dark), n: 18 });
  // três cartões
  const items = [
    { s: 'EVENTOS', t0: n(26.5), x: 420, icon: 'party', c: '#FF5301' },
    { s: 'TRANSMISSÕES', s2: 'ESPECIAIS', t0: n(28.15), x: 960, icon: 'live', c: '#FF1744' },
    { s: 'NOVIDADES', t0: n(30.35), x: 1500, icon: 'star', c: '#FEE912' },
  ];
  F.kText(ctx, 'TEREMOS:', W / 2, 150, t - n(26.3), { anim: 'track', size: 72, fill: '#fff', out: secret - n(26.3) - 0.2 });
  items.forEach((it, i) => {
    const lt = t - it.t0;
    if (lt < 0) return;
    const p = easeOutBack(clamp(lt / 0.45), 1.8);
    const outP = easeInCubic(clamp((t - secret + 0.1 - i * 0.05) / 0.35));
    if (outP >= 1) return;
    ctx.save();
    ctx.translate(it.x, 540 - outP * 900 + Math.sin(t * 2 + i) * 6);
    ctx.rotate((1 - p) * 0.3 + outP * (i - 1) * 0.4);
    ctx.scale(p, p);
    F.card(ctx, -230, -200, 460, 400, { border: [it.c, '#ffffff', it.c] });
    const pulse = 1 + 0.06 * Math.sin(t * 6 + i);
    ctx.save(); ctx.translate(0, -70); ctx.scale(pulse, pulse);
    F.ICON[it.icon](ctx, 0, 0, 150, it.c);
    ctx.restore();
    F.text3D(ctx, it.s, 0, it.s2 ? 85 : 110, { size: it.s2 ? 50 : 62, depth: 4 });
    if (it.s2) F.text3D(ctx, it.s2, 0, 145, { size: 50, depth: 4, fill: it.c });
    ctx.restore();
    F.ring(ctx, it.x, 540, lt, { color: it.c, r: 380, width: 12 });
  });
  // dois lançamentos secretos
  if (t > secret - 0.05) {
    const lt = t - secret;
    const drop = (lt0) => {
      const p = clamp((lt - lt0) / 0.42);
      return { y: lerp(6, 0, easeInCubic(p)) + (p >= 1 ? Math.max(0, Math.sin((lt - lt0 - 0.42) * 18) * 0.12 * Math.exp(-(lt - lt0 - 0.42) * 6)) : 0), p };
    };
    const a = drop(0.0), b = drop(0.3);
    const B = [[S.box1, -2.2, a], [S.box2, 2.2, b]];
    B.forEach(([bx, x, d], i) => {
      bx.group.visible = d.p > 0;
      bx.group.position.set(x, 0.55 + d.y, 0);
      bx.group.scale.setScalar(2.0);
      bx.group.rotation.set(0.12, (i ? -1 : 1) * (0.35 + Math.sin(t * 0.8 + i) * 0.12), 0);
      bx.mat.emissiveIntensity = 0.45 + 0.25 * Math.sin(t * 5 + i * 2);
    });
    // brilho vazando por trás
    const gl = clamp(lt / 0.8);
    [[-2.2, a], [2.2, b]].forEach(([x, d]) => {
      if (d.p < 1) return;
      const px = W / 2 + x * PX_PER_UNIT;
      const g = ctx.createRadialGradient(px, 440, 0, px, 440, 520);
      g.addColorStop(0, `rgba(176,107,255,${0.55 * gl})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - 520, -80, 1040, 1040);
    });
    T.draw3D(ctx, S.boxScene, S.cam);
    F.kText(ctx, '2 LANÇAMENTOS', W / 2, 790, lt - 0.75, { anim: 'slam', size: 120, fill: '#fff', depth: 10 });
    F.kText(ctx, 'SECRETOS', W / 2, 920, lt - 1.0, { anim: 'slam', size: 120, gradient: ['#FF8FA3', '#FF1744', '#9A0018'], depth: 10, glow: '#ff1744', glowSize: 0.3 });
    if (lt > 1.9) F.stamp(ctx, [{ t: 'CONFIDENCIAL', size: 64 }], 1440, 190, lt - 1.9, { rot: 0.16, color: '#FF2A3D' });
    F.kText(ctx, 'QUE PROMETEM MARCAR ESSA TRAJETÓRIA', W / 2, 1010, t - n(35.1), { anim: 'up', size: 40, fill: '#ffd0d8', depth: 0, strokeW: 6 });
  }
}

// ------------------------------------------------------------------ 6) "Prepare-se... CRONOGRAMA ESPECIAL"
export function titulo(ctx, t, E) {
  const n = (x) => at('N1', x);
  const hit = n(41.15);
  const k = clamp((t - hit) / 0.25);
  ctx.fillStyle = '#05040d';
  ctx.fillRect(0, 0, W, H);
  if (k > 0) {
    F.rainbowStripes(ctx, t, { alpha: 0.9, speed: 160, band: 70 });
    ctx.fillStyle = 'rgba(5,4,16,0.72)';
    ctx.fillRect(0, 0, W, H);
    F.gradientBg(ctx, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', W / 2, H / 2);
  }
  F.streaks(ctx, t, 61, { alpha: 0.35 + 0.3 * k, n: 30, colors: F.RAINBOW });
  F.kText(ctx, 'PREPARE-SE', W / 2, 420, t - n(38.5), { anim: 'track', size: 150, fill: '#fff', din: 0.7, out: hit - n(38.5) - 0.25, depth: 10 });
  F.kText(ctx, 'PARA ACOMPANHAR O NOSSO', W / 2, 590, t - n(39.5), { anim: 'up', size: 62, fill: '#bcd2ff', out: hit - n(39.5) - 0.25, depth: 4 });
  if (t > hit - 0.05) {
    const lt = t - hit;
    F.flash(ctx, t, hit, 0.5, 0.9);
    F.ring(ctx, W / 2, 470, lt, { color: '#fff', r: 1200, width: 30 });
    F.burst(ctx, W / 2, 470, lt, { colors: F.RAINBOW, n: 28, r0: 380, len: 700, width: 12 });
    F.kText(ctx, 'CRONOGRAMA', W / 2, 450, lt, { anim: 'slam', size: 270, fam: 'Anton', weight: 400, chrome: true, stroke: '#05040d', strokeW: 18, depth: 20, depthColor: '#262c44', sweepAt: 0.9, tracking: 6 });
    // faixa "ESPECIAL"
    const pb = easeOutBack(clamp((lt - 0.3) / 0.4), 1.6);
    if (pb > 0) {
      ctx.save();
      ctx.translate(W / 2, 660);
      ctx.rotate(-0.03);
      ctx.scale(pb, 1);
      const g = ctx.createLinearGradient(-430, 0, 430, 0);
      g.addColorStop(0, '#FF9A00'); g.addColorStop(0.5, '#FFD84D'); g.addColorStop(1, '#FF9A00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-470, -62); ctx.lineTo(470, -62); ctx.lineTo(440, 62); ctx.lineTo(-440, 62); ctx.closePath(); ctx.fill();
      ctx.restore();
      F.kText(ctx, 'ESPECIAL', W / 2, 662, lt - 0.42, { anim: 'pop', size: 104, fill: '#1b0f00', stroke: '#1b0f00', strokeW: 0, depth: 0, shine: false, rot: -0.03 });
    }
    F.kText(ctx, '4 ANOS DA RVA  •  DEZ 2026 – JAN 2027', W / 2, 820, lt - 0.85, { anim: 'up', size: 48, fill: '#fff', depth: 4 });
    F.sparkles(ctx, t, 13, { n: 40, alpha: clamp(lt) });
  }
}

// ------------------------------------------------------------------ 7) visão geral do cronograma (sem narração)
export function visao(ctx, t, E) {
  const t0 = at('N1', 43.5);
  const lt = t - t0;
  F.gradientBg(ctx, '#151a40', '#03040c', W / 2, H * 0.4);
  F.gridFloor(ctx, t, { horizon: H * 0.7, color: 'rgba(140,110,255,0.45)', speed: 0.4 });
  F.bokeh(ctx, t, 71, { alpha: 0.14, n: 16 });
  // câmera percorre a linha do tempo
  const nodes = [
    { x: 520, t0: 0.45, mes: 'DEZEMBRO 2026', l1: 'RVA LIVES', l2: 'EVENTOS DE PIGGY', l3: 'NO ROBLOX', c: '#E3122B', icon: 'live' },
    { x: 1560, t0: 2.4, mes: 'JANEIRO 2027', l1: 'AS LIVES CONTINUAM', l2: 'PREPARAÇÃO DOS', l3: 'LANÇAMENTOS', c: '#1677D6', icon: 'calendar' },
    { x: 2600, t0: 4.3, mes: '30 DE JANEIRO', l1: 'LANÇAMENTO SECRETO', l2: '4 ANOS DA RVA', l3: '', c: '#FFC83D', icon: 'lock', big: true },
  ];
  const cam = lerp(0, 1080, easeInOutCubic(prog(lt, 1.6, 2.5))) + lerp(0, 1040, easeInOutCubic(prog(lt, 3.5, 4.4)));
  const ox = W / 2 - 520 - cam + 0;
  F.kText(ctx, 'CRONOGRAMA', 300, 90, lt, { anim: 'wipe', size: 54, fam: 'Anton', weight: 400, chrome: true, depth: 4, align: 'left' });
  // pontinhos de interrogação ao redor do segredo
  if (lt > 4.6) {
    const r = rng(9);
    for (let i = 0; i < 10; i++) {
      const a = r() * 6.283, d = 520 + r() * 220;
      const x = ox + 2600 + Math.cos(a + t * 0.3) * d, yy = 300 + Math.sin(a + t * 0.3) * d * 0.5;
      ctx.globalAlpha = 0.5 * clamp(lt - 4.6);
      F.text3D(ctx, '?', x, yy, { size: 50 + r() * 40, fill: '#FFC83D', depth: 3 });
    }
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(ox + 520 - 520, 0);
  // linha principal
  const pl = easeInOutCubic(prog(lt, 0.0, 4.6));
  const y = 560;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(3400, y); ctx.stroke();
  const g = ctx.createLinearGradient(0, 0, 2700, 0);
  F.RAINBOW.forEach((c, i) => g.addColorStop(i / 9, c));
  ctx.strokeStyle = g;
  ctx.shadowColor = '#b06bff';
  ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(lerp(-400, 2600, pl), y); ctx.stroke();
  ctx.shadowBlur = 0;
  nodes.forEach((nd, i) => {
    const q = lt - nd.t0;
    if (q < 0) return;
    const p = easeOutBack(clamp(q / 0.45), 2);
    const big = nd.big ? 1.25 : 1;
    ctx.save();
    ctx.translate(nd.x, y);
    // nó
    ctx.fillStyle = nd.c;
    ctx.shadowColor = nd.c;
    ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(0, 0, 26 * p * big, 0, 6.283); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 11 * p * big, 0, 6.283); ctx.fill();
    F.ring(ctx, 0, 0, q, { color: nd.c, r: 200, width: 10 });
    // cartão acima
    ctx.save();
    ctx.translate(0, -250);
    ctx.scale(p * big, p * big);
    F.card(ctx, -350, -150, 700, 300, { border: [nd.c, '#ffffff', nd.c], top: nd.big ? 'rgba(60,40,8,0.95)' : undefined, bottom: nd.big ? 'rgba(20,12,0,0.95)' : undefined });
    F.ICON[nd.icon](ctx, -258, -50, 110, nd.c);
    if (i === 0) arcs2D(ctx, -258, 75, 58, 0);
    const L = { align: 'left', depth: 3 };
    F.text3D(ctx, nd.mes, -170, -82, { ...L, size: nd.big ? 50 : 46, fill: nd.c, depth: 4, chrome: nd.big });
    F.text3D(ctx, nd.l1, -170, -16, { ...L, size: nd.big ? 36 : 34 });
    F.text3D(ctx, nd.l2, -170, 40, { ...L, size: 30, depth: 2, fill: '#d8dcf0' });
    if (nd.l3) F.text3D(ctx, nd.l3, -170, 86, { ...L, size: 30, depth: 2, fill: '#d8dcf0' });
    ctx.restore();
    ctx.restore();
    if (nd.big && q > 0) {
      F.flare(ctx, nd.x, y, 0.6 * clamp(q * 2) * (0.85 + 0.15 * Math.sin(t * 7)), { size: 1.1, color: 'rgba(255,200,80,0.8)' });
      F.burst(ctx, nd.x, y - 250, q, { color: '#FFE08A', n: 18, r0: 330, len: 300, width: 8 });
    }
  });
  ctx.restore();
}
