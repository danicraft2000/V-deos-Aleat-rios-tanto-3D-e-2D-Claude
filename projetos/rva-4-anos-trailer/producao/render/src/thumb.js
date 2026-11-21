// Thumbnail do YouTube (1920x1080 -> exportada em 1280x720). Mesmas peças do trailer: disco 3D do 4, caixas lacradas,
// Avant Garde com os caracteres especiais e o arco-íris do V. Nada revela o segredo: só "???".
import { W, H } from './util.js';
import * as F from './fx.js';
import { texto } from './tipo.js';
import * as T from './tres.js';
import { discoSet, segredoSet } from './comum.js';
import { drawRVA25D } from '/rva-4-anos/producao/render/src/logos.js';

function disco4(ctx, x, y, s, rx, ry) {
  const { scene, cam, disk, arcs, L } = discoSet();
  arcs.group.visible = false;
  disk.group.visible = true;
  disk.pieces.forEach((p) => { p.mesh.visible = true; p.mesh.position.set(p.cx, p.cy, 0); p.mesh.rotation.set(0, 0, 0); });
  disk.logo.visible = true;
  disk.logo.scale.setScalar(1);
  disk.group.position.set(x, y, 0);
  disk.group.scale.setScalar(s);
  disk.group.rotation.set(rx, ry, 0);
  scene.environmentRotation.y = 1.3;
  L.key.position.set(-4, 5, 6);
  cam.position.set(0, 0, 9.2);
  cam.lookAt(0, 0, 0);
  T.draw3D(ctx, scene, cam);
}

function halo(ctx, x, y, r, a = 0.4, cor = '255,255,255') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${cor},${a})`);
  g.addColorStop(1, `rgba(${cor},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Faixa vermelha "CONFIDENCIAL" atravessando. */
function faixa(ctx, cx, cy, w, ang, txt, size = 46) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#e0102f';
  ctx.fillRect(-w / 2, -size * 0.95, w, size * 1.9);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-w / 2, -size * 0.95, w, 5);
  ctx.fillRect(-w / 2, size * 0.95 - 5, w, 5);
  texto(ctx, txt, 0, 0, { size, depth: 0, sombra: false, tracking: 6 });
  ctx.restore();
}

// ------------------------------------------------------------------ opção A: disco do 4 + "4 ANOS" + "???"
async function opcaoA(ctx) {
  F.fundo(ctx, '#1d2f8c', '#02030c', 470, 540, 1400);
  // faixas do arco-íris à direita, num corte diagonal
  ctx.save();
  ctx.beginPath(); ctx.moveTo(1010, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(860, H); ctx.closePath(); ctx.clip();
  F.faixasFundo(ctx, 0.37, { bh: 96, ang: -0.42, vel: 0 });
  const gd = ctx.createLinearGradient(860, 0, W, 0);
  gd.addColorStop(0, 'rgba(3,4,18,0.88)'); gd.addColorStop(1, 'rgba(3,4,18,0.62)');
  ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // borda luminosa do corte
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6; ctx.shadowColor = '#9fd0ff'; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.moveTo(1010, 0); ctx.lineTo(860, H); ctx.stroke();
  ctx.restore();
  F.raios(ctx, 470, 540, 3.0, { colors: F.ARCO, alpha: 0.2, n: 26, len: 1100 });
  F.bokeh(ctx, 2.0, 41, { alpha: 0.22, n: 18 });
  halo(ctx, 470, 540, 520, 0.45);
  disco4(ctx, -2.2, 0.0, 1.62, 0.06, 0.3);
  F.brilhos(ctx, 1.0, 7, { n: 60, alpha: 0.7 });
  // textos
  const X = 1440;
  F.pilula(ctx, 'TRAILER OFICIAL', X, 160, { size: 64, bg: '#e0102f', raio: 18 });
  texto(ctx, '4 ANOS', X, 375, { size: 218, estilo: 'prata', depth: 18, contorno: 10, glow: 'rgba(120,170,255,0.55)', glowBlur: 60 });
  halo(ctx, X, 700, 380, 0.25, '255,220,255');
  texto(ctx, '???', X, 700, { size: 330, estilo: 'arcoiris', depth: 20, contorno: 12, glow: 'rgba(255,255,255,0.7)', glowBlur: 70 });
  faixa(ctx, X, 842, 860, -0.07, 'LANÇAMENTO SECRETO', 42);
  texto(ctx, 'REDE VANGUARDA ARQUIVOS', X, 975, { size: 52, peso: 'b', depth: 4, contorno: 4, tracking: 2 });
}

// ------------------------------------------------------------------ opção B: as caixas lacradas + "4 ANOS"
async function opcaoB(ctx) {
  F.fundo(ctx, '#141838', '#000000', 1300, 520, 1300);
  const { scene, cam, s } = segredoSet();
  s.spot.intensity = 170;
  cam.position.set(-1.05, 0.35, 4.3);
  cam.lookAt(-0.95, 0.12, 0);
  s.caixas.forEach((c, i) => { c.rotation.z = i ? 0.035 : -0.03; c.position.y = 0; });
  s.cadeados.forEach((c, i) => { c.rotation.z = i ? -0.08 : 0.06; });
  s.vazamentos.forEach((ls) => ls.forEach((m) => { m.material.opacity = 1; m.scale.x = 3.2; }));
  s.luzRara.intensity = 12;
  s.luzRara.color.setHSL(0.83, 0.9, 0.62);
  halo(ctx, 1330, 520, 700, 0.35, '255,200,255');
  T.draw3D(ctx, scene, cam);
  // feixe do spot
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gb = ctx.createLinearGradient(0, 0, 0, H);
  gb.addColorStop(0, 'rgba(255,240,210,0.2)'); gb.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = gb;
  ctx.beginPath(); ctx.moveTo(1270, 0); ctx.lineTo(1390, 0); ctx.lineTo(1980, H); ctx.lineTo(680, H); ctx.closePath(); ctx.fill();
  ctx.restore();
  F.brilhos(ctx, 1.0, 71, { n: 70, alpha: 0.6, color: '#ffe9c8' });
  // pontos de interrogação flutuando
  [[1010, 150, 70, -0.3], [1760, 210, 90, 0.25], [1880, 640, 60, 0.4], [930, 880, 56, -0.2]].forEach(([x, y, sz, r], i) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r);
    texto(ctx, '?', 0, 0, { size: sz, estilo: i % 2 ? 'arcoiris' : 'branco', depth: 4, glow: 'rgba(255,255,255,0.7)' });
    ctx.restore();
  });
  // escurece a esquerda para o texto
  const gl = ctx.createLinearGradient(0, 0, 980, 0);
  gl.addColorStop(0, 'rgba(2,3,14,0.92)'); gl.addColorStop(0.75, 'rgba(2,3,14,0.55)'); gl.addColorStop(1, 'rgba(2,3,14,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, 980, H);
  const X = 485;
  drawRVA25D(ctx, X, 150, 300, { depth: 8 });
  texto(ctx, '4 ANOS', X, 420, { size: 205, estilo: 'prata', depth: 16, contorno: 10, glow: 'rgba(120,170,255,0.5)', glowBlur: 50 });
  texto(ctx, 'LANÇAMENTO', X, 640, { size: 104, depth: 8, contorno: 8 });
  texto(ctx, 'SECRETO', X, 790, { size: 150, estilo: 'arcoiris', depth: 12, contorno: 10, glow: 'rgba(255,255,255,0.45)' });
  F.pilula(ctx, 'TRAILER OFICIAL', X, 960, { size: 56, bg: '#e0102f', raio: 16 });
}

export async function thumb(ctx, opcao = 'A') {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  await (opcao === 'B' ? opcaoB : opcaoA)(ctx);
  F.vhs(ctx, 0.5, { noise: 0.035, scan: 0.08, vig: 0.75 });
}
