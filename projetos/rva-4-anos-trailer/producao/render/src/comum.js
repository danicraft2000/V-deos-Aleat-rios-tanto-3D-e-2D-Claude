// Peças compartilhadas pelas cenas: estado da timeline, contador (odômetro), palavras no tempo do locutor,
// conjuntos 3D criados uma vez só.
import { W, H, clamp, lerp, easeOutCubic, rng } from './util.js';
import { texto, medir } from './tipo.js';
import * as F from './fx.js';
import * as T from './tres.js';
const { THREE } = T;

export const G = { TL: null, D: null, E: null };
const S = {};
export const lazy = (k, fn) => (S[k] ??= fn());

/** Contador estilo odômetro. x = borda direita, y = centro. Retorna a largura. */
export function odometro(ctx, v, x, y, o = {}) {
  const size = o.size ?? 200, peso = o.peso ?? 'b', digs = o.digitos ?? 2;
  const cw = medir('0', size, peso).total * 1.04;
  const sepW = o.sep ? medir(o.sep, size, peso).total * 0.9 : 0;
  const iv = Math.floor(v + 1e-6), frac = clamp(v - iv);
  const tot = cw * digs + (o.sep && digs > 3 ? sepW : 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - tot - 40, y - size * 0.43, tot + 80, size * 0.86);
  ctx.clip();
  let xx = x;
  const st = { size, peso, estilo: o.estilo ?? 'prata', depth: o.depth ?? Math.round(size * 0.05), sombra: false, glow: o.glow };
  for (let k = 0; k < digs; k++) {
    if (o.sep && k === 3) {
      const vis = iv >= 1000 || iv + 1 >= 1000 ? 1 : 0;
      if (vis) texto(ctx, o.sep, xx - sepW / 2, y, { ...st, alpha: iv >= 1000 ? 1 : frac });
      xx -= sepW;
    }
    const p10 = 10 ** k;
    const d = Math.floor(iv / p10) % 10;
    const f = k === 0 ? frac : iv % p10 === p10 - 1 ? frac : 0;
    const lead = k > 0 && iv < p10, leadN = k > 0 && iv + 1 < p10;
    const cx = xx - cw / 2, step = size * 1.06;
    if (!lead || o.zeros) texto(ctx, String(d), cx, y - f * step, st);
    if (f > 0 && (!leadN || o.zeros)) texto(ctx, String((d + 1) % 10), cx, y + (1 - f) * step, st);
    xx -= cw;
  }
  ctx.restore();
  return tot;
}

/** Palavras numa linha, cada uma entrando no seu tempo (sincronizadas com o locutor). lista: [[palavra, t], ...] */
export function palavras(ctx, t, lista, x, y, o = {}) {
  const full = lista.map((w) => w[0]).join(' ');
  const L = medir(full, o.size ?? 100, o.peso ?? 'b', o.tracking ?? 0);
  const x0 = o.align === 'left' ? x : x - L.total / 2;
  let idx = 0;
  for (const [s, at] of lista) {
    if (t >= at) texto(ctx, s, x0 + L.xs[idx], y, { ...o, align: 'left', anim: o.anim ?? 'sobe', lt: t - at });
    idx += [...s].length + 1;
  }
  return L.total;
}

/** Fundo escuro padrão do trailer (azul-marinho) com raios e brilhos. */
export function fundoPadrao(ctx, t, o = {}) {
  F.fundo(ctx, o.inner ?? '#121b4e', o.outer ?? '#02030a', o.cx ?? W / 2, o.cy ?? H * 0.45, W * 0.75);
  if (o.raios !== false) F.raios(ctx, o.cx ?? W / 2, o.cy ?? H * 0.45, t, { colors: F.ARCO, alpha: o.raiosAlpha ?? 0.06, n: 20 });
  if (o.bokeh) F.bokeh(ctx, t, o.seed ?? 4, { alpha: o.bokeh, n: o.bokehN ?? 22 });
  if (o.brilhos !== false) F.brilhos(ctx, t, (o.seed ?? 4) + 9, { n: 40, alpha: 0.45 });
}

// ------------------------------------------------------------------ conjuntos 3D
export function tunelSet() {
  return lazy('tunel', () => {
    const scene = T.newScene();
    scene.fog = new THREE.Fog('#05081a', 4, 26);
    const cam = T.camera(52);
    const tun = T.tunelFitas();
    scene.add(tun.group);
    scene.add(new THREE.AmbientLight('#8fa0ff', 0.55));
    const luzCam = new THREE.PointLight('#ffffff', 25, 10, 1.3);
    scene.add(luzCam);
    return { scene, cam, tun, luzCam };
  });
}
export function tvSet() {
  return lazy('tv', () => {
    const scene = T.newScene();
    const cam = T.camera(30);
    const tv = T.buildTV();
    scene.add(tv.group);
    const L = T.lights(scene, { key: 2.4, rim: 2.6, rimColor: '#7a6bff', amb: 0.2 });
    const tela = document.createElement('canvas');
    tela.width = 640; tela.height = 480;
    T.setTex(tv.tex, tela, 1.36 / 1.02);
    return { scene, cam, tv, tela, L };
  });
}
export function paredeSet() {
  return lazy('parede', () => {
    const scene = T.newScene();
    const cam = T.camera(42);
    const p = T.paredeTVs();
    scene.add(p.group);
    T.lights(scene, { key: 1.4, rim: 1.2, amb: 0.35 });
    return { scene, cam, p };
  });
}
export function segredoSet() {
  return lazy('segredo', () => {
    const scene = T.newScene();
    scene.environmentIntensity = 0.25;
    scene.fog = new THREE.Fog('#000000', 7, 16);
    const cam = T.camera(34);
    const s = T.caixasSecretas();
    scene.add(s.group);
    return { scene, cam, s };
  });
}
export function discoSet() {
  return lazy('disco', () => {
    const scene = T.newScene();
    const cam = T.camera(30);
    cam.position.set(0, 0, 9.2);
    const disk = T.buildDisk();
    const arcs = T.buildArcs();
    scene.add(disk.group, arcs.group);
    const L = T.lights(scene, { key: 1.6, rim: 2.2, amb: 0.2 });
    return { scene, cam, disk, arcs, L };
  });
}
export function arcosSet() {
  return lazy('arcos', () => {
    const scene = T.newScene();
    const cam = T.camera(35);
    cam.position.set(0, 0, 6);
    const arcs = T.buildArcs();
    scene.add(arcs.group);
    T.lights(scene, { key: 2.2, rim: 1.6 });
    return { scene, cam, arcs };
  });
}
export function prewarm() {
  tunelSet(); tvSet(); paredeSet(); segredoSet(); discoSet(); arcosSet();
}

/** Ruído animado nas texturas de chiado (determinístico por quadro). */
export function mexerRuido(texs, t) {
  const r = rng(Math.floor(t * 30) * 7 + 1);
  for (const tx of texs) if (tx) tx.offset.set(r(), r());
}

/** '???' subindo (partículas) */
export function interrogacoes(ctx, t, t0, n, o = {}) {
  const r = rng(o.seed ?? 33);
  for (let i = 0; i < n; i++) {
    const nasce = t0 + r() * (o.janela ?? 3.2), x0 = W / 2 + (r() - 0.5) * (o.largura ?? 900), sz = 30 + r() * 70;
    const sp = 120 + r() * 220, rot0 = (r() - 0.5) * 0.8, vr = (r() - 0.5) * 1.5;
    const lt = t - nasce;
    if (lt < 0) continue;
    const y = (o.y0 ?? H * 0.62) - lt * sp, x = x0 + Math.sin(lt * 2 + i) * 30;
    const a = clamp(lt * 3) * clamp(1 - lt / 2.4);
    if (a <= 0) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot0 + vr * lt);
    texto(ctx, '?', 0, 0, { size: Math.round(sz), estilo: i % 3 === 0 ? 'arcoiris' : 'branco', alpha: a, depth: 3, glow: 'rgba(255,255,255,0.6)' });
    ctx.restore();
  }
}
export { lerp, easeOutCubic };
