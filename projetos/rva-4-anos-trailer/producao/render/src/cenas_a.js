// Cenas 1–8 do trailer (0 – 41 s): da abertura à subida para a montagem.
import { W, H, clamp, lerp, prog, easeOutCubic, easeInCubic, easeInOutCubic, easeOutBack, easeOutExpo, easeInExpo, rng, wobble, shakes, janela } from './util.js';
import * as F from './fx.js';
import { texto, titulo, medir } from './tipo.js';
import * as T from './tres.js';
import { G, odometro, palavras, fundoPadrao, tunelSet, tvSet, paredeSet, arcosSet, mexerRuido } from './comum.js';
import { drawRVA25D, RVA_BOX } from '/rva-4-anos/producao/render/src/logos.js';

// ================================================================== 1. AVISO (0 – 4,6)
export async function aviso(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#13803d'); g.addColorStop(1, '#0a4f26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const fl = 1 + 0.03 * Math.sin(t * 47) + 0.02 * Math.sin(t * 13.7);
  ctx.save();
  ctx.translate(Math.sin(t * 23) * 1.2, Math.cos(t * 19) * 1.0);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  F.roundRect(ctx, 80, 64, W - 160, H - 128, 12);
  ctx.stroke();
  const o = { peso: 'd', depth: 0, sombra: false };
  texto(ctx, 'O TRAILER A SEGUIR FOI APROVADO', W / 2, 220, { ...o, size: 66 });
  texto(ctx, 'PARA TODOS OS INSCRITOS', W / 2, 310, { ...o, size: 66 });
  texto(ctx, 'PELA', W / 2, 395, { ...o, size: 40 });
  drawRVA25D(ctx, W / 2, 520, 330, { depth: 6 });
  texto(ctx, 'REDE VANGUARDA ARQUIVOS', W / 2, 670, { size: 60, depth: 0, sombra: false });
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(W / 2 - 520, 750, 1040, 3);
  const a = 'CONTÉM: NOSTALGIA, VINHETAS RARAS E UMA SURPRESA ';
  const wa = medir(a, 36, 'd').total, wq = medir('???', 36, 'b').total;
  texto(ctx, a, W / 2 - (wa + wq) / 2, 812, { ...o, size: 36, align: 'left' });
  texto(ctx, '???', W / 2 - (wa + wq) / 2 + wa, 812, { size: 36, align: 'left', depth: 0, sombra: false, estilo: '#FFD84A' });
  texto(ctx, 'TRAILER OFICIAL · 4 ANOS', W / 2, 900, { ...o, size: 28, alpha: 0.75, tracking: 6 });
  ctx.restore();
  ctx.fillStyle = `rgba(0,0,0,${clamp(0.25 * (fl - 1) * 4)})`;
  ctx.fillRect(0, 0, W, H);
  const fade = 1 - janela(t, 0, 4.6, 0.35, 0.45);
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}

// ================================================================== 2. PLAY + HÁ 4 ANOS (4,6 – 7,8)
export async function play(ctx, t) {
  const D = G.D;
  fundoPadrao(ctx, t, { raiosAlpha: 0.06 * prog(t, 5.6, 6.4), brilhos: t > 5.6 });
  if (t < 4.62) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  else if (t < 4.98) { ctx.fillStyle = '#1636c8'; ctx.fillRect(0, 0, W, H); }
  F.estatica(ctx, t, t < 4.62 ? 0.12 : t < 4.98 ? 0 : 0.85 * clamp(1 - (t - 4.98) / 0.6));
  // HÁ 4 ANOS (layout pelas larguras reais)
  const sHA = 180, s4 = 560, gap = 70;
  const wHA = medir('HÁ', sHA).total, w4 = medir('4', s4).total, wAN = medir('ANOS', sHA).total;
  const x0 = (W - (wHA + w4 + wAN + gap * 2)) / 2, cy = 560;
  const [sx, sy] = shakes(t, [[D.quatro, 0.5, 30], [D.anos, 0.3, 8], [D.ha, 0.2, 6]]);
  const push = 1 + 0.07 * prog(t, 6.9, 7.55) + easeInExpo(prog(t, 7.5, 7.8)) * 2.2;
  ctx.save();
  ctx.globalAlpha = 1 - prog(t, 7.62, 7.8);
  ctx.translate(W / 2 + sx, H / 2 + sy);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);
  if (t >= D.quatro) {
    // onda de choque arco-íris
    const p = prog(t, D.quatro, D.quatro + 0.8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    F.ARCO.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.globalAlpha = (1 - p) * 0.5;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(x0 + wHA + gap + w4 / 2, cy, easeOutCubic(p) * (380 + i * 40), 0, 6.283);
      ctx.stroke();
    });
    ctx.restore();
  }
  if (t >= D.ha) texto(ctx, 'HÁ', x0 + wHA / 2, cy + 40, { size: sHA, estilo: 'branco', anim: 'pop', lt: t - D.ha, depth: 12 });
  if (t >= D.quatro) {
    const p = prog(t, D.quatro, D.quatro + 0.2);
    ctx.save();
    ctx.globalAlpha *= clamp(p * 3);
    ctx.translate(x0 + wHA + gap + w4 / 2, cy);
    const sc = lerp(3.4, 1, easeOutCubic(p));
    ctx.scale(sc, sc);
    texto(ctx, '4', 0, 0, { size: s4, estilo: 'prata', depth: 26, glow: t < D.quatro + 0.6 ? `rgba(160,200,255,${0.8 * (1 - prog(t, D.quatro, D.quatro + 0.6))})` : null });
    ctx.restore();
  }
  if (t >= D.anos) {
    const p = prog(t, D.anos, D.anos + 0.35);
    texto(ctx, 'ANOS', lerp(W + 300, x0 + wHA + gap * 2 + w4 + wAN / 2, easeOutExpo(p)), cy + 40, { size: sHA, estilo: 'arcoiris', depth: 12 });
  }
  ctx.restore();
  F.flash(ctx, t, D.quatro, 0.35, 0.6);
  // OSD da fita
  if (t >= 4.68 && t < 6.25) {
    const a = janela(t, 4.68, 6.25, 0.02, 0.3);
    F.osd(ctx, '▶ PLAY', 110, 110, { size: 84, alpha: a });
    F.osd(ctx, 'SP', 110, H - 110, { size: 64, alpha: a });
    const s = Math.floor((t - 4.68) * 30);
    F.osd(ctx, `0:00:${String(Math.floor(s / 30)).padStart(2, '0')}:${String(s % 30).padStart(2, '0')}`, W - 110, H - 110, { size: 64, align: 'right', alpha: a });
  }
  F.tracking(ctx, t, t < 6.0 ? clamp(1 - (t - 4.62) / 1.4) : 0.0, 5);
}

// ================================================================== 3. TÚNEL DE FITAS: RESGATANDO MEMÓRIAS (7,8 – 13,6)
export async function memorias(ctx, t) {
  const D = G.D;
  F.fundo(ctx, '#0c1440', '#010207');
  const { scene, cam, tun, luzCam } = tunelSet();
  const z = 8.5 - 3.4 * (t - 7.8) - 30 * easeInCubic(prog(t, 11.5, 13.6));
  cam.position.set(Math.sin(t * 0.5) * 0.35, Math.cos(t * 0.4) * 0.22, z);
  cam.lookAt(Math.sin(t * 0.5 + 0.4) * 0.2, 0, z - 10);
  cam.rotateZ(t * 0.09);
  luzCam.position.set(0, 0.4, z - 1.5);
  tun.fitas.forEach((m) => {
    const u = m.userData;
    m.rotation.set(u.rx + t * u.spin * 0.6, u.ry + t * u.spin, u.rz + t * u.spin * 0.4);
  });
  mexerRuido(tun.telas.map((s) => s.userData.noise), t);
  const fim = prog(t, 11.4, 13.6);
  tun.luz.scale.setScalar(1 + fim * 2.5);
  T.draw3D(ctx, scene, cam);
  // escurece o centro para o texto respirar
  const rg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 700);
  rg.addColorStop(0, 'rgba(0,0,8,0.55)'); rg.addColorStop(1, 'rgba(0,0,8,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  // textos
  const trk = lerp(50, 8, easeOutCubic(prog(t, D.resgatando, D.resgatando + 1.0)));
  titulo(ctx, t, 'RESGATANDO', W / 2, 420, D.resgatando, 9.38, { size: 120, tracking: trk, saida: 0.15, stagger: 0.03 });
  titulo(ctx, t, 'MEMÓRIAS', W / 2, 600, D.memorias - 0.05, 9.38, { size: 200, estilo: 'prata', depth: 14, saida: 0.15, anim: 'pop', stagger: 0.04 });
  titulo(ctx, t, 'DA REDE', W / 2, 400, D.da_rede, 11.5, { size: 104, saida: 0.3, push: 0.06 });
  titulo(ctx, t, 'VANGUARDA', W / 2, 590, D.vanguarda, 11.5, { size: 240, estilo: 'arcoiris', depth: 16, anim: 'pop', stagger: 0.05, saida: 0.3, push: 0.06 });
  // brilho passando no VANGUARDA
  const pb = prog(t, D.vanguarda + 0.45, D.vanguarda + 1.1);
  if (pb > 0 && pb < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bx = lerp(200, W - 200, pb);
    const gr = ctx.createLinearGradient(bx - 120, 0, bx + 120, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(bx - 120, 480, 240, 220);
    ctx.restore();
  }
  // clarão no fim do túnel
  const w = easeInCubic(prog(t, 12.9, 13.6));
  if (w > 0) { ctx.fillStyle = `rgba(255,255,255,${w})`; ctx.fillRect(0, 0, W, H); }
}

// ================================================================== 4. O FÃ (13,6 – 19,6)
function telaTV(x, t, D) {
  const w = 640, h = 480;
  if (t < 16.5) {
    x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
    x.globalAlpha = 0.45;
    x.drawImage(F.noiseCanvas(Math.floor(t * 30)), 0, 0, w, h);
    x.globalAlpha = 1;
    return;
  }
  const on = prog(t, 16.5, 16.62);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#f4f6fb'); g.addColorStop(1, '#c7cfe0');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.save();
  x.translate(w / 2, h * 0.44);
  x.rotate(-(t - 16.5) * 0.6);
  T.drawArcos2D(x, 0, 0, 150);
  x.restore();
  x.fillStyle = '#1b2340';
  x.font = '44px "VT323"'; x.textAlign = 'center';
  x.fillText('NO AR', w / 2, h - 50);
  x.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < h; y += 4) x.fillRect(0, y, w, 2);
  if (on < 1) {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff';
    const lh = Math.max(3, on * h);
    x.fillRect(0, h / 2 - lh / 2, w, lh);
  }
  if (t > 18.9) {
    // a fita começa a rebobinar
    const k = prog(t, 18.9, 19.6);
    x.globalAlpha = k * 0.7;
    x.drawImage(F.noiseCanvas(Math.floor(t * 30) + 3), 0, (t * 900) % h - h / 2, w, h * 0.3);
    x.globalAlpha = 1;
  }
}
export async function fa(ctx, t) {
  const D = G.D;
  fundoPadrao(ctx, t, { inner: '#24124e', outer: '#030209', cx: W * 0.72, cy: H * 0.5, raiosAlpha: 0.05, bokeh: 0.12, seed: 14 });
  const { scene, cam, tv, tela } = tvSet();
  telaTV(tela.getContext('2d'), t, D);
  tv.tex.needsUpdate = true;
  const k = easeOutCubic(prog(t, 13.6, 14.6));
  tv.group.position.set(1.55, -0.05 + wobble(t, 0.25, 0.04), 0);
  tv.group.rotation.set(0.04, lerp(-0.85, -0.42, k) + (t - 13.6) * 0.02, 0);
  cam.position.set(0, 0.15, lerp(7.4, 6.2, easeOutCubic(prog(t, 13.6, 19.6))));
  cam.lookAt(0.15, 0.05, 0);
  // brilho da tela no fundo
  if (t > 16.55) {
    const rg = ctx.createRadialGradient(W * 0.73, H * 0.5, 0, W * 0.73, H * 0.5, 600);
    rg.addColorStop(0, 'rgba(150,170,255,0.25)'); rg.addColorStop(1, 'rgba(150,170,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  T.draw3D(ctx, scene, cam);
  // textos à esquerda
  const X = 150;
  titulo(ctx, t, 'APENAS UM FÃ', X, 300, D.apenas, 18.0, { size: 84, peso: 'd', align: 'left', saida: 0.3 });
  titulo(ctx, t, 'DESDE OS', X, 300, D.com, 19.4, { size: 84, peso: 'd', align: 'left', saida: 0.2 });
  // contador 17 -> 3
  if (t >= D.fa) {
    let v;
    if (t < D.anos17) v = 17 * easeOutCubic(prog(t, D.fa, D.anos17));
    else if (t < 18.4) v = 17;
    else v = lerp(17, 3, easeInOutCubic(prog(t, 18.4, D.tres)));
    const [sx, sy] = shakes(t, [[D.anos17, 0.4, 16], [D.tres, 0.35, 12]]);
    const sizeN = 330;
    const cw = medir('0', sizeN).total * 1.04;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalAlpha = clamp((t - D.fa) * 4) * (1 - prog(t, 19.4, 19.6));
    odometro(ctx, v, X + cw * 2, 530, { size: sizeN, digitos: 2, estilo: 'prata', depth: 18 });
    if (t >= D.anos17) {
      const p = prog(t, D.anos17, D.anos17 + 0.3);
      ctx.save();
      ctx.translate(X + cw * 2 + 40, 560);
      const sc = lerp(1.8, 1, easeOutBack(p, 2));
      ctx.scale(sc, sc);
      texto(ctx, 'ANOS', 0, 0, { size: 130, estilo: 'arcoiris', depth: 10, align: 'left', alpha: clamp(p * 3) });
      ctx.restore();
    }
    ctx.restore();
  }
  titulo(ctx, t, 'ACOMPANHA A EMISSORA', X, 760, D.acompanhou, 19.4, { size: 62, peso: 'd', align: 'left', saida: 0.2, stagger: 0.02 });
  F.flash(ctx, t, D.anos17, 0.3, 0.35);
  F.flash(ctx, t, 13.6, 0.5, 1);
  F.tracking(ctx, t, prog(t, 19.0, 19.6) * 0.8, 9);
}

// ================================================================== 5. REBOBINA ATÉ 2012 E AVANÇA ATÉ 2023 (19,6 – 24)
export async function ano2012(ctx, t) {
  const D = G.D;
  F.fundo(ctx, '#0b1650', '#01020a');
  F.raios(ctx, W / 2, 560, t, { colors: F.ARCO, alpha: t > D.ano2012 ? 0.08 : 0.03, n: 22 });
  F.estatica(ctx, t, t < D.ano2012 ? 0.22 : t >= 22.0 && t < 23.6 ? 0.12 : 0.04);
  let ano, modo;
  if (t < D.ano2012) { ano = lerp(2026, 2012, easeInOutCubic(prog(t, 19.6, D.ano2012))); modo = 'REW'; }
  else if (t < 22.0) { ano = 2012; modo = 'PLAY'; }
  else if (t < 23.6) { ano = lerp(2012, 2023, easeInOutCubic(prog(t, 22.0, 23.6))); modo = 'FF'; }
  else { ano = 2023; modo = 'PLAY'; }
  const [sx, sy] = shakes(t, [[D.ano2012, 0.45, 26], [23.6, 0.3, 14]]);
  const push = 1 + 0.05 * prog(t, D.ano2012, 22.0);
  ctx.save();
  ctx.translate(W / 2 + sx, 0 + sy);
  ctx.scale(push, push);
  ctx.translate(-W / 2, 0);
  titulo(ctx, t, 'EM', W / 2, 300, D.em, 21.9, { size: 84, peso: 'd', saida: 0.2 });
  const sizeY = 340;
  const cw = medir('0', sizeY).total * 1.04;
  const parado = (t >= D.ano2012 && t < 22.0) || t >= 23.6;
  const est = t >= 23.6 ? 'prata' : parado ? 'arcoiris' : 'prata';
  if (t < 23.6) odometro(ctx, ano, W / 2 + cw * 2, 560, { size: sizeY, digitos: 4, estilo: est, depth: 18 });
  else {
    const p = prog(t, 23.6, 23.85);
    texto(ctx, '30.01.2023', W / 2, 520, { size: 210, estilo: 'prata', depth: 14, anim: 'pop', lt: t - 23.6, stagger: 0.02 });
    texto(ctx, 'NASCE O CANAL', W / 2, 720, { size: 80, estilo: 'arcoiris', depth: 6, anim: 'sobe', lt: t - 23.7, alpha: p });
  }
  ctx.restore();
  // régua do tempo (avanço)
  if (t >= 21.9) {
    const a = janela(t, 21.9, 24.0, 0.2, 0.15);
    const x0 = 260, x1 = W - 260, y = 900;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    for (let k = 0; k <= 11; k++) {
      const x = lerp(x0, x1, k / 11);
      ctx.fillStyle = k === 11 ? '#FFD84A' : '#fff';
      ctx.fillRect(x - 2, y - 14, 4, 28);
      F.osd(ctx, String(2012 + k), x, y + 46, { size: 34, align: 'center', color: k === 11 ? '#FFD84A' : '#cfd8ff' });
    }
    const ph = lerp(x0, x1, (ano - 2012) / 11);
    ctx.fillStyle = '#FFD84A';
    ctx.beginPath(); ctx.moveTo(ph, y - 22); ctx.lineTo(ph - 16, y - 46); ctx.lineTo(ph + 16, y - 46); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // OSD
  const blink = Math.floor(t * 4) % 2 === 0;
  const rotulo = modo === 'REW' ? '◀◀ REW' : modo === 'FF' ? '▶▶ FF' : '▶ PLAY';
  if (modo === 'PLAY' || blink) F.osd(ctx, rotulo, 110, 110, { size: 84 });
  F.flash(ctx, t, D.ano2012, 0.4, 0.75);
  F.flash(ctx, t, 23.6, 0.3, 0.5);
  F.tracking(ctx, t, modo === 'REW' ? 1 : modo === 'FF' ? 0.6 : 0.08, 21);
  // saída
  const o = prog(t, 23.85, 24.0);
  if (o > 0) { ctx.fillStyle = `rgba(0,0,0,${o})`; ctx.fillRect(0, 0, W, H); }
}

// ================================================================== 6. O CANAL: logo + mapa dos 46 municípios (24 – 33)
const PONTOS = (() => {
  const r = rng(46);
  const pts = [{ u: 0.04, v: 0.0 }];
  let tent = 0;
  while (pts.length < 47 && tent < 5000) {
    tent++;
    const u = (r() - 0.5) * 1.9;
    const v = 0.2 * Math.sin(u * 2.4 + 0.5) + (r() - 0.5) * 0.62 * (1 - Math.abs(u) * 0.35);
    if (pts.every((p) => Math.hypot(p.u - u, (p.v - v) * 1.2) > 0.12)) pts.push({ u, v });
  }
  const hub = pts.shift();
  pts.sort((a, b) => Math.hypot(a.u - hub.u, a.v - hub.v) - Math.hypot(b.u - hub.u, b.v - hub.v));
  return { hub, pts: pts.slice(0, 46) };
})();
function projetar(u, v, yaw, cx, cy, esc) {
  const X = u * esc, Z = v * esc;
  const x1 = X * Math.cos(yaw) - Z * Math.sin(yaw), z1 = X * Math.sin(yaw) + Z * Math.cos(yaw);
  const f = 1300 / (1300 + z1 * 0.9);
  return [cx + x1 * f, cy + z1 * 0.58 * f, f];
}
function mapa(ctx, t, D, alpha) {
  if (alpha <= 0) return;
  const yaw = -0.18 + (t - 28.3) * 0.035, cx = 680, cy = 650, esc = 700;
  ctx.save();
  ctx.globalAlpha = alpha;
  // grade
  ctx.strokeStyle = 'rgba(90,160,255,0.22)';
  ctx.lineWidth = 1.5;
  for (let k = -12; k <= 12; k++) {
    ctx.beginPath();
    for (let j = -8; j <= 8; j++) { const [x, y] = projetar(k / 10, j / 10 * 0.9, yaw, cx, cy, esc); j === -8 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let j = -8; j <= 8; j++) {
    ctx.beginPath();
    for (let k = -12; k <= 12; k++) { const [x, y] = projetar(k / 10, j / 10 * 0.9, yaw, cx, cy, esc); k === -12 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // "rio" do vale
  ctx.strokeStyle = 'rgba(80,200,255,0.5)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let k = 0; k <= 60; k++) { const u = -1.05 + k * 0.035, [x, y] = projetar(u, 0.22 * Math.sin(u * 2.4 + 0.5) - 0.02, yaw, cx, cy, esc); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  const [hx, hy] = projetar(PONTOS.hub.u, PONTOS.hub.v, yaw, cx, cy, esc);
  // ondas de sinal
  for (let k = 0; k < 8; k++) {
    const t0 = D.n46 + k * 0.69;
    const p = prog(t, t0, t0 + 2.2);
    if (p <= 0 || p >= 1) continue;
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(hx, hy, p * 700, p * 700 * 0.58, 0, 0, 6.283);
    ctx.stroke();
  }
  const cont = 46 * easeOutCubic(prog(t, D.n46, D.municipios));
  PONTOS.pts.forEach((p, i) => {
    const ap = clamp(cont - i);
    if (ap <= 0) return;
    const [x, y, f] = projetar(p.u, p.v, yaw, cx, cy, esc);
    const c = F.ARCO[i % 10];
    ctx.strokeStyle = c;
    ctx.globalAlpha = alpha * 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lerp(hx, x, ap), lerp(hy, y, ap)); ctx.stroke();
    ctx.globalAlpha = alpha;
    const pulse = 1 + 0.25 * Math.sin(t * 5 + i);
    const r = 11 * f * easeOutBack(ap, 3) * pulse;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 6.283); ctx.fill();
  });
  // torre (o canal)
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(hx - 26, hy); ctx.lineTo(hx, hy - 110); ctx.lineTo(hx + 26, hy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx - 15, hy - 40); ctx.lineTo(hx + 15, hy - 40); ctx.moveTo(hx - 8, hy - 75); ctx.lineTo(hx + 8, hy - 75); ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, hy - 118, 10, 0, 6.283); ctx.fill();
  drawRVA25D(ctx, hx, hy - 170, 120, { depth: 4 });
  ctx.restore();
}
export async function canal(ctx, t) {
  const D = G.D;
  fundoPadrao(ctx, t, { inner: '#13205a', outer: '#02030b', cy: 430, raiosAlpha: 0.05 });
  // fachos de luz de estúdio
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  [[-1, 0.0], [1, 1.7]].forEach(([s, ph]) => {
    const a = Math.sin(t * 0.7 + ph) * 0.35 + s * 0.25;
    const x = W / 2 + s * 520, g = ctx.createLinearGradient(x, 0, x + Math.sin(a) * 900, H);
    g.addColorStop(0, 'rgba(180,200,255,0.16)'); g.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 30, -10); ctx.lineTo(x + 30, -10);
    ctx.lineTo(x + Math.sin(a) * 900 + 260, H + 10); ctx.lineTo(x + Math.sin(a) * 900 - 260, H + 10); ctx.closePath(); ctx.fill();
  });
  ctx.restore();
  // logo: monta e depois vai para o canto
  const mv = easeInOutCubic(prog(t, 28.2, 28.9));
  const lx = lerp(W / 2, 200, mv), ly = lerp(455, 118, mv), lw = lerp(860, 250, mv);
  const stripes = clamp((t - 25.6) / 0.13, 0, 10);
  const [sx, sy] = shakes(t, [[27.1, 0.5, 18]]);
  const s2 = F.snap2.getContext('2d');
  s2.clearRect(0, 0, W, H);
  drawRVA25D(s2, lx + sx, ly + sy, lw, { stripes, r: prog(t, D.rede, D.rede + 0.45), a: prog(t, D.vanguarda2, D.vanguarda2 + 0.45), depth: Math.round(lerp(16, 5, mv)) });
  const pb = prog(t, 27.1, 27.75);
  if (pb > 0 && pb < 1) {
    s2.save();
    s2.globalCompositeOperation = 'source-atop';
    const bx = lerp(lx - lw * 0.7, lx + lw * 0.7, pb);
    const gr = s2.createLinearGradient(bx - 140, 0, bx + 140, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    s2.fillStyle = gr;
    s2.fillRect(bx - 140, 0, 280, H);
    s2.restore();
  }
  if (t > 27.1 && t < 28.0) { ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = 60 * (1 - prog(t, 27.1, 28.0)); ctx.drawImage(F.snap2, 0, 0); ctx.restore(); }
  else ctx.drawImage(F.snap2, 0, 0);
  // textos da 1ª parte
  const a1 = 1 - prog(t, 28.15, 28.45);
  if (a1 > 0) {
    ctx.save();
    ctx.globalAlpha = a1;
    if (t >= D.direto) texto(ctx, 'DIRETO DO CANAL', W / 2, 104, { size: 46, peso: 'd', tracking: 14, anim: 'sobe', lt: t - D.direto, stagger: 0.02, alpha: 0.9 });
    palavras(ctx, t, [['REDE', D.rede], ['VANGUARDA', D.vanguarda2], ['ARQUIVOS', D.arquivos]], W / 2, 830, { size: 104, estilo: 'prata', depth: 10 });
    ctx.restore();
  }
  // mapa + contador
  mapa(ctx, t, D, prog(t, 28.3, 28.9));
  if (t >= D.para) {
    const XR = 1530;
    const a = prog(t, D.para, D.para + 0.3);
    texto(ctx, 'PARA', XR, 300, { size: 64, peso: 'd', anim: 'sobe', lt: t - D.para, alpha: a });
    const v = 46 * easeOutCubic(prog(t, D.n46, D.municipios));
    const cw = medir('0', 300).total * 1.04;
    if (t >= D.n46) odometro(ctx, v, XR + cw, 520, { size: 300, digitos: 2, estilo: 'prata', depth: 18 });
    if (t >= D.municipios) texto(ctx, 'MUNICÍPIOS', XR, 720, { size: 92, estilo: 'arcoiris', depth: 8, anim: 'pop', lt: t - D.municipios, stagger: 0.03 });
  }
  F.flash(ctx, t, 27.1, 0.4, 0.45);
  F.flash(ctx, t, 24.0, 0.25, 0.4);
  const o = prog(t, 32.75, 33.0);
  if (o > 0) F.smear(ctx, o, -1);
}

// ================================================================== 7. PAREDE DE 53 TVs (33 – 37)
export async function canais(ctx, t) {
  const D = G.D;
  F.fundo(ctx, '#0a0f2c', '#010205');
  const { scene, cam, p } = paredeSet();
  const k = easeOutCubic(prog(t, 33.0, 34.4));
  cam.position.set(Math.sin(t * 0.4) * 0.6, lerp(0.0, 0.25, k), lerp(4.2, 9.8, k) + (t - 33) * 0.25);
  cam.lookAt(0, lerp(0.1, -0.85, k), 0);
  const sync = t >= 35.4;
  const noises = [];
  for (const m of p.monitores) {
    if (!m.aceso) continue;
    const tk = D.n53 + (m.ordem / 53) * 0.95;
    const pk = prog(t, tk, tk + 0.1);
    m.tela.scale.y = Math.max(0.02, pk);
    m.vidro.material.opacity = 1 - clamp(pk * 1.5);
    const ts = 35.4 + Math.abs(m.grp.position.x) * 0.03;
    if (sync && t >= ts) { m.tela.material.map = p.syncTex; m.tela.material.color.setScalar(1 + 0.6 * (1 - prog(t, ts, ts + 0.25))); }
    else { m.tela.material.map = m.tex; m.tela.material.color.setScalar(1); if (m.noise) noises.push(m.noise); }
  }
  mexerRuido(noises, t);
  T.draw3D(ctx, scene, cam);
  // faixa escura para o texto
  const g = ctx.createLinearGradient(0, 700, 0, H);
  g.addColorStop(0, 'rgba(0,0,6,0)'); g.addColorStop(0.35, 'rgba(0,0,6,0.85)'); g.addColorStop(1, 'rgba(0,0,6,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 700, W, H - 700);
  const v = 53 * easeOutCubic(prog(t, D.n53, D.n53 + 0.95));
  const sizeN = 240, sizeC = 120;
  const cw = medir('0', sizeN).total * 1.04, wc = medir('CANAIS', sizeC).total;
  const tot = cw * 2 + 40 + wc, x0 = (W - tot) / 2;
  const [sx, sy] = shakes(t, [[D.canais, 0.35, 14]]);
  ctx.save();
  ctx.translate(sx, sy);
  if (t >= D.n53 - 0.05) {
    texto(ctx, 'E', x0 - 90, 880, { size: 90, peso: 'd', anim: 'sobe', lt: t - D.n53 + 0.05 });
    odometro(ctx, v, x0 + cw * 2, 870, { size: sizeN, digitos: 2, estilo: 'prata', depth: 14 });
  }
  if (t >= D.canais) texto(ctx, 'CANAIS', x0 + cw * 2 + 40, 885, { size: sizeC, estilo: 'arcoiris', depth: 10, align: 'left', anim: 'pop', lt: t - D.canais, stagger: 0.03 });
  ctx.restore();
  F.flash(ctx, t, 35.4, 0.4, 0.35);
  const w = easeInCubic(prog(t, 36.6, 37.0));
  if (w > 0) { ctx.fillStyle = `rgba(255,255,255,${w})`; ctx.fillRect(0, 0, W, H); }
}

// ================================================================== 8. SUBIDA: 4 ANOS DE HISTÓRIA (37 – 41)
export async function subida(ctx, t) {
  ctx.fillStyle = '#02030a';
  ctx.fillRect(0, 0, W, H);
  if (t >= 40.85) return;
  const vel = Math.pow(prog(t, 37.2, 40.85), 2);
  F.fundo(ctx, '#121a48', '#010207');
  F.raios(ctx, W / 2, H / 2, t * (1 + vel * 6), { colors: F.ARCO, alpha: 0.05 + vel * 0.08, n: 24 });
  F.estrias(ctx, t, 8, vel, { cores: F.ARCO, n: 160 });
  const amp = 2 + vel * 16;
  const sx = Math.sin(t * 61) * amp, sy = Math.cos(t * 53) * amp;
  const push = 1 + easeInCubic(prog(t, 37.2, 40.6)) * 0.35;
  ctx.save();
  ctx.globalAlpha = 1 - prog(t, 40.3, 40.65);
  ctx.translate(W / 2 + sx, H / 2 + sy);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);
  if (t >= 37.2) texto(ctx, '4 ANOS', W / 2, 470, { size: 280, estilo: 'prata', depth: 20, anim: 'zoom', lt: t - 37.2, stagger: 0.05 });
  if (t >= 37.6) texto(ctx, 'DE HISTÓRIA', W / 2, 700, { size: 120, anim: 'sobe', lt: t - 37.6, stagger: 0.03 });
  ctx.restore();
  F.flash(ctx, t, 37.2, 0.5, 0.9);
  // os 3 arcos passam pela câmera
  const pa = prog(t, 40.15, 40.85);
  if (pa > 0 && pa < 1) {
    const { scene, cam, arcs } = arcosSet();
    arcs.group.scale.setScalar(lerp(0.2, 9, easeInCubic(pa)));
    arcs.group.rotation.set(0.25 * (1 - pa), -0.3 * (1 - pa), -pa * 4);
    T.draw3D(ctx, scene, cam);
  }
}
