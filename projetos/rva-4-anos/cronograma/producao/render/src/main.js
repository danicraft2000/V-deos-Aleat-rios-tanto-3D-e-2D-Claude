// Ponto de entrada: carrega tudo e expõe window.__frame(t) -> JPEG (data URL) do quadro no tempo t.
// Faz o papel do "Premiere": escolhe a cena, aplica transições (flash, zoom, whip, arcos, glitch),
// leve movimento de câmera, tremidas nos impactos e as camadas fixas (logo da emissora, barra do cronograma).
import { W, H, clamp, lerp, easeInOutCubic, easeInCubic, easeOutCubic, canvas } from './util.js';
import * as F from './fx.js';
import * as T from './three3d.js';
import { drawRVA25D } from './logos.js';
import { setTimeline, trackerBar } from './common.js';
import * as A from './scenes_a.js';
import * as B from './scenes_b.js';
import * as C from './scenes_c.js';

const SCENES = {
  vinheta: A.vinheta, abertura: A.abertura, rva4: A.rva4, especial: A.especial, periodo: A.periodo,
  novidades: A.novidades, titulo: A.titulo, visao: A.visao,
  dezembro: B.dezembro, janeiro: B.janeiro, segredo: B.segredo, teaser: B.teaser,
  orcamento: C.orcamento, fechamento: C.fechamento, final: C.final,
};

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
const bufA = canvas(W, H), bufB = canvas(W, H);
let TL, contagem;
const cache = new Map();

async function loadImg(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
const E = {
  img: {},
  async frame(cid, lt) {
    const n = contagem[cid];
    const i = Math.max(0, Math.min(n - 1, Math.floor(lt * 30 + 1e-6)));
    const key = `${cid}/${i}`;
    if (cache.has(key)) return cache.get(key);
    const img = await loadImg(`/cronograma/build/frames/${cid}/${String(i + 1).padStart(4, '0')}.jpg`);
    cache.set(key, img);
    if (cache.size > 120) cache.delete(cache.keys().next().value);
    return img;
  },
};

window.__init = async () => {
  await Promise.all([
    document.fonts.load('900 80px "Montserrat"'), document.fonts.load('800 80px "Montserrat"'), document.fonts.load('700 80px "Montserrat"'),
    document.fonts.load('400 80px "Anton"'), document.fonts.load('400 80px "Bungee"'), document.fonts.load('400 80px "VT323"'),
  ]);
  TL = await (await fetch('/cronograma/producao/timeline.json')).json();
  setTimeline(TL);
  contagem = await (await fetch('/cronograma/build/frames/contagem.json')).json();
  E.img.wordmark = await loadImg('/cronograma/material/imagens/vanguarda_wordmark.png');
  E.img.empilhado = await loadImg('/cronograma/material/imagens/vanguarda_empilhado.png');
  F.initFx();
  T.initThree();
  A.buildA(E);
  B.buildB(E);
  C.buildC(E);
  return { duracao: TL.duracao, fps: TL.fps };
};

function sceneAt(t) {
  return TL.cenas.find((c) => t >= c.ini && t < c.fim) ?? TL.cenas[TL.cenas.length - 1];
}
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, amp, dur] of TL.tremidas) {
    const p = (t - t0) / dur;
    if (p < 0 || p > 1) continue;
    const k = amp * (1 - p) * (1 - p);
    x += Math.sin(t * 93 + t0) * k;
    y += Math.cos(t * 71 + t0) * k;
  }
  return [x, y];
}
/** Desenha uma cena num contexto, com câmera lenta (push-in) e tremida. */
async function renderScene(c2, cena, t) {
  c2.setTransform(1, 0, 0, 1, 0, 0);
  c2.globalAlpha = 1;
  c2.globalCompositeOperation = 'source-over';
  c2.filter = 'none';
  c2.fillStyle = '#000';
  c2.fillRect(0, 0, W, H);
  const p = clamp((t - cena.ini) / (cena.fim - cena.ini));
  const [sx, sy] = shakeAt(t);
  const s = cena.id === 'vinheta' ? 1 : 1.03 + 0.035 * p;
  c2.setTransform(s, 0, 0, s, W / 2 - (W / 2) * s + sx, H / 2 - (H / 2) * s + sy);
  await SCENES[cena.id](c2, t, E);
  c2.setTransform(1, 0, 0, 1, 0, 0);
  c2.globalAlpha = 1;
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * k);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function drawShifted(dst, src, dx, dy, s = 1, a = 1) {
  dst.save();
  dst.globalAlpha = a;
  dst.translate(W / 2 + dx, H / 2 + dy);
  dst.scale(s, s);
  dst.drawImage(src, -W / 2, -H / 2);
  dst.restore();
}

async function composite(t) {
  const tr = TL.transicoes.find((x) => Math.abs(t - x.t) < x.dur / 2);
  if (!tr) {
    await renderScene(ctx, sceneAt(t), t);
    return;
  }
  const p = clamp((t - (tr.t - tr.dur / 2)) / tr.dur);
  const antes = sceneAt(tr.t - 0.001), depois = sceneAt(tr.t + 0.001);
  const a = bufA.getContext('2d'), b = bufB.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (tr.tipo === 'whip') {
    await renderScene(a, antes, t);
    await renderScene(b, depois, t);
    const dir = tr.dir ?? 1;
    const e = easeInOutCubic(p);
    const off = e * W * dir;
    const blur = Math.sin(p * Math.PI);
    for (let k = 0; k < 6; k++) {
      const d = (k - 2.5) * 40 * blur * dir;
      drawShifted(ctx, bufA, -off + d, 0, 1, k === 0 ? 1 : 0.35);
      drawShifted(ctx, bufB, W * dir - off + d, 0, 1, k === 0 ? 1 : 0.35);
    }
  } else if (tr.tipo === 'zoom') {
    if (p < 0.5) {
      await renderScene(a, antes, t);
      const q = easeInCubic(p / 0.5);
      for (let k = 0; k < 5; k++) drawShifted(ctx, bufA, 0, 0, 1 + q * (0.5 + k * 0.12), k === 0 ? 1 : 0.3);
    } else {
      await renderScene(b, depois, t);
      const q = 1 - easeOutCubic((p - 0.5) / 0.5);
      for (let k = 0; k < 5; k++) drawShifted(ctx, bufB, 0, 0, 1 + q * (0.35 + k * 0.1), k === 0 ? 1 : 0.3 * q + 0.0);
    }
    F.flash(ctx, t, tr.t, 0.3, 0.45);
  } else if (tr.tipo === 'flash') {
    await renderScene(a, p < 0.5 ? antes : depois, t);
    ctx.drawImage(bufA, 0, 0);
    const k = 1 - Math.abs(p - 0.5) * 2;
    ctx.fillStyle = `rgba(255,255,255,${clamp(k * 1.3)})`;
    ctx.fillRect(0, 0, W, H);
  } else if (tr.tipo === 'glitch') {
    await renderScene(a, p < 0.5 ? antes : depois, t);
    ctx.drawImage(bufA, 0, 0);
    const k = 1 - Math.abs(p - 0.5) * 2;
    F.glitch(ctx, t, k * 2.2, 7);
    F.staticNoise(ctx, t, k * 0.5);
  } else if (tr.tipo === 'arcos') {
    // faixas nas cores dos 3 arcos atravessam a tela (vermelho, azul, verde) e trocam a cena por baixo
    await renderScene(a, p < 0.5 ? antes : depois, t);
    ctx.drawImage(bufA, 0, 0);
    const cores = ['#F2471A', '#1677D6', '#2FA21E'];
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.5);
    // cada faixa tem 2,2 telas de largura; a do meio (azul) cobre a tela inteira no instante da troca (p = 0,5)
    const bw = 2.2 * W, half = 1100;
    cores.forEach((c, i) => {
      const q = easeInOutCubic(clamp((p - i * 0.1) / 0.8));
      const x = lerp(-bw - half, half, q);
      const g = ctx.createLinearGradient(x, 0, x + 220, 0);
      g.addColorStop(0, shadeHex(c, 0.75));
      g.addColorStop(1, c);
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 50;
      ctx.fillRect(x, -W, bw, 2 * W);
    });
    ctx.restore();
  }
}

window.__frame = async (t, quality = 0.92) => {
  await composite(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // "bug" da emissora (RVA pequeno no canto)
  for (const [a, b] of TL.bug_rva) {
    if (t < a || t > b) continue;
    const k = Math.min(clamp((t - a) / 0.4), clamp((b - t) / 0.3));
    ctx.save();
    ctx.globalAlpha = 0.9 * k;
    drawRVA25D(ctx, 118, 78, 130, { depth: 3 });
    ctx.restore();
  }
  // barra do cronograma
  for (const [a, b] of TL.barra_cronograma) {
    if (t < a || t > b) continue;
    const k = Math.min(clamp((t - a) / 0.4), clamp((b - t) / 0.3));
    const ativo = t < 84.6 ? 0 : t < 115.6 ? clamp((t - 84.6) / 0.8) : 1 + clamp((t - 118.75) / 0.6);
    trackerBar(ctx, ativo, k);
  }
  F.finish(ctx, t, { grain: 0.05, vignette: 0.85 });
  return quality ? tela.toDataURL('image/jpeg', quality) : null;
};
