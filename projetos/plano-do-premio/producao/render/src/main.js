// Ponto de entrada: carrega tudo e expõe window.__frame(t) -> JPEG (data URL) do quadro no tempo t.
import { W, H, clamp } from './util.js';
import * as F from './fx.js';
import * as T from './three3d.js';
import { CENAS, CAPITULOS, preparar } from './scenes.js';

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
let TL;
const E = { img: {} };

async function loadImg(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

window.__init = async () => {
  await Promise.all([900, 800, 700, 600].map((w) => document.fonts.load(`${w} 80px "Montserrat"`)).concat(document.fonts.load('700 80px "Caveat"')));
  TL = await (await fetch('/producao/timeline.json')).json();
  E.TL = TL;
  const porId = Object.fromEntries(TL.falas.map((f) => [f.id, f]));
  E.f = (id) => porId[id].t;                        // início da fala
  E.fe = (id) => porId[id].t + porId[id].dur;       // fim da fala
  const fotos = ['ps1', 'ps2', 'ps3', 'ps4', 'ps5', 'tablet', 'ps1-controle-recorte', 'ps4-controle-recorte'];
  await Promise.all(fotos.map(async (n) => { E.img[n] = await loadImg(`/producao/build/fotos/${n}.png`); }));
  F.initFx();
  T.initThree();
  await preparar(E);
  return { duracao: TL.duracao, fps: TL.fps };
};

window.__frame = async (t, quality = 0.92) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = '#05071a';
  ctx.fillRect(0, 0, W, H);
  const cena = TL.cenas.find((c) => t >= c.ini && t < c.fim) ?? TL.cenas[TL.cenas.length - 1];
  ctx.save();
  await CENAS[cena.id](ctx, t, E, cena);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;

  F.acabamento(ctx, t);

  // capítulo no canto
  const cap = CAPITULOS[cena.id];
  if (cap) {
    const a = Math.min(clamp((t - cena.ini - 0.4) / 0.4), clamp((cena.fim - t) / 0.3));
    F.capitulo(ctx, cap[0], cap[1], a);
  }

  // legenda da fala atual
  for (const f of [...TL.falas].reverse()) {
    const fim = f.t + f.dur + 0.25;
    if (t >= f.t - 0.12 && t < fim + 0.2) {
      const a = Math.min(clamp((t - f.t + 0.12) / 0.15), clamp((fim + 0.2 - t) / 0.2));
      F.legenda(ctx, f.legenda, a);
      break;
    }
  }

  // transições entre cenas
  for (const c of TL.cenas.slice(1)) F.transicao(ctx, t, c.ini);

  // entra do preto e sai pro preto
  const fadeIn = 1 - clamp(t / 0.7), fadeOut = clamp((t - (TL.duracao - 0.9)) / 0.9);
  const k = Math.max(fadeIn, fadeOut);
  if (k > 0) { ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, W, H); }
  return quality ? tela.toDataURL('image/jpeg', quality) : null;
};
