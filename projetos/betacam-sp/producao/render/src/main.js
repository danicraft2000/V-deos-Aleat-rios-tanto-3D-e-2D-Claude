// Ponto de entrada: carrega tudo e expõe window.__frame(t) -> JPEG (data URL) do quadro no tempo t.
import { W, H, prog, smooth, clamp } from './util.js';
import { initMotor, renderizar } from './motor.js';
import { carregarFontes3D, materiaisTexto } from './texto3d.js';
import { etiquetaCapitulo, selo } from './overlay.js';
import { CENAS, criarAtivos, tituloCapitulo } from './cenas.js';

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
let TL, A;

window.__init = async () => {
  await Promise.all([
    ['700', 'Montserrat'], ['800', 'Montserrat'], ['900', 'Montserrat'], ['500', 'Rajdhani'], ['600', 'Rajdhani'], ['700', 'Rajdhani'],
    ['400', 'Share Tech Mono'], ['700', 'Caveat'],
  ].map(([p, f]) => document.fonts.load(`${p} 40px "${f}"`)));
  TL = await (await fetch('/producao/build/timeline.json')).json();
  initMotor();
  await carregarFontes3D();
  materiaisTexto();
  A = criarAtivos();
  window.__dbg = { A, TL, CENAS };
  return { duracao: TL.duracao, fps: TL.fps, secoes: TL.secoes.map((s) => ({ id: s.id, ini: s.ini, fim: s.fim })) };
};

function secaoEm(t) {
  return TL.secoes.find((s) => t >= s.ini && t < s.fim) ?? TL.secoes[TL.secoes.length - 1];
}
function prepara(S) {
  if (!S._pronta) {
    S.dur = S.fim - S.ini;
    S.f = S.falas.map((f) => f.t);
    S.fe = S.falas.map((f) => f.t + f.dur);
    CENAS[S.id].preparar?.(A, S);
    S._pronta = true;
  }
}

window.__frame = async (t, quality = 0.92) => {
  const S = secaoEm(t);
  prepara(S);
  const lt = t - S.ini;
  const r = CENAS[S.id].quadro(lt, S, A);
  // título 3D do capítulo (preso à câmera)
  const tit = tituloCapitulo(S, lt, r, A);
  // transição: mergulho no preto entre capítulos, com risco de luz
  const idx = TL.secoes.indexOf(S);
  const dIn = idx === 0 ? 1.6 : 0.32;
  let fade = 1 - smooth(prog(lt, 0, dIn));
  if (idx < TL.secoes.length - 1) fade = Math.max(fade, smooth(prog(lt, S.dur - 0.3, S.dur)));
  else fade = Math.max(fade, smooth(prog(lt, S.dur - 1.6, S.dur - 0.2)));
  const streak = idx === 0 ? 0 : Math.max(0, 1 - Math.abs(lt - 0.12) / 0.35) * 0.8;
  const pos = { t, fade: clamp(fade), streak: streak + (r.pos?.streak ?? 0), ...r.pos };
  pos.fade = Math.max(pos.fade ?? 0, clamp(fade));
  if (tit.dof) pos.dof = tit.dof;
  const p0 = performance.now();
  const src = renderizar(r.cena, r.cam, pos);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(src, 0, 0, W, H);
  const p1 = performance.now();
  if (!window.__semOverlay) r.overlay?.(ctx);
  const p2 = performance.now();
  window.__perf = { gl: p1 - p0, overlay: p2 - p1 };
  // etiqueta do capítulo + selo
  if (!r.semEtiqueta) etiquetaCapitulo(ctx, S.numero, S.titulo, prog(lt, 2.6, 3.3), prog(lt, S.dur - 0.9, S.dur - 0.4));
  if (!r.semSelo) selo(ctx, Math.min(prog(lt, 1.0, 1.8), 1 - prog(lt, S.dur - 0.6, S.dur - 0.2)) * (1 - fade));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  return quality ? tela.toDataURL('image/jpeg', quality) : null;
};

/** efeitos sonoros (tempo absoluto) declarados pelas cenas, para o mixador de áudio */
window.__eventos = () => {
  const ev = [];
  for (const S of TL.secoes) {
    prepara(S);
    ev.push(['transicao', S.ini]);
    if (S.numero > 1 || true) ev.push(['titulo', S.ini + (S.numero === 1 ? 2.2 : 0.15)]);
    for (const [nome, lt, vol] of CENAS[S.id].sons?.(S) ?? []) ev.push([nome, +(S.ini + lt).toFixed(3), vol ?? 1]);
  }
  return ev.sort((a, b) => a[1] - b[1]);
};
