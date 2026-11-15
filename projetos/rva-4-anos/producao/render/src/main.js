// Ponto de entrada: carrega tudo e expõe window.__frame(t) -> JPEG (data URL) do quadro no tempo t.
import { W, H } from './util.js';
import * as F from './fx.js';
import * as T from './three3d.js';
import { drawRVA25D } from './logos.js';
import { SCENES, arcsTransition, prewarm } from './scenes.js';

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
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
  // quadro de um trecho de vídeo (30 fps) no tempo local lt
  async frame(cid, lt, o = {}) {
    const n = contagem[cid];
    let i = Math.floor(lt * 30 + 1e-6);
    i = o.loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
    const key = `${cid}/${i}`;
    if (cache.has(key)) return cache.get(key);
    const img = await loadImg(`/producao/build/frames/${cid}/${String(i + 1).padStart(4, '0')}.jpg`);
    cache.set(key, img);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return img;
  },
};

window.__init = async () => {
  await Promise.all([
    document.fonts.load('900 80px "Montserrat"'), document.fonts.load('800 80px "Montserrat"'),
    document.fonts.load('700 80px "Montserrat"'), document.fonts.load('400 80px "VT323"'), document.fonts.load('700 80px "Caveat"'),
  ]);
  TL = await (await fetch('/producao/timeline.json')).json();
  contagem = await (await fetch('/producao/build/frames/contagem.json')).json();
  E.img.vinte = await loadImg('/referencias/imagens/vanguarda-20-anos.jpg');
  F.initFx();
  T.initThree();
  await T.loadFont3D();
  await prewarm(E);
  return { duracao: TL.duracao, fps: TL.fps };
};

window.__frame = async (t, quality = 0.92) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const cena = TL.cenas.find((c) => t >= c.ini && t < c.fim) ?? TL.cenas[TL.cenas.length - 1];
  await SCENES[cena.id](ctx, t, E);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  // "bug" da emissora no canto (RVA pequeno)
  if (t > 4.0 && t < 51.0) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawRVA25D(ctx, 120, 168, 150, { depth: 3 });
    ctx.restore();
  }
  arcsTransition(ctx, t, TL.transicoes_arcos);
  F.vhsOverlay(ctx, t, { noise: 0.06, scan: 0.35, vignette: 0.9 });
  return quality ? tela.toDataURL('image/jpeg', quality) : null;
};
