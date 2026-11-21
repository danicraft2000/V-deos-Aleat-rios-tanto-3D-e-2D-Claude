// Ponto de entrada: carrega fontes, caracteres especiais e timeline; expõe window.__frame(t) -> JPEG do quadro no tempo t.
import { W, H } from './util.js';
import * as F from './fx.js';
import { configurarCaracteres } from './tipo.js';
import * as T from './tres.js';
import { G, prewarm } from './comum.js';
import { aviso, play, memorias, fa, ano2012, canal, canais, subida } from './cenas_a.js';
import { montagem, segredo, revelacao, embreve, tituloFinal } from './cenas_b.js';
import { thumb } from './thumb.js';

const CENAS = { aviso, play, memorias, fa, ano2012, canal, canais, subida, montagem, segredo, revelacao, embreve, titulo: tituloFinal };
const BASE = '/rva-4-anos-trailer';
const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
const E = { img: {} };

async function loadImg(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

window.__init = async () => {
  const fontes = [
    new FontFace('AGBold', `url(${BASE}/material/fontes/ITCAvantGardeStd-Bold.ttf)`),
    new FontFace('AGDemi', `url(${BASE}/material/fontes/ITCAvantGardeStd-Demi.ttf)`),
  ];
  for (const f of fontes) { await f.load(); document.fonts.add(f); }
  await document.fonts.load('400 64px "VT323"');
  const mapa = configurarCaracteres(await (await fetch(`${BASE}/material/caracteres_especiais.txt`)).text());
  G.TL = await (await fetch(`${BASE}/producao/timeline.json`)).json();
  G.D = G.TL.deixas;
  G.E = E;
  E.img.vinte = await loadImg('/rva-4-anos/referencias/imagens/vanguarda-20-anos.jpg');
  F.initFx();
  T.initThree();
  prewarm();
  return { duracao: G.TL.vinheta_t, fps: G.TL.fps, caracteres: Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, v.codePointAt(0).toString(16)])) };
};

// cenas com VHS mais forte
const VHS_FORTE = new Set(['play', 'ano2012', 'segredo']);
window.__frame = async (t, quality = 0.92) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const cena = G.TL.cenas.find((c) => t >= c.ini && t < c.fim) ?? G.TL.cenas[G.TL.cenas.length - 1];
  await CENAS[cena.id](ctx, t, E);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (cena.id !== 'aviso') F.vhs(ctx, t, VHS_FORTE.has(cena.id) ? { noise: 0.07, scan: 0.4, vig: 1 } : { noise: 0.045, scan: 0.18, vig: 0.85 });
  else F.vhs(ctx, t, { noise: 0.08, scan: 0.0, vig: 0.7 });
  return quality ? tela.toDataURL('image/jpeg', quality) : null;
};

// thumbnail do YouTube (PNG 1920x1080)
window.__thumb = async (opcao = 'A') => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  await thumb(ctx, opcao);
  return tela.toDataURL('image/png');
};
