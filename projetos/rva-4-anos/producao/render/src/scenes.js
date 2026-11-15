// As 11 cenas do Shorts "RVA 4 Anos". Cada cena desenha o quadro do tempo t (segundos absolutos).
import * as F from './fx.js';
import { AMARELO, ARCO_IRIS, CORES_AGENDA } from './fx.js';
import { W, H, clamp, lerp, prog, easeOutBack, easeOutCubic, easeInOutCubic, easeInCubic, smooth, shake, wobble, canvas } from './util.js';
import { drawRVA25D, ARCOS, ANEL } from './logos.js';
import * as T from './three3d.js';
const { THREE } = T;

const S = {};
const lazy = (k, fn) => (S[k] ??= fn());

// cores por trecho: hl('DOS 20 ANOS!', '20 ANOS', '#FFC83A')
export function hl(str, word, color, base = '#fff') {
  const i = str.indexOf(word);
  return [...str].map((c, k) => (i >= 0 && k >= i && k < i + word.length ? color : base));
}

// ------------------------------------------------------------------ conjuntos 3D (criados uma vez)
function diskSet() {
  return lazy('disk', () => {
    const scene = T.newScene();
    const cam = T.camera(30);
    cam.position.set(0, 0, 9.2);
    const disk = T.buildDisk();
    const arcs = T.buildArcs();
    scene.add(disk.group, arcs.group);
    const L = T.lightsBasic(scene, { key: 1.6, rim: 2.2, amb: 0.2 });
    return { scene, cam, disk, arcs, L };
  });
}
function tvSet() {
  return lazy('tv', () => {
    const scene = T.newScene();
    const cam = T.camera(32);
    const tv = T.buildTV();
    tv.group.position.y = -0.18;
    scene.add(tv.group);
    T.lightsBasic(scene, { key: 2.4, rim: 2.5, rimColor: '#4fc3ff' });
    return { scene, cam, tv };
  });
}
function corridorSet() {
  return lazy('corr', () => {
    const scene = T.newScene();
    scene.environment = null;
    scene.fog = new THREE.Fog('#03050b', 4, 26);
    const cam = T.camera(55);
    const c = T.buildCorridor();
    scene.add(c.group, new THREE.AmbientLight('#8090ff', 0.9));
    return { scene, cam, c };
  });
}
function cardsSet() {
  return lazy('cards', () => {
    const scene = T.newScene();
    const cam = T.camera(35);
    cam.position.set(0, 0, 4.6);
    const cards = [0, 1, 2].map(() => T.buildCard(1.5, 0.844));
    cards.forEach((c) => scene.add(c.group));
    T.lightsBasic(scene, { key: 2, rim: 1.2 });
    return { scene, cam, cards };
  });
}
function dvdSet() {
  return lazy('dvd', () => {
    const scene = T.newScene();
    const cam = T.camera(35);
    const dvd = T.buildDVD();
    scene.add(dvd.group);
    const cards = [0, 1, 2, 3].map(() => T.buildCard(1.25, 0.94));
    cards.forEach((c) => scene.add(c.group));
    T.lightsBasic(scene, { key: 2.2, rim: 2.0, rimColor: '#ff9ef5' });
    return { scene, cam, dvd, cards };
  });
}
function claySet() {
  return lazy('clay', () => {
    const scene = T.newScene();
    scene.background = null;
    const cam = T.camera(35);
    const g = T.buildClayText();
    scene.add(g);
    T.lightsBasic(scene, { key: 2.6, rim: 1.4, rimColor: '#ffd9a8' });
    return { scene, cam, g };
  });
}
function arcsTransitionSet() {
  return lazy('arcsT', () => {
    const scene = T.newScene();
    const cam = T.camera(35);
    cam.position.set(0, 0, 6);
    const arcs = T.buildArcs();
    scene.add(arcs.group);
    T.lightsBasic(scene, { key: 2.2, rim: 1.6 });
    return { scene, cam, arcs };
  });
}

// ------------------------------------------------------------------ cartões voando (raridades / memória)
async function flyCards(ctx, t, E, list) {
  // list: [{clip, at, lt0}] — cada cartão entra pela direita e sai pela esquerda quando o próximo entra
  const { scene, cam, cards } = cardsSet();
  let any = false;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], it = list[i];
    if (!it || t < it.at - 0.05) { c.group.visible = false; continue; }
    const next = list[i + 1];
    const pin = easeOutCubic(prog(t, it.at, it.at + 0.38));
    const pout = next ? easeInCubic(prog(t, next.at - 0.05, next.at + 0.3)) : easeInCubic(prog(t, it.end ?? 1e9, (it.end ?? 1e9) + 0.3));
    if (pout >= 1) { c.group.visible = false; continue; }
    c.group.visible = true;
    any = true;
    const img = await E.frame(it.clip, t - it.at + (it.lt0 ?? 0), { loop: true });
    T.setTex(c.tex, img, c.aspect);
    c.group.position.set(lerp(3.2, 0, pin) + lerp(0, -3.4, pout), wobble(t, 0.4, 0.03), lerp(-1.2, 0, pin) + lerp(0, -0.8, pout));
    c.group.rotation.set(0.04, lerp(-1.1, 0.18, pin) + lerp(0, 0.9, pout) + wobble(t, 0.3, 0.05), lerp(0.05, 0, pin));
    const sc = 1 + (t - it.at) * 0.03;
    c.group.scale.setScalar(sc);
  }
  if (any) T.draw3D(ctx, scene, cam);
}

function bgDark(ctx, t, inner, outer, rayColors, alpha = 0.1) {
  F.gradientBg(ctx, inner, outer);
  if (rayColors) F.rays(ctx, W / 2, H * 0.48, t, { colors: rayColors, alpha, n: 20 });
}

// ================================================================== CENA 1 — GANCHO (0 – 3.8)
async function gancho(ctx, t, E) {
  const still = await E.frame('c02', 6.0);
  const out = prog(t, 2.55, 2.95);
  if (t < 2.95) {
    F.blurredBg(ctx, still, 0.4);
    const sc = lerp(1, 0.15, easeInCubic(out)) * (1 + t * 0.02);
    F.videoFrame(ctx, still, W / 2, 940 + wobble(t, 0.5, 5), 980, 551, { rot: lerp(-0.025, -0.6, easeInCubic(out)), scale: sc, alpha: 1 - out });
    if (Math.floor(t * 2) % 2 === 0 || t < 0.5) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(66, 228, 14, 46); ctx.fillRect(90, 228, 14, 46);
      F.osd(ctx, 'PAUSE', 120, 252, { size: 70 });
    }
    F.tracking(ctx, t, 0.5 + out);
  }
  if (t >= 2.55) {
    const a = prog(t, 2.55, 2.95);
    ctx.save();
    ctx.globalAlpha = a;
    bgDark(ctx, t, '#1a1440', '#020208', ARCO_IRIS, 0.12);
    ctx.restore();
    const { scene, cam, disk, arcs } = diskSet();
    arcs.group.visible = false;
    disk.logo.visible = false;
    disk.pieces.forEach((p) => p.mesh.position.set(p.cx, p.cy, 0));
    const p = prog(t, 2.6, 3.15);
    disk.group.position.set(0, 0.2, lerp(-6, 0, easeOutCubic(p)));
    disk.group.rotation.set(0.1, lerp(Math.PI / 2, 0, easeOutBack(p, 1.6)) - (t - 3.15) * 0.06, 0);
    disk.group.scale.setScalar(1);
    cam.position.set(0, 0, 9.2);
    scene.environmentRotation.y = t * 0.8;
    if (p > 0) T.draw3D(ctx, scene, cam);
    F.flash(ctx, t, 3.0, 0.35, 0.7);
  }
  F.title(ctx, t, { at: 0.25, out: 2.6, y: 300, lines: [
    { t: 'PROCUREI ESSA VINHETA', size: 66 },
    { t: 'POR ANOS...', size: 140, colors: CORES_AGENDA },
  ] });
  F.title(ctx, t, { at: 2.0, out: 3.62, y: 1330, lines: [
    { t: '...E ACHEI DENTRO', size: 70 },
    { t: 'DA VANGUARDA!', size: 104, fill: AMARELO },
  ] });
  F.title(ctx, t, { at: 3.0, out: 3.62, y: 330, lines: [{ t: 'A HISTÓRIA DE 4 ANOS', size: 70 }] });
  if (t > 3.7) F.glitch(ctx, t, 1);
}

// ================================================================== CENA 2 — 2023 (3.8 – 8.5)
async function c2023(ctx, t, E) {
  bgDark(ctx, t, '#0b2f4a', '#01060c', ['#33D4F1', '#518FFE'], 0.1);
  const RVA_T = 7.05;
  if (t < RVA_T) {
    const { scene, cam, tv } = tvSet();
    let img;
    if (t < 4.55) img = await E.frame('c01a', t - 3.85);
    else if (t < 5.25) img = await E.frame('c01c', t - 4.55);
    else if (t < 5.85) img = await E.frame('c01d', t - 5.25);
    else if (t < 6.35) img = await E.frame('c01b', t - 5.85);
    else img = await E.frame('c11v', t - 6.35);
    T.setTex(tv.tex, img, 1.36 / 1.02);
    tv.screen.scale.y = lerp(0.02, 1, easeOutCubic(prog(t, 3.85, 4.15)));
    const dive = easeInCubic(prog(t, 6.45, RVA_T));
    const push = easeInOutCubic(prog(t, 3.8, 6.45));
    cam.position.set(lerp(lerp(0.75, 0.35, push), -0.2, dive), lerp(0.25, -0.18, dive), lerp(lerp(7.6, 6.7, push), 0.75, dive));
    cam.lookAt(lerp(0, -0.2, dive), lerp(0.05, -0.18, dive), 0);
    tv.group.rotation.y = lerp(-0.12, 0, dive) + wobble(t, 0.2, 0.02);
    T.draw3D(ctx, scene, cam);
    if (t < 6.4) {
      ctx.fillStyle = '#fff';
      F.osd(ctx, 'PLAY', 960, 200, { size: 64, align: 'right' });
      F.iconPlay(ctx, 1000, 200, 44, '#fff');
    }
  } else {
    // nasce o logo
    const lt = t - RVA_T;
    F.sparkles(ctx, t, 11, { n: 30, alpha: 0.5 });
    const glow = ctx.createRadialGradient(W / 2, 930, 0, W / 2, 930, 600);
    glow.addColorStop(0, 'rgba(120,180,255,0.35)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    const sc = 1 + lt * 0.03;
    drawRVA25D(ctx, W / 2, 930, 900 * sc, { stripes: (lt - 0.12) / 0.6 * 10, r: prog(t, RVA_T, RVA_T + 0.32), a: prog(t, RVA_T + 0.08, RVA_T + 0.4), depth: 16 });
    F.title(ctx, t, { at: 7.75, y: 1290, lines: [{ t: 'REDE VANGUARDA ARQUIVOS', size: 50, tracking: 3, fill: '#dfe9ff' }] });
  }
  F.flash(ctx, t, RVA_T, 0.4, 1);
  F.title(ctx, t, { at: 4.2, out: 6.55, y: 260, lines: [{ t: '30/01/2023', size: 128, fill: AMARELO }] });
  F.title(ctx, t, { at: 4.6, out: 6.55, y: 430, lines: [{ t: '1º VÍDEO DO CANAL', size: 64 }] });
  if (t > 4.9 && t < 6.6) F.pill(ctx, 'Intervalo da Vanguarda de 2007', W / 2, 545, { size: 38, alpha: prog(t, 4.9, 5.1), color: '#fff' });
  F.title(ctx, t, { at: 6.75, out: 8.35, y: 260, lines: [{ t: 'PRIMEIRO VÍDEO', size: 96 }, { t: 'DO CANAL', size: 96, fill: AMARELO }] });
  if (t < 3.92) F.glitch(ctx, t, 1);
}

// ================================================================== CENA 3 — 20 ANOS (8.5 – 13.0)
async function vinte(ctx, t, E) {
  bgDark(ctx, t, '#5a3a00', '#0a0600', ['#FFC83A', '#FFE7A0'], 0.16);
  F.sparkles(ctx, t, 20, { n: 50, color: '#FFD86B', alpha: 0.7 });
  const z = 1 + (t - 8.5) * 0.012;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const p1 = prog(t, 8.95, 9.4);
  if (p1 > 0) F.polaroid(ctx, E.img.vinte, 500, lerp(-700, 905, easeOutBack(p1, 1.3)), 700, {
    rot: lerp(-0.5, -0.06, easeOutCubic(p1)), caption: '20 anos da Vanguarda!', ox: 0.03,
  });
  const p2 = prog(t, 10.4, 10.85);
  if (p2 > 0) F.polaroid(ctx, null, lerp(1500, 790, easeOutBack(p2, 1.2)), 1205, 420, {
    rot: lerp(0.6, 0.1, easeOutCubic(p2)), caption: 'Praça Santa Terezinha', placeholder: 'SUA FOTO DA FESTA',
  });
  ctx.restore();
  const pp = prog(t, 9.6, 9.95);
  if (pp > 0) F.pill(ctx, 'PRAÇA SANTA TEREZINHA · TAUBATÉ', W / 2, 1490, { size: 36, scale: easeOutBack(pp, 2), alpha: pp, icon: F.iconPin, iconColor: '#FF3B3B' });
  F.title(ctx, t, { at: 8.8, out: 11.62, y: 250, lines: [{ t: 'FUI NA FESTA', size: 96 }, { t: 'DOS 20 ANOS!', size: 104, colors: hl('DOS 20 ANOS!', '20 ANOS', '#FFC83A') }] });
  F.title(ctx, t, { at: 11.77, y: 250, lines: [{ t: '...E PEDI', size: 96 }, { t: 'UMA VINHETA', size: 110, colors: hl('UMA VINHETA', 'UMA', AMARELO) }] });
  F.osd(ctx, '2023', 1010, 200, { size: 64, align: 'right', color: '#FFE08A' });
}

// ================================================================== CENA 4 — A BUSCA (13.0 – 20.0)
async function busca(ctx, t, E) {
  ctx.fillStyle = '#03050b';
  ctx.fillRect(0, 0, W, H);
  const { scene, cam, c } = corridorSet();
  const walk = easeInOutCubic(prog(t, 13.0, 19.3)), rush = easeInCubic(prog(t, 19.2, 20.0));
  cam.position.set(wobble(t, 0.23, 0.12), 0.05 + wobble(t, 0.9, 0.03), lerp(4.5, -6, walk) + lerp(0, -9, rush));
  cam.rotation.set(0, wobble(t, 0.17, 0.04), wobble(t, 0.11, 0.02));
  c.noiseTex.forEach((tx, i) => tx.offset.set(((t * 37 + i * 0.3) % 1), ((t * 53 + i * 0.7) % 1)));
  c.glow.scale.setScalar(lerp(0.6, 2.6, rush) + walk * 0.4);
  c.glow.material.opacity = 0.35 + walk * 0.4 + rush * 0.6;
  T.draw3D(ctx, scene, cam);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 0, W, H);
  // carimbo da data
  const lt = t - 13.35;
  if (lt > 0 && t < 14.6) {
    ctx.save();
    const [sx, sy] = shake(t, 13.5, 0.3, 14);
    ctx.translate(sx, sy);
    F.stamp(ctx, [{ t: '3 DE SETEMBRO', size: 92 }, { t: '2023', size: 120 }], W / 2, 900, lt, { alpha: 1 - prog(t, 14.3, 14.6), rot: -0.1 });
    ctx.restore();
  }
  // espaço reservado para a foto da visita
  const pv = prog(t, 14.7, 15.1), pvo = prog(t, 16.5, 16.8);
  if (pv > 0 && pvo < 1) F.polaroid(ctx, null, W / 2 + 40, lerp(2300, 1060, easeOutBack(pv, 1.2)) + easeInCubic(pvo) * 1300, 520, {
    rot: 0.06, caption: 'Vanguarda · São José dos Campos', placeholder: 'SUA FOTO DA VISITA',
  });
  F.title(ctx, t, { at: 14.4, out: 16.7, y: 250, lines: [
    { t: 'VISITEI A VANGUARDA', size: 66 }, { t: 'EM SÃO JOSÉ', size: 96 }, { t: 'PELA 1ª VEZ', size: 96, fill: AMARELO },
  ] });
  F.title(ctx, t, { at: 16.8, out: 18.1, y: 300, lines: [{ t: 'NINGUÉM ACHAVA...', size: 88 }] });
  if (t > 16.8 && t < 18.12) {
    const notFound = (t > 16.9 && t < 17.4) || (t > 17.5 && t < 18.12);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    F.roundRect(ctx, 140, 880, 800, 170, 20);
    ctx.fill();
    ctx.strokeStyle = notFound ? '#ff3344' : '#7fd1ff';
    ctx.lineWidth = 4;
    ctx.stroke();
    F.osd(ctx, notFound ? 'NÃO ENCONTRADO' : 'PROCURANDO...', W / 2, 965, { size: 92, align: 'center', color: notFound ? '#ff3344' : '#bfe8ff' });
    ctx.restore();
  }
  F.title(ctx, t, { at: 18.19, out: 19.95, y: 260, lines: [
    { t: 'ATÉ QUE, NO SETOR', size: 78 }, { t: 'DE PROGRAMAÇÃO...', size: 76, colors: hl('DE PROGRAMAÇÃO...', 'PROGRAMAÇÃO', AMARELO) },
  ] });
  F.osd(ctx, '2023', 1010, 200, { size: 64, align: 'right', color: '#bfe8ff' });
  F.tracking(ctx, t, 0.35);
  const wf = prog(t, 19.55, 20.0);
  if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${wf * wf})`; ctx.fillRect(0, 0, W, H); }
}

// ================================================================== CENA 5 — ACHARAM! (20.0 – 27.6)
async function acharam(ctx, t, E) {
  const vt = Math.max(0, t - 20.75);
  const img = await E.frame('c02', vt);
  F.blurredBg(ctx, img, 0.5);
  F.sparkles(ctx, t, 5, { n: 40, alpha: 0.6 });
  const [sx, sy] = shake(t, 20.05, 0.45, 22);
  ctx.save();
  ctx.translate(sx, sy);
  const pin = easeOutBack(prog(t, 20.2, 20.6), 1.6);
  const glowC = CORES_AGENDA[Math.floor(t * 4) % CORES_AGENDA.length];
  F.videoFrame(ctx, img, W / 2, 1000, 1000, 562, { scale: lerp(0.4, 1, pin) * (1 + (t - 20.6) * 0.006), alpha: clamp(pin * 2), glow: glowC, border: 8 });
  if (t > 20.8) F.pill(ctx, 'AGENDA VANGUARDA · 2011–2019', W / 2, 700, { size: 34, bg: AMARELO, color: '#111', scale: easeOutBack(prog(t, 20.8, 21.1), 2) });
  F.letterConfetti(ctx, t - 20.05, 77, { y: 420 });
  F.title(ctx, t, { at: 20.05, y: 300, stagger: 0, lines: [{ t: 'ACHARAM!!', size: 140, colors: CORES_AGENDA, rot: wobble(t, 1.5, 0.03) }] });
  F.title(ctx, t, { at: 22.0, y: 1330, lines: [{ t: 'A VINHETA QUE MARCOU', size: 60 }, { t: 'MINHA INFÂNCIA', size: 92, fill: AMARELO }] });
  ctx.restore();
  F.flash(ctx, t, 20.0, 0.55, 1);
}

// ================================================================== CENA 6 — RARIDADES (27.6 – 34.0)
async function raridades(ctx, t, E) {
  bgDark(ctx, t, '#2c0f52', '#05020c', ['#9B4DFF', '#518FFE', '#FF2D8A'], 0.1);
  const splitOut = easeInCubic(prog(t, 32.05, 32.35));
  if (splitOut < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - splitOut;
    // em cima: recriação de memória (FlipaClip)
    const pt = easeOutCubic(prog(t, 27.8, 28.2));
    const top = await E.frame('c04', t - 27.85, { loop: true });
    F.videoFrame(ctx, top, lerp(-600, W / 2, pt), 670, 900, 506, { rot: -0.015, scale: 1 - splitOut * 0.3 });
    if (pt > 0.9) F.pill(ctx, 'DE MEMÓRIA · FLIPACLIP', 110, 415, { size: 34, align: 'left', bg: AMARELO, color: '#111' });
    // embaixo: o original (aparece em "depois vieram as originais")
    const pb = easeOutCubic(prog(t, 28.05, 28.45));
    const flip = prog(t, 30.85, 31.15);
    const sx = Math.abs(Math.cos(flip * Math.PI));
    const showOrig = flip >= 0.5;
    const bx = lerp(1700, W / 2, pb);
    if (showOrig) {
      const bot = await E.frame('c06', t - 31.0, { loop: true });
      ctx.save(); ctx.translate(bx, 1250); ctx.scale(sx, 1); ctx.translate(-bx, -1250);
      F.videoFrame(ctx, bot, bx, 1250, 900, 506, { rot: 0.015, scale: 1 - splitOut * 0.3, glow: '#3CD62E' });
      ctx.restore();
      if (t > 31.15) F.pill(ctx, 'O ORIGINAL', 110, 995, { size: 34, align: 'left', bg: '#3CD62E', color: '#111', scale: easeOutBack(prog(t, 31.15, 31.4), 2) });
    } else {
      ctx.save(); ctx.translate(bx, 1250); ctx.scale(sx, 1); ctx.translate(-bx, -1250);
      ctx.fillStyle = '#fff';
      F.roundRect(ctx, bx - 460, 1250 - 263, 920, 526, 26); ctx.fill();
      F.staticNoise(ctx, t, 1, bx - 450, 1250 - 253, 900, 506);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 450, 1200, 900, 100);
      F.osd(ctx, 'ORIGINAL: ???', bx, 1250, { size: 80, align: 'center' });
      ctx.restore();
    }
    ctx.restore();
  }
  F.title(ctx, t, { at: 27.9, out: 30.8, y: 235, lines: [{ t: 'EU RECRIAVA', size: 72 }, { t: 'DE MEMÓRIA', size: 72, fill: AMARELO }] });
  F.title(ctx, t, { at: 30.94, out: 32.1, y: 235, lines: [{ t: 'DEPOIS VIERAM', size: 72 }, { t: 'AS ORIGINAIS!', size: 72, fill: '#3CD62E' }] });
  // cartões das raridades
  if (t > 32.15) {
    await flyCards(ctx, t, E, [
      { clip: 'c07', at: 32.2, lt0: 0.3 },
      { clip: 'c08', at: 32.8, lt0: 0.2 },
      { clip: 'c06', at: 33.4, lt0: 1.2, end: 34.2 },
    ]);
    F.title(ctx, t, { at: 32.25, y: 300, lines: [{ t: 'RARIDADES!', size: 130, colors: ARCO_IRIS }] });
    const names = [['PREVISÃO', 32.2, '#33D4F1'], ['PLANTÃO', 32.8, '#FF3B3B'], ['VANGUARDA NEWS', 33.4, '#FF2D8A']];
    names.forEach(([n, at, c], i) => {
      const nx = names[i + 1] ? names[i + 1][1] : 99;
      F.title(ctx, t, { at, out: nx - 0.1, y: 1340, lines: [{ t: n, size: n.length > 10 ? 84 : 110, fill: c }, ...(i < 2 ? [{ t: 'VANGUARDA', size: 70 }] : [])] });
    });
  }
}

// ================================================================== CENA 7 — DVD 2004 + BLENDER (34.0 – 41.0)
async function dvd(ctx, t, E, semTitulos = false) {
  bgDark(ctx, t, '#101a46', '#010106', ARCO_IRIS, 0.09);
  const BL = 37.6;
  const dvdOut = easeInCubic(prog(t, BL, BL + 0.3));
  if (dvdOut < 1) {
    const { scene, cam, dvd: d, cards } = dvdSet();
    cam.position.set(Math.sin(t * 0.3) * 0.6, 0.35, 7.2);
    cam.lookAt(0, 0.35, 0);
    d.group.position.set(0, -0.2, 0);
    d.group.scale.setScalar(1 - dvdOut);
    const rise = easeOutBack(prog(t, 34.3, 35.2), 1.2);
    d.box.position.set(0, lerp(-3.5, -1.1, easeOutCubic(prog(t, 34.0, 34.4))), -0.3);
    d.box.rotation.set(-0.15, -0.35, 0.04);
    d.disc.position.set(0, lerp(-1.1, 0.62, rise), lerp(-0.3, 0.5, rise));
    d.disc.scale.setScalar(0.72);
    d.disc.rotation.set(lerp(-1.2, -0.32, rise) + wobble(t, 0.2, 0.08), 0.35 + wobble(t, 0.13, 0.2), t * 5);
    const clips = ['c09a', 'c09b', 'c09c', 'c09d'];
    for (let i = 0; i < 4; i++) {
      const c = cards[i], pa = easeOutBack(prog(t, 35.0 + i * 0.12, 35.4 + i * 0.12), 1.4);
      c.group.visible = pa > 0.01;
      if (!c.group.visible) continue;
      const img = await E.frame(clips[i], t - 35.0, { loop: true });
      T.setTex(c.tex, img, c.aspect);
      const ang = (i / 4) * Math.PI * 2 + (t - 35) * 0.9;
      c.group.position.set(Math.sin(ang) * 1.25, 0.55 + Math.cos(ang * 2) * 0.1 + (i % 2 ? 0.5 : -0.5), Math.cos(ang) * 1.5 - 0.1);
      c.group.rotation.set(0, Math.sin(ang) * 0.35, 0);
      c.group.scale.setScalar(pa * (1 - dvdOut) * 0.62);
    }
    scene.environmentRotation.y = t * 0.6;
    T.draw3D(ctx, scene, cam);
  }
  F.title(ctx, t, { at: 34.3, out: 37.5, y: 240, stagger: 0.7, lines: [{ t: 'O DVD RARÍSSIMO', size: 86 }, { t: 'VINHETAS DE 2004', size: 80, fill: AMARELO }] });
  // prévia "Blender": viewport com texto em argila (troque pelo seu clipe)
  if (t >= BL) {
    const pin = easeOutBack(prog(t, BL, BL + 0.45), 1.3);
    const vw = 960, vh = 720, vx = W / 2 - vw / 2, vy = 980 - vh / 2;
    ctx.save();
    ctx.translate(W / 2, 980); ctx.scale(pin, pin); ctx.translate(-W / 2, -980);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#26272b';
    F.roundRect(ctx, vx - 8, vy - 56, vw + 16, vh + 64, 18); ctx.fill();
    ctx.shadowColor = 'transparent';
    const vg = ctx.createLinearGradient(0, vy, 0, vy + vh);
    vg.addColorStop(0, '#45474e'); vg.addColorStop(1, '#2c2d32');
    ctx.fillStyle = vg; ctx.fillRect(vx, vy, vw, vh);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(vx + 26 + i * 30, vy - 26, 9, 0, 6.283); ctx.fill(); });
    ctx.fillStyle = '#9aa0ad'; ctx.font = F.font(26, 700); ctx.fillText('viewport 3D', vx + 120, vy - 18);
    // cena 3D recortada dentro do viewport
    const { scene, cam, g } = claySet();
    cam.position.set(Math.sin((t - BL) * 0.5) * 1.8, 1.0, 8.2);
    cam.lookAt(0, -0.05, 0);
    g.rotation.y = -0.35 + (t - BL) * 0.18;
    T.renderer.render(scene, cam);
    ctx.save();
    ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    ctx.drawImage(T.renderer.domElement, 0, 960 - 405, W, 810, vx, vy, vw, vh);
    ctx.restore();
    // eixos
    const ax = vx + vw - 70, ay = vy + 70;
    [['#ff4d4d', 40, 10], ['#5ad15a', -8, -42], ['#4d8dff', -30, 22]].forEach(([c, dx, dy]) => {
      ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + dx, ay + dy); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ax + dx, ay + dy, 9, 0, 6.283); ctx.fill();
    });
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(vx, vy + vh - 56, vw, 56);
    ctx.fillStyle = AMARELO; ctx.font = F.font(26, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('PRÉVIA · AQUI ENTRA O SEU CLIPE DO BLENDER', vx + 22, vy + vh - 28);
    ctx.restore();
    if (!semTitulos) F.title(ctx, t, { at: 37.72, y: 240, lines: [{ t: 'RECRIEI TUDO', size: 96 }, { t: 'NO BLENDER', size: 110, fill: '#FF8A00' }] });
    const pb = prog(t, 39.15, 39.5);
    if (pb > 0) F.pill(ctx, 'ESPECIAL 2 ANOS', W / 2, 1450, { size: 58, bg: AMARELO, color: '#111', scale: easeOutBack(pb, 2.2) });
  }
}

// ================================================================== CENA 8 — STRIKE (41.0 – 44.2)
let _freeze = null;
async function strike(ctx, t, E) {
  if (!_freeze) {
    _freeze = canvas(W, H);
    const fctx = _freeze.getContext('2d');
    fctx.fillStyle = '#000'; fctx.fillRect(0, 0, W, H);
    await dvd(fctx, 40.95, E, true);
  }
  const [sx, sy] = shake(t, 41.35, 0.5, 26);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.filter = 'grayscale(0.75) contrast(1.2)';
  ctx.drawImage(_freeze, 0, 0);
  ctx.filter = 'none';
  ctx.fillStyle = `rgba(200,0,25,${0.22 + 0.1 * Math.sin(t * 20)})`;
  ctx.fillRect(0, 0, W, H);
  F.glitch(ctx, t, 0.5 + 0.5 * Math.abs(Math.sin(t * 7)));
  F.stamp(ctx, [{ t: 'STRIKE', size: 170 }], W / 2, 980, t - 41.35, { rot: -0.08, icon: F.iconWarning, color: '#FF1F3D', bg: 'rgba(20,0,4,0.75)' });
  ctx.restore();
  F.title(ctx, t, { at: 41.15, y: 240, lines: [{ t: 'UM HATER', size: 110 }, { t: 'ME DEU STRIKE', size: 96, fill: '#FF3B3B' }] });
  F.title(ctx, t, { at: 42.68, y: 1290, lines: [{ t: 'ACHANDO QUE O', size: 64 }, { t: 'VÍDEO ERA DELE', size: 84 }] });
  if (t > 44.1) F.glitch(ctx, t, 1);
}

// ================================================================== CENA 9 — MEMÓRIA VANGUARDA (44.2 – 51.0)
async function memoria(ctx, t, E) {
  F.gradientBg(ctx, '#0a3a78', '#01060f');
  // arcos concêntricos ao fundo (estilo telejornal)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const r = ((t * 120 + i * 160) % 1100) + 60;
    ctx.strokeStyle = `rgba(80,190,255,${0.16 * (1 - r / 1160)})`;
    ctx.lineWidth = 26;
    ctx.beginPath(); ctx.arc(W / 2, 1150, r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
  ctx.restore();
  // cartão do Link Vanguarda
  if (t < 46.8) {
    const out = easeInCubic(prog(t, 46.4, 46.75));
    const { scene, cam, cards } = cardsSet();
    cards[1].group.visible = cards[2].group.visible = false;
    const c = cards[0];
    c.group.visible = true;
    const img = await E.frame('c10link', t - 44.25, { loop: true });
    T.setTex(c.tex, img, c.aspect);
    const pin = easeOutBack(prog(t, 44.25, 44.7), 1.4);
    c.group.position.set(lerp(0, -3.6, out), 0.05, lerp(-3, 0, pin));
    c.group.rotation.set(0.05, lerp(0.8, -0.12, easeOutCubic(prog(t, 44.25, 44.7))) + wobble(t, 0.3, 0.06) - out, 0);
    c.group.scale.setScalar(1);
    T.draw3D(ctx, scene, cam);
    const pb = prog(t, 44.6, 44.9);
    if (pb > 0) F.pill(ctx, 'MEMÓRIA VANGUARDA', W / 2, 1350, { size: 54, bg: AMARELO, color: '#111', scale: easeOutBack(pb, 2) * (1 - out) });
    const pc = prog(t, 45.0, 45.3);
    if (pc > 0) F.pill(ctx, 'todo sábado no Link Vanguarda', W / 2, 1450, { size: 36, alpha: pc * (1 - out) });
  }
  F.title(ctx, t, { at: 44.5, out: 46.45, y: 250, lines: [{ t: 'A VANGUARDA LANÇOU', size: 70 }, { t: 'O MEMÓRIA VANGUARDA', size: 68, fill: AMARELO }] });
  // comentário + bloqueio
  if (t > 46.5 && t < 49.4) {
    const out = easeInCubic(prog(t, 48.95, 49.35));
    const [sx, sy] = shake(t, 48.36, 0.4, 20);
    ctx.save();
    ctx.translate(sx - out * 1200, sy);
    F.commentBubble(ctx, W / 2, 1000, 940, t - 46.5, { lines: ['Eles não têm o Cedoc!', 'Escuta que eu tô falando!'] });
    F.stamp(ctx, [{ t: 'BLOQUEADO', size: 92 }], W / 2, 1010, t - 48.36, { rot: -0.12, icon: F.iconBlock, color: '#FF1F3D', bg: 'rgba(15,0,3,0.6)' });
    ctx.restore();
  }
  F.title(ctx, t, { at: 46.6, out: 48.9, y: 300, lines: [{ t: 'DISSERAM:', size: 120 }] });
  // segue o arquivo
  if (t > 48.95) {
    await flyCards(ctx, t, E, [{ clip: 'c10jornal', at: 49.0, lt0: 0.5 }, { clip: 'c10bom', at: 49.8, lt0: 0.3, end: 51.2 }]);
    F.title(ctx, t, { at: 48.99, y: 240, lines: [{ t: 'E CONTINUEI', size: 100 }, { t: 'RESGATANDO TUDO!', size: 82, fill: AMARELO }] });
    const pc = prog(t, 49.6, 49.9);
    if (pc > 0) F.pill(ctx, 'COM CEDOC E TUDO', W / 2, 1400, { size: 52, bg: '#00C2F0', color: '#06121f', scale: easeOutBack(pc, 2.2) });
  }
}

// ================================================================== CENAS 10 e 11 — REVELAÇÃO e FINAL (51.0 – 63.0)
function lerpArc(a, b, k) {
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), rin: lerp(a.rin, b.rin, k), rout: lerp(a.rout, b.rout, k), a0: lerp(a.a0, b.a0, k), a1: lerp(a.a1, b.a1, k) };
}
async function revelaFinal(ctx, t, E) {
  bgDark(ctx, t, '#22114a', '#020208', ARCO_IRIS, 0.11);
  F.sparkles(ctx, t, 99, { n: 60, alpha: 0.6 });
  const { scene, cam, disk, arcs, L } = diskSet();
  cam.position.set(0, -0.05, 9.2);
  cam.lookAt(0, -0.05, 0);
  scene.environmentRotation.y = 0.4 + t * 0.25 + easeInOutCubic(prog(t, 54.2, 55.4)) * 2.2;
  // 3 arcos -> anel
  const morph = easeInOutCubic(prog(t, 51.6, 52.5));
  arcs.group.visible = t < 52.62;
  if (arcs.group.visible) {
    if (!S.lastMorph || Math.abs(S.lastMorph - morph) > 1e-4 || !S.arcsReady) {
      T.setArcParams(arcs, ARCOS.map((a, i) => lerpArc(a, ANEL[i], morph)));
      S.lastMorph = morph; S.arcsReady = true;
    }
    const pin = easeOutBack(prog(t, 51.0, 51.5), 1.5);
    arcs.group.scale.setScalar(Math.max(0.001, pin));
    arcs.group.rotation.set(0.15 * (1 - morph), -0.2 * (1 - morph), -(t - 51) * 1.1 - morph * morph * 4);
  }
  // peças do disco se encaixando
  const show = t >= 52.6;
  disk.group.visible = show;
  if (show) {
    const order = [1, 0, 3, 2, 4];
    disk.pieces.forEach((p, k) => {
      const i = order.indexOf(k), ta = 52.95 + i * 0.25, ts = ta - 0.42;
      const e = easeOutCubic(prog(t, ts, ta));
      p.mesh.visible = t >= ts;
      const len = Math.hypot(p.cx, p.cy) || 1, dx = p.cx / len, dy = p.cy / len;
      const bump = t > ta ? Math.sin((t - ta) * 30) * Math.exp(-(t - ta) * 9) * 0.06 : 0;
      p.mesh.position.set(p.cx + dx * (1 - e) * 4.5, p.cy + dy * (1 - e) * 4.5, (1 - e) * 3 + bump);
      p.mesh.rotation.set((1 - e) * 2.2, (1 - e) * -1.6, (1 - e) * 2.8);
    });
    const orbit = easeOutCubic(prog(t, 52.6, 55.6));
    const fin = prog(t, 58.6, 59.3), edge = easeInCubic(prog(t, 62.3, 62.95));
    disk.group.rotation.set(lerp(0.35, 0.06, orbit) + wobble(t, 0.15, 0.03), lerp(-0.75, 0, orbit) + wobble(t, 0.12, 0.1) * orbit + edge * Math.PI / 2, 0);
    disk.group.position.set(0, lerp(0.05, 0.42, easeInOutCubic(fin)), 0);
    disk.group.scale.setScalar(lerp(1, 0.8, easeInOutCubic(fin)));
    const pl = prog(t, 54.2, 54.55);
    disk.logo.visible = pl > 0;
    disk.logo.scale.setScalar(Math.max(0.001, easeOutBack(pl, 3)));
    L.key.position.set(lerp(-6, 6, easeInOutCubic(prog(t, 54.2, 55.4))), 4, 5);
  }
  T.draw3D(ctx, scene, cam);
  F.flash(ctx, t, 52.6, 0.4, 1);
  F.flash(ctx, t, 54.2, 0.5, 0.85);
  // textos da revelação
  const outR = 58.55;
  F.title(ctx, t, { at: 57.0, out: outR, y: 175, lines: [{ t: '30 DE JANEIRO DE 2027', size: 40, fill: '#dfe9ff', tracking: 2 }] });
  F.title(ctx, t, { at: 54.4, out: outR, y: 270, lines: [{ t: 'REDE VANGUARDA ARQUIVOS', size: 52, tracking: 3 }] });
  F.title(ctx, t, { at: 56.35, out: outR, y: 360, lines: [{ t: '4 ANOS', size: 150, colors: ARCO_IRIS }] });
  F.title(ctx, t, { at: 56.45, out: outR, y: 1385, lines: [{ t: '2023 – 2027', size: 70 }] });
  if (t > 56.6 && t < outR + 0.25) {
    const n = Math.round(easeOutCubic(prog(t, 56.6, 58.2)) * 1050);
    const str = `+${n.toLocaleString('pt-BR')} INSCRITOS`;
    const pop = t > 58.2 ? 1 + 0.15 * Math.exp(-(t - 58.2) * 6) : 1;
    ctx.save();
    ctx.globalAlpha = prog(t, 56.6, 56.8) * (1 - prog(t, outR, outR + 0.2));
    ctx.translate(W / 2, 1490); ctx.scale(pop, pop);
    F.text3D(ctx, str, 0, 0, { size: 74, fill: AMARELO, glow: t > 58.2 ? '#FFD400' : null });
    ctx.restore();
  }
  // final
  F.title(ctx, t, { at: 58.7, out: 62.3, y: 215, stagger: 0.12, gap: 1.18, lines: [
    { t: 'UM FÃ DA REDE VANGUARDA', size: 52 },
    { t: 'QUE GOSTA DE CRIAR E', size: 52, colors: hl('QUE GOSTA DE CRIAR E', 'CRIAR', AMARELO) },
    { t: 'RESGATAR MEMÓRIAS', size: 66, fill: AMARELO },
  ] });
  F.title(ctx, t, { at: 58.9, out: 62.3, y: 1265, lines: [{ t: 'OBRIGADO!', size: 120, colors: ARCO_IRIS }] });
  F.title(ctx, t, { at: 59.6, out: 62.3, y: 1420, lines: [{ t: 'QUAL VINHETA VOCÊ QUER REVER?', size: 44 }] });
  const pc = prog(t, 60.2, 60.5);
  if (pc > 0 && t < 62.5) F.pill(ctx, 'COMENTA AÍ', W / 2, 1505, { size: 42, bg: '#fff', color: '#111', icon: F.iconComment, iconColor: '#111', scale: easeOutBack(pc, 2.2) * (1 - prog(t, 62.3, 62.5)) });
  const end = prog(t, 62.55, 63.0);
  if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ transição com os 3 arcos (vinheta de passagem)
export function arcsTransition(ctx, t, centers) {
  for (const c of centers) {
    const p = prog(t, c - 0.38, c + 0.38);
    if (p <= 0 || p >= 1) continue;
    const { scene, cam, arcs } = arcsTransitionSet();
    arcs.group.scale.setScalar(lerp(0.25, 7.5, easeInCubic(p)));
    arcs.group.rotation.set(0.2 * (1 - p), -0.25 * (1 - p), -p * 3.2);
    T.draw3D(ctx, scene, cam);
    const f = 1 - Math.abs(p - 0.5) * 2;
    ctx.fillStyle = `rgba(255,255,255,${0.12 * f * f})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export const SCENES = { gancho, c2023, vinte, busca, acharam, raridades, dvd, strike, memoria, revela: revelaFinal, final: revelaFinal };
export async function prewarm(E) {
  // garante que tudo que é criado sob demanda existe (fontes 3D já carregadas)
  diskSet(); tvSet(); corridorSet(); cardsSet(); dvdSet(); claySet(); arcsTransitionSet();
}
