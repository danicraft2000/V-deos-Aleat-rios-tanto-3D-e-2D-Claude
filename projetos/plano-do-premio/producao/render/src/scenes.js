// As 14 cenas do vídeo "Plano do Prêmio". Cada cena desenha o quadro do tempo t (segundos absolutos).
// Os tempos vêm das falas (E.f('n02a') = início da fala n02a), então mudar a narração reposiciona tudo.
import * as F from './fx.js';
import { COR } from './fx.js';
import { W, H, clamp, lerp, prog, easeOutBack, easeOutCubic, easeInOutCubic, easeInCubic, shake, rng, canvas, brl } from './util.js';
import * as T from './three3d.js';
const { THREE } = T;

const S = {};
// cores para objetos 3D (mais escuras: a luz e o verniz clareiam)
const C3 = { reserva: '#08a87d', pai: '#e3245f', proj: '#2f5be0' };
const lazy = (k, fn) => (S[k] ??= fn());
const ap = (t, t0, d = 0.4) => clamp((t - t0) / d);

export const CAPITULOS = {
  premio: [1, 'O PRÊMIO'], avisos: [2, 'ANTES DE GASTAR'], lista: [3, 'SUA LISTA'],
  pai: [4, 'PRESENTE DO PAI'], dicas: [4, 'PRESENTE DO PAI'], vale: [4, 'PRESENTE DO PAI'],
  regra: [5, 'REGRA 20 · 50 · 30'], caixa: [6, 'RESERVA NA CAIXA'], trilhas: [7, 'TRILHAS DA VANGUARDA'],
  flipaclip: [8, 'FLIPACLIP E TABLET'], tablet: [8, 'FLIPACLIP E TABLET'], cenarios: [9, 'E SE VIER MENOR?'],
};

// ------------------------------------------------------------------ apoio
function pose(cam, t, keys) {
  let p = keys[0].p, l = keys[0].l;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const e = easeInOutCubic(prog(t, k.a, k.b));
    if (e <= 0) break;
    p = p.map((v, j) => lerp(v, k.p[j], e));
    l = l.map((v, j) => lerp(v, k.l[j], e));
  }
  cam.position.set(p[0], p[1], p[2]);
  cam.lookAt(l[0], l[1], l[2]);
}
function txt(x, str, X, Y, size, o = {}) {
  x.save();
  x.font = F.font(size, o.weight ?? 800, o.fam ?? 'Montserrat');
  x.fillStyle = o.color ?? '#fff';
  x.textAlign = o.align ?? 'left';
  x.textBaseline = o.base ?? 'middle';
  x.fillText(str, X, Y);
  const w = x.measureText(str).width;
  x.restore();
  return w;
}
function contain(x, img, X, Y, w, h) {
  const s = Math.min(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  x.drawImage(img, X + (w - iw) / 2, Y + (h - ih) / 2, iw, ih);
}
function cover(x, img, X, Y, w, h, r = 0) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  x.save();
  if (r) { F.roundRect(x, X, Y, w, h, r); x.clip(); }
  x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, X, Y, w, h);
  x.restore();
}
/** Etiqueta presa a um ponto 3D (projetado). */
function etiqueta(ctx, cam, pos, desenhar) {
  const p = T.proj(cam, pos[0], pos[1], pos[2]);
  ctx.save();
  ctx.translate(p.x, p.y);
  desenhar(ctx);
  ctx.restore();
}
/** Linha do tempo de entrada/saída: alpha de um elemento entre a e b. */
const vis = (t, a, b = Infinity, d = 0.3) => Math.min(clamp((t - a) / d), clamp((b - t) / d));

// ================================================================== 1. ABERTURA
function setTrofeu() {
  return lazy('trofeu', () => {
    const scene = T.newScene();
    const cam = T.camera(35);
    const tr = T.trofeu();
    scene.add(tr);
    const pi = T.piso(9);
    pi.position.y = 0.001;
    scene.add(pi);
    const sh = T.sombra(2.6, 2.6, 0.9);
    sh.position.y = 0.01;
    scene.add(sh);
    const N = 46;
    const m = T.moedas(N, 0.3, 0.055);
    scene.add(m.mesh);
    const r = rng(11);
    const dados = [...Array(N)].map(() => ({ x: -6.0 + r() * 8.0, z: -3 + r() * 3.5, sp: 0.5 + r() * 0.7, ph: r() * 10, rx: r() * 6, rv: 0.8 + r() * 2.5, rz: r() * 6 }));
    const L = T.luzes(scene, { key: 2.6, rim: 2.8, warm: 40 });
    const grupo = new THREE.Group();
    grupo.add(tr, pi, sh);
    scene.add(grupo);
    return { scene, cam, tr, m, dados, grupo, L, N };
  });
}
function desenhaTrofeu(ctx, t, cx, o = {}) {
  const s = setTrofeu();
  s.grupo.position.x = cx;
  s.tr.rotation.y = t * 0.45;
  const N = s.N;
  for (let i = 0; i < N; i++) {
    const d = s.dados[i];
    if (i < 30) {
      const y = 6.5 - ((t * d.sp + d.ph) % 8.5);
      s.m.set(i, cx + d.x, y, d.z - 1, d.rx + t * d.rv, d.rz + t * 0.7, o.chuva ?? 1);
    } else {
      const k = i - 30, a = t * 0.7 + (k / 16) * Math.PI * 2;
      s.m.set(i, cx + Math.cos(a) * 1.75, 1.5 + Math.sin(a * 2 + k) * 0.25, Math.sin(a) * 1.75, Math.PI / 2, 0, 1.15, -a);
    }
  }
  s.m.done();
  T.draw3D(ctx, s.scene, s.cam);
}

async function abertura(ctx, t, E) {
  F.fundo(ctx, t, { tint: 'rgba(255,190,60,0.16)' });
  const s = setTrofeu();
  const p = clamp(t / 12);
  s.cam.position.set(0.2 + Math.sin(t * 0.25) * 0.4, 1.9, 10.5 - p * 1.2);
  s.cam.lookAt(1.2, 1.45, 0);
  desenhaTrofeu(ctx, t, 4.1);
  F.brilhos(ctx, t, 3, { n: 40, color: '#ffe7a0', alpha: 0.6 });

  const X = 560;
  F.pill(ctx, 'EMPREENDA 2026 · GRANDE FINAL', X, 300, { size: 28, dot: COR.ouro, alpha: vis(t, 0.5), scale: lerp(0.8, 1, easeOutBack(ap(t, 0.5))) });
  F.titulo(ctx, t, 'PLANO DO', X, 425, { at: 0.8, size: 118, fill: '#fff' });
  F.titulo(ctx, t, 'PRÊMIO', X, 560, { at: 1.0, size: 176, fill: COR.ouro, glow: 'rgba(255,200,58,0.5)' });
  const n1 = E.f('n01a'), n2 = E.f('n01b');
  F.pill(ctx, 'FEITO PRA VOCÊ, DANIEL', X, 700, { size: 34, bg: 'rgba(255,200,58,0.16)', border: COR.ouro, color: COR.ouro, alpha: vis(t, n1 + 0.4), scale: lerp(0.6, 1, easeOutBack(ap(t, n1 + 0.4), 2.5)) });
  F.pill(ctx, 'RVA · REMAKE VINTAGE ARCHIVES', X, 790, { size: 26, dot: COR.proj, alpha: vis(t, n2 + 1.6) });
  F.pill(ctx, 'CABEÇA FRIA', X - 165, 868, { size: 26, dot: '#7fd4ff', alpha: vis(t, n2 + 4.6) * 1, scale: lerp(0.6, 1, easeOutBack(ap(t, n2 + 4.6), 2.5)) });
  F.pill(ctx, 'CORAÇÃO QUENTE', X + 150, 868, { size: 26, dot: COR.pai, alpha: vis(t, n2 + 5.8), scale: lerp(0.6, 1, easeOutBack(ap(t, n2 + 5.8), 2.5)) });
}

// ================================================================== 2. O PRÊMIO
const STACK_X = [-2.85, -0.95, 0.95, 2.85];
const NOMES = ['DANIEL', 'GABRIEL', 'VITOR', 'CLEBER'];
function setPremio() {
  return lazy('premio', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    const m = T.moedas(55, 0.42, 0.095);
    scene.add(m.mesh);
    const pi = T.piso(10);
    scene.add(pi);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: COR.ouro, toneMapped: false, transparent: true, depthWrite: false }));
    halo.rotation.x = Math.PI / 2;
    halo.position.set(STACK_X[0], 0.02, 0);
    scene.add(halo);
    const sombras = [-1.3, 1.3, ...STACK_X].map((x) => { const s = T.sombra(1.6, 1.6, 0.0); s.position.set(x, 0.005, 0); scene.add(s); return s; });
    const luz = new THREE.PointLight(COR.ouro, 0, 6, 1.5);
    luz.position.set(STACK_X[0], 2.6, 1.0);
    scene.add(luz);
    T.luzes(scene, { key: 2.4, rim: 2.2, warm: 30 });
    return { scene, cam, m, halo, sombras, luz };
  });
}
async function premio(ctx, t, E) {
  F.fundo(ctx, t, { tint: 'rgba(255,190,60,0.12)' });
  const s = setPremio();
  const a = E.f('n02a'), b = E.f('n02b'), c = E.f('n02c'), d = E.f('n02d');
  const lt = t - a;
  s.cam.position.set(Math.sin(lt * 0.12) * 1.4, 3.3, 12.6);
  s.cam.lookAt(0, 1.75, 0);
  const DY = 0.095;
  for (let i = 0; i < 55; i++) {
    const naA = i < 35;
    const lvl0 = naA ? i : i - 35;
    const x0 = naA ? -1.3 : 1.3, y0 = 0.05 + lvl0 * DY;
    const tin = naA ? a + 0.2 + i * 0.045 : b + 0.15 + (i - 35) * 0.05;
    const k = i % 4, lvl1 = Math.floor(i / 4);
    const x1 = STACK_X[k], y1 = 0.05 + lvl1 * DY;
    const tj = c + 0.1 + i * 0.016;
    let x = x0, y = y0, z = 0, rx = 0, sc = 1;
    if (t < tin) { sc = 0; }
    else if (t < tin + 0.3) { const p = (t - tin) / 0.3; y = y0 + (1 - easeInCubic(p)) * 3; }
    if (t >= tj) {
      const p = easeInOutCubic(clamp((t - tj) / 0.55));
      x = lerp(x0, x1, p);
      y = lerp(y0, y1, p) + Math.sin(Math.PI * p) * 1.3;
      z = Math.sin(Math.PI * p) * 0.6;
      rx = p * Math.PI * 2;
    }
    if (k === 0 && t > d) y += Math.sin(clamp((t - d) / 0.5) * Math.PI) * 0.12;
    s.m.set(i, x + Math.sin(i * 12.9898) * 0.025, y, z + Math.cos(i * 78.233) * 0.025, rx, Math.sin(i * 3.1) * 0.02, sc, i * 0.7);
  }
  s.m.done();
  const pj = ap(t, c + 0.3, 0.6);
  s.sombras[0].material.opacity = 0.8 * vis(t, a, c + 0.3);
  s.sombras[1].material.opacity = 0.8 * vis(t, b, c + 0.3);
  for (let k = 0; k < 4; k++) s.sombras[2 + k].material.opacity = 0.8 * pj;
  const glow = ap(t, d, 0.5);
  s.halo.material.opacity = glow * (0.75 + 0.25 * Math.sin(t * 5));
  s.halo.visible = glow > 0;
  s.halo.scale.setScalar(1 + 0.05 * Math.sin(t * 3));
  s.luz.intensity = glow * 18;
  T.draw3D(ctx, s.scene, s.cam);

  // etiquetas das pilhas iniciais
  const fimA = c + 0.2;
  if (t < fimA + 0.3) {
    etiqueta(ctx, s.cam, [-1.3, 35 * DY + 0.5, 0], (x) => {
      x.globalAlpha = vis(t, a + 0.3, fimA);
      F.pill(x, '1º LUGAR', 0, -70, { size: 26, bg: COR.ouro, color: '#1a1200' });
      F.contador(x, t - a - 0.3, 35000, 0, 0, { size: 54, fill: '#fff', dur: 1.6, step: 50 });
    });
    etiqueta(ctx, s.cam, [1.3, 20 * DY + 0.5, 0], (x) => {
      x.globalAlpha = vis(t, b + 0.3, fimA);
      F.pill(x, 'VOTO POPULAR', 0, -70, { size: 26, bg: COR.pai, color: '#fff' });
      F.contador(x, t - b - 0.3, 20000, 0, 0, { size: 54, fill: '#fff', dur: 1.2, step: 50 });
    });
  }
  // total e divisão
  const tt = b + 2.0;
  F.titulo(ctx, t, 'TOTAL: R$ 55.000', W / 2, 150, { at: tt, out: c + 0.1, size: 74, fill: COR.ouro });
  F.titulo(ctx, t, 'R$ 55.000 ÷ 4', W / 2, 150, { at: c + 0.25, out: d - 0.1, size: 74, fill: '#fff' });
  F.titulo(ctx, t, 'R$ 13.750 PRA CADA UM', W / 2, 150, { at: d, size: 74, fill: COR.ouro, glow: 'rgba(255,200,58,0.45)' });
  // nomes
  const tn = [c + 1.25, c + 1.85, c + 2.4, c + 2.9];
  for (let k = 0; k < 4; k++) {
    etiqueta(ctx, s.cam, [STACK_X[k], -0.05, 0.9], (x) => {
      const al = ap(t, tn[k], 0.25);
      if (al <= 0) return;
      const eu = k === 0;
      F.pill(x, eu ? 'DANIEL (VOCÊ)' : NOMES[k], 0, 40, { size: 28, alpha: al, scale: lerp(0.5, 1, easeOutBack(al, 2.5)), bg: eu ? COR.ouro : 'rgba(12,16,44,0.88)', color: eu ? '#1a1200' : '#fff', border: eu ? null : 'rgba(255,255,255,0.25)' });
    });
    etiqueta(ctx, s.cam, [STACK_X[k], (k < 3 ? 14 : 13) * DY + 0.45, 0], (x) => {
      const lt2 = t - d - 0.3 - k * 0.12;
      if (lt2 < 0) return;
      F.contador(x, lt2, 13750, 0, 0, { size: k === 0 ? 50 : 40, fill: k === 0 ? COR.ouro : '#fff', dur: 0.9, step: 10, glow: k === 0 ? 'rgba(255,200,58,0.6)' : null });
    });
  }
}

// ================================================================== 3. TRÊS AVISOS
function desenhaAviso(x, w, h, o) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#232a6a');
  g.addColorStop(1, '#10143c');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.fillStyle = o.cor;
  x.fillRect(0, 0, w, 14);
  // número
  x.fillStyle = o.cor;
  x.beginPath(); x.arc(70, 84, 40, 0, 6.283); x.fill();
  txt(x, String(o.num), 70, 87, 46, { weight: 900, color: '#0b1030', align: 'center' });
  o.icone(x, w - 90, 92, 96, o.cor);
  x.font = F.font(56, 900);
  const tam = Math.min(56, Math.floor(56 * (w - 80) / Math.max(...o.titulo.map((l) => x.measureText(l).width))));
  o.titulo.forEach((l, i) => txt(x, l, 40, 200 + i * 66, tam, { weight: 900, color: i === 0 ? '#fff' : o.cor }));
  let y = 360;
  for (const l of o.linhas) {
    if (l.riscado) {
      const lw = txt(x, l.t, 40, y, 46, { weight: 800, color: '#8d94b8' });
      x.strokeStyle = COR.alerta; x.lineWidth = 6;
      x.beginPath(); x.moveTo(34, y + 2); x.lineTo(46 + lw, y + 2); x.stroke();
      y += 70;
      continue;
    }
    txt(x, l.t, 40, y, l.size ?? 42, { weight: l.weight ?? 700, color: l.color ?? '#dfe3f7' });
    y += (l.size ?? 42) * 1.5;
  }
}
function setAvisos() {
  return lazy('avisos', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    const defs = [
      { num: 1, cor: COR.ouro, icone: F.iconeCalendario, titulo: ['NÃO GASTE', 'ANTES DE GANHAR'],
        linhas: [{ t: 'Final: 26/11/2026' }, { t: 'Pix: janeiro de 2027' }, { t: '' , size: 14 }, { t: 'Nada de parcelar', weight: 800, color: '#fff' }, { t: 'contando com o prêmio.', weight: 800, color: '#fff' }] },
      { num: 2, cor: COR.pai, icone: F.iconeRecibo, titulo: ['BRUTO OU', 'LÍQUIDO?'],
        linhas: [{ t: 'Prêmio pode ter IR' }, { t: 'retido na fonte.' }, { t: '', size: 10 }, { t: 'R$ 13.750', riscado: true }, { t: 'R$ 9.625', size: 72, weight: 900, color: COR.pai }, { t: 'no pior caso (30%)', size: 34, color: '#aeb6d9' }] },
      { num: 3, cor: COR.reserva, icone: F.iconeRaio, titulo: ['PIX', 'SEM TAXA'],
        linhas: [{ t: 'Pix entre pessoas' }, { t: 'é de graça.' }, { t: '', size: 14 }, { t: 'Recebeu em jan/2027:', weight: 800, color: '#fff' }, { t: 'declara no IR de 2028.', weight: 800, color: '#fff' }] },
    ];
    const cards = defs.map((d) => {
      const c = canvas(600, 780);
      desenhaAviso(c.getContext('2d'), 600, 780, d);
      const k = T.cartao(3.0, 3.9, c, { corpo: '#1b2152' });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 4.2), new THREE.MeshBasicMaterial({ color: d.cor, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
      glow.position.z = -0.12;
      k.group.add(glow);
      scene.add(k.group);
      return { ...k, glow };
    });
    T.luzes(scene, { key: 2.0, rim: 1.6 });
    return { scene, cam, cards };
  });
}
async function avisos(ctx, t, E) {
  F.fundo(ctx, t, {});
  const s = setAvisos();
  const ts = [E.f('n03b'), E.f('n03c'), E.f('n03d')];
  s.cam.position.set(Math.sin(t * 0.2) * 0.4, 0.1, 13.2);
  s.cam.lookAt(0, -0.05, 0);
  let ativo = -1;
  ts.forEach((tk, i) => { if (t >= tk - 0.2) ativo = i; });
  s.cards.forEach((k, i) => {
    const p = clamp((t - (ts[i] - 0.25)) / 0.75);
    const e = easeOutBack(p, 1.3);
    const g = k.group;
    g.visible = p > 0;
    const x = (i - 1) * 3.45;
    g.position.set(x + (1 - e) * 3, -0.1 + (1 - easeOutCubic(p)) * -1.5, (1 - easeOutCubic(p)) * -3 + (i === ativo ? 0.35 : 0));
    g.rotation.set(0, (1 - e) * 1.6 + Math.sin(t * 0.8 + i) * 0.04, (1 - e) * -0.2);
    const sc = i === ativo ? 1.04 : 0.97;
    g.scale.setScalar(sc);
    k.glow.material.opacity = (i === ativo ? 0.35 + 0.1 * Math.sin(t * 4) : 0) * p;
    k.glow.visible = k.glow.material.opacity > 0.001;
    k.frente.material.color.setScalar(i === ativo || ativo === -1 ? 1 : 0.62);
  });
  T.draw3D(ctx, s.scene, s.cam);
  F.titulo(ctx, t, 'ANTES DE GASTAR: 3 AVISOS', W / 2, 128, { at: E.f('n03a') - 0.2, size: 66, fill: '#fff' });
}

// ================================================================== 4. SUA LISTA
const ITENS = [
  { nome: '5 PlayStation (usados)', valor: 6800, cor: COR.pai, rot: '~R$ 6.800' },
  { nome: 'Galaxy Tab S11 Ultra', valor: 7000, cor: COR.proj, rot: '~R$ 7.000' },
  { nome: 'Freelancer das trilhas', valor: 1000, cor: COR.roxo, rot: 'até R$ 1.000' },
  { nome: 'FlipaClip (1 ano)', valor: 99, cor: '#FF9F1C', rot: 'R$ 99' },
];
const BAR_MAX = 16000, BAR_LEN = 11, BAR_X0 = -5.5;
const bx = (v) => BAR_X0 + (v / BAR_MAX) * BAR_LEN;
function setLista() {
  return lazy('lista', () => {
    const scene = T.newScene();
    const cam = T.camera(30);
    const trilho = new THREE.Mesh(new THREE.BoxGeometry(BAR_LEN + 0.2, 0.62, 0.62), new THREE.MeshPhysicalMaterial({ color: '#2a336f', roughness: 0.1, transparent: true, opacity: 0.35 }));
    trilho.position.set(0, 0.31, 0);
    scene.add(trilho);
    const segs = ITENS.map((it) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.5), T.brilhante(it.cor));
      m.position.y = 0.31;
      scene.add(m);
      return m;
    });
    const marco = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.8), new THREE.MeshBasicMaterial({ color: COR.ouro, toneMapped: false }));
    marco.position.set(bx(13750), 0.5, 0);
    scene.add(marco);
    const excesso = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 0.7), new THREE.MeshBasicMaterial({ color: COR.alerta, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    excesso.position.set((bx(13750) + bx(14899)) / 2, 0.31, 0);
    excesso.scale.x = bx(14899) - bx(13750);
    scene.add(excesso);
    const pi = T.piso(12);
    pi.position.y = -0.01;
    scene.add(pi);
    T.luzes(scene, { key: 2.3, rim: 2.0 });
    return { scene, cam, segs, excesso, marco };
  });
}
function tile(ctx, E, i, x, y, w, h, al, e) {
  if (al <= 0) return;
  const it = ITENS[i];
  ctx.save();
  ctx.globalAlpha = al;
  ctx.translate(x + w / 2, y + h / 2 + (1 - e) * 60);
  ctx.scale(lerp(0.7, 1, e), lerp(0.7, 1, e));
  ctx.translate(-w / 2, -h / 2);
  F.painel(ctx, 0, 0, w, h, { r: 26, accent: it.cor });
  const ih = 190;
  ctx.save();
  F.roundRect(ctx, 22, 18, w - 40, ih, 18);
  ctx.clip();
  if (i === 0) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(22, 18, w - 40, ih);
    ['ps1', 'ps2', 'ps3', 'ps4', 'ps5'].forEach((n, k) => contain(ctx, E.img[n], 26 + k * 66 - 10, 30 + (k % 2) * 50, 150, 105));
  } else if (i === 1) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(22, 18, w - 40, ih);
    contain(ctx, E.img.tablet, 30, 22, w - 56, ih - 8);
  } else {
    const g = ctx.createLinearGradient(0, 18, 0, 18 + ih);
    g.addColorStop(0, it.cor);
    g.addColorStop(1, '#141a46');
    ctx.fillStyle = g;
    ctx.fillRect(22, 18, w - 40, ih);
    if (i === 2) {
      F.iconeNota(ctx, w / 2 - 70, 18 + ih / 2, 110, '#fff');
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let k = 0; k < 24; k++) { const xx = w / 2 + 10 + k * 6, a = Math.sin(k * 1.7) * 30 * Math.sin((k / 24) * Math.PI); ctx.moveTo(xx, 18 + ih / 2 - a); ctx.lineTo(xx, 18 + ih / 2 + a); }
      ctx.stroke();
    } else {
      F.iconeLapis(ctx, w / 2, 18 + ih / 2, 140, '#fff');
    }
  }
  ctx.restore();
  txt(ctx, it.nome, 28, ih + 52, 27, { weight: 800 });
  txt(ctx, it.rot, 28, ih + 100, 40, { weight: 900, color: COR.ouro });
  ctx.restore();
}
async function lista(ctx, t, E) {
  F.fundo(ctx, t, {});
  const s = setLista();
  const tI = [E.f('n04b'), E.f('n04c'), E.f('n04d'), E.f('n04d') + 2.0];
  const tE = E.f('n04e');
  s.cam.position.set(0, 3.0, 13.5);
  s.cam.lookAt(0, 1.75, 0);
  let acc = 0;
  s.segs.forEach((m, i) => {
    const p = easeOutCubic(clamp((t - tI[i] - 0.3) / 0.7));
    const len = (ITENS[i].valor / BAR_MAX) * BAR_LEN * p;
    m.visible = p > 0.001;
    m.scale.x = Math.max(0.001, len);
    m.position.x = bx(acc) + len / 2;
    acc += ITENS[i].valor * p;
  });
  const pe = ap(t, tE + 1.0, 0.3);
  s.excesso.material.opacity = pe * (0.35 + 0.2 * Math.sin(t * 8));
  s.excesso.visible = pe > 0;
  const [sx, sy] = shake(t, tE + 1.0, 0.4, 10);
  ctx.save();
  ctx.translate(sx, sy);
  T.draw3D(ctx, s.scene, s.cam);
  ctx.restore();
  // título
  F.titulo(ctx, t, 'SUA LISTA DE DESEJOS', W / 2, 118, { at: E.f('n04a') - 0.2, size: 64 });
  // cartões dos itens
  const tw = 400, th = 300, gap = 40, x0 = (W - (4 * tw + 3 * gap)) / 2;
  for (let i = 0; i < 4; i++) {
    const p = ap(t, tI[i], 0.45);
    tile(ctx, E, i, x0 + i * (tw + gap), 190, tw, th, p, easeOutBack(p, 1.6));
  }
  // marco do prêmio
  etiqueta(ctx, s.cam, [bx(13750), 1.35, 0], (x) => {
    x.globalAlpha = vis(t, tI[0]);
    F.pill(x, 'SEU PRÊMIO: R$ 13.750', 0, -20, { size: 26, bg: COR.ouro, color: '#1a1200' });
  });
  // soma corrente
  const soma = ITENS.reduce((a2, it, i) => a2 + it.valor * easeOutCubic(clamp((t - tI[i] - 0.3) / 0.7)), 0);
  if (soma > 1) {
    etiqueta(ctx, s.cam, [bx(soma), -0.35, 0.4], (x) => {
      const over = soma > 13750;
      F.pill(x, 'TOTAL: ' + brl(Math.round(soma)), 0, 30, { size: 30, bg: over ? COR.alerta : 'rgba(12,16,44,0.9)', color: '#fff', border: over ? null : 'rgba(255,255,255,0.3)' });
    });
  }
  F.carimbo(ctx, t - tE - 1.0, 'NÃO CABE TUDO!', 560, 590, { size: 58, rot: -0.08 });
  F.pill(ctx, 'RESERVA: R$ 0', 1100, 590, { size: 34, bg: 'rgba(255,75,75,0.18)', border: COR.alerta, color: '#ffb3b3', alpha: vis(t, tE + 2.4), scale: lerp(0.5, 1, easeOutBack(ap(t, tE + 2.4), 2.5)) });
}

// ================================================================== 5. PRESENTE DO PAI
const CONSOLES = [
  { id: 'ps1', nome: 'PLAYSTATION 1', ano: '1994', preco: 700, cor: '#B9BED6' },
  { id: 'ps2', nome: 'PLAYSTATION 2', ano: '2000', preco: 500, cor: COR.xis },
  { id: 'ps3', nome: 'PLAYSTATION 3', ano: '2006', preco: 650, cor: COR.cir },
  { id: 'ps4', nome: 'PLAYSTATION 4', ano: '2013', preco: 1100, cor: COR.tri },
  { id: 'ps5', nome: 'PLAYSTATION 5', ano: '2020', preco: 3200, cor: COR.qua },
];
const PX = [-5.5, -2.75, 0, 2.75, 5.5];
const PZ = PX.map((x) => -Math.abs(x) * 0.32);
function setPai(E) {
  return lazy('pai', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    const itens = CONSOLES.map((c, i) => {
      const cv = canvas(800, 780), x = cv.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, 800, 780);
      contain(x, E.img[c.id], 20, 10, 760, 540);
      const g = x.createLinearGradient(0, 560, 0, 780);
      g.addColorStop(0, '#1c2360');
      g.addColorStop(1, '#0e1238');
      x.fillStyle = g;
      x.fillRect(0, 560, 800, 220);
      x.fillStyle = c.cor;
      x.fillRect(0, 560, 800, 10);
      txt(x, c.nome, 36, 625, 48, { weight: 900 });
      txt(x, c.ano, 764, 625, 48, { weight: 900, color: c.cor, align: 'right' });
      txt(x, '~' + brl(c.preco) + ' (usado)', 36, 705, 44, { weight: 800, color: COR.ouro });
      const k = T.cartao(2.25, 2.25 * 780 / 800, cv, { corpo: '#1b2152' });
      const ped = T.pedestal(c.cor);
      ped.group.position.set(PX[i], 0, PZ[i]);
      scene.add(ped.group, k.group);
      const sh = T.sombra(2.4, 1.4, 0.7);
      sh.position.set(PX[i], 0.44, PZ[i] + 0.1);
      scene.add(sh);
      return { ...k, ped, sh };
    });
    const pi = T.piso(16, '#ff4d8d');
    scene.add(pi);
    T.luzes(scene, { key: 2.2, rim: 2.2, rimColor: '#ff7ab0', warm: 30 });
    return { scene, cam, itens };
  });
}
function poseLargaPai(t) {
  return { p: [Math.sin(t * 0.2) * 0.8, 3.0, 13.6], l: [0, 1.25, 0] };
}
function desenhaPai(ctx, t, E, mostrar, cam) {
  const s = setPai(E);
  const ids = ['n05b', 'n05c', 'n05d', 'n05e', 'n05f'];
  s.itens.forEach((k, i) => {
    const tk = mostrar ? E.f(ids[i]) - 0.1 : -1e9;
    const p = clamp((t - tk) / 0.7);
    const e = easeOutBack(p, 1.8);
    k.group.visible = p > 0;
    k.group.scale.setScalar(Math.max(0.001, e));
    k.group.position.set(PX[i], 0.45 + 1.18 + (1 - easeOutCubic(p)) * -0.6 + Math.sin(t * 1.2 + i) * 0.05, PZ[i]);
    k.group.rotation.y = -PX[i] * 0.05 + Math.sin(t * 0.7 + i) * 0.06;
    k.ped.anelMat.color.set(p > 0 ? CONSOLES[i].cor : '#3a4070');
    k.sh.material.opacity = 0.6 * p;
  });
  if (cam) s.cam.copy(cam);
  T.draw3D(ctx, s.scene, s.cam);
  return s;
}
async function pai(ctx, t, E, cena) {
  F.fundo(ctx, t, { tint: 'rgba(255,77,141,0.14)' });
  const s = setPai(E);
  const ids = ['n05b', 'n05c', 'n05d', 'n05e', 'n05f'];
  const larga = poseLargaPai(t);
  const keys = [{ p: [0, 3.6, 15.5], l: [0, 1.3, 0] }, { a: cena.ini, b: E.f('n05a') + 2.5, ...larga }];
  ids.forEach((id, i) => {
    const t0 = E.f(id) - 0.35;
    keys.push({ a: t0, b: t0 + 0.75, p: [PX[i] * 0.88, 2.2, PZ[i] + 5.6], l: [PX[i], 1.55, PZ[i]] });
  });
  const tg = E.f('n05g');
  keys.push({ a: tg - 0.2, b: tg + 1.3, ...larga });
  pose(s.cam, t, keys);
  desenhaPai(ctx, t, E, true);

  F.titulo(ctx, t, 'O PRESENTE DO SEU PAI', W / 2, 140, { at: E.f('n05a') - 0.1, out: E.f('n05b') - 0.4, size: 74, fill: '#fff' });
  if (t > E.f('n05a') + 0.4 && t < E.f('n05b') - 0.3) F.iconeCoracao(ctx, W / 2, 232, 70 * easeOutBack(ap(t, E.f('n05a') + 0.4), 3), COR.pai);
  ids.forEach((id, i) => {
    const a = E.f(id) - 0.05, b = i < 4 ? E.f(ids[i + 1]) - 0.2 : tg - 0.2;
    if (t < a - 0.1 || t > b + 0.4) return;
    F.titulo(ctx, t, CONSOLES[i].ano, W / 2, 140, { at: a, out: b, size: 120, fill: CONSOLES[i].cor === '#B9BED6' ? '#fff' : CONSOLES[i].cor });
  });
  F.titulo(ctx, t, 'A COLEÇÃO COMPLETA', W / 2, 118, { at: tg + 0.3, size: 70, fill: '#fff' });
  F.pill(ctx, 'PS1 + PS2 + PS3 + PS4 + PS5 = ~R$ 6.150', W / 2, 205, { size: 28, alpha: vis(t, tg + 0.9) });
  F.pill(ctx, '+ 10% DE MARGEM (FRETE, CABOS, REVISÃO) = ~R$ 6.800', W / 2, 275, { size: 28, bg: COR.ouro, color: '#1a1200', alpha: vis(t, tg + 1.8), scale: lerp(0.6, 1, easeOutBack(ap(t, tg + 1.8), 2.4)) });
}

// ================================================================== 6. DICAS PRA COMPRAR USADO
async function dicas(ctx, t, E) {
  F.fundo(ctx, t, { tint: 'rgba(255,77,141,0.1)' });
  const s = setPai(E);
  s.cam.position.set(Math.sin(t * 0.15) * 3, 3.4, 13.0);
  s.cam.lookAt(0, 1.3, 0);
  ctx.save();
  ctx.filter = 'blur(5px) brightness(0.55)';
  desenhaPai(ctx, t, E, false);
  ctx.restore();
  // todos os cartões aparecem (sem animação de entrada)
  const s2 = setPai(E);
  void s2;
  const px = 330, py = 150, pw = 1260, ph = 680;
  const pin = ap(t, E.f('n06a') - 0.4, 0.5);
  ctx.save();
  ctx.globalAlpha = pin;
  ctx.translate(0, (1 - easeOutCubic(pin)) * 60);
  F.painel(ctx, px, py, pw, ph, { r: 34, accent: COR.pai });
  txt(ctx, 'DICAS PRA COMPRAR USADO', px + 70, py + 80, 54, { weight: 900 });
  F.iconeControle(ctx, px + pw - 110, py + 82, 110, COR.pai);
  const itens = [
    ['n06b', 'Teste ligado, com controle e cabo', 'Ligue, jogue uns minutos e teste todos os botões.', true],
    ['n06c', 'PS3: cuidado com a luz amarela', 'Luz amarela piscando ao ligar = defeito grave.', true],
    ['n06d', 'Prefira o Mercado Livre', 'Se der problema, a compra é protegida.', true],
    ['n06e', 'Nunca Pix adiantado pra desconhecido', 'É o golpe mais comum em anúncio de console.', false],
  ];
  itens.forEach(([id, a, sub, ok], i) => F.itemCheck(ctx, t - E.f(id) + 0.1, px + 110, py + 205 + i * 124, a, { size: 42, sub, ok }));
  ctx.restore();
}

// ================================================================== 7. VALE A PENA?
function setVale() {
  return lazy('vale', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    cam.position.set(0, 0.2, 9);
    cam.lookAt(0, 0.6, 0);
    const c = T.coracao('#ff2e63');
    scene.add(c);
    const L = T.luzes(scene, { key: 2.2, rim: 3.0, rimColor: '#ff7ab0', warm: 20, warmColor: '#ffd0e0' });
    const rosa = new THREE.PointLight('#ff4d8d', 30, 10, 1.5);
    rosa.position.set(0, 0.5, -2.5);
    scene.add(rosa);
    return { scene, cam, c, L };
  });
}
function batida(t) {
  const ph = (t % 0.95) / 0.95;
  return Math.exp(-((ph - 0.05) ** 2) / 0.003) + 0.6 * Math.exp(-((ph - 0.25) ** 2) / 0.003);
}
async function vale(ctx, t, E) {
  F.fundo(ctx, t, { inner: '#3a1240', outer: '#0a0518', tint: 'rgba(255,77,141,0.25)' });
  const s = setVale();
  const tc = E.f('n07c');
  const pc = easeInOutCubic(ap(t, tc, 0.8));
  const b = batida(t);
  s.c.scale.setScalar((0.86 + 0.06 * b) * lerp(1, 0.78, pc));
  s.c.position.set(0, lerp(0.75, 1.15, pc), 0);
  s.c.rotation.set(0.05, Math.sin(t * 0.8) * 0.35, 0);
  T.draw3D(ctx, s.scene, s.cam);
  // coraçõezinhos subindo
  const r = rng(5);
  for (let i = 0; i < 18; i++) {
    const x = r() * W, sp = 40 + r() * 60, ph = r() * 20, sz = 14 + r() * 26;
    const y = H + 40 - ((t * sp + ph * 60) % (H + 100));
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t + i);
    F.iconeCoracao(ctx, x + Math.sin(t + i) * 20, y, sz, '#ff7ab0');
    ctx.restore();
  }
  const a = E.f('n07a'), bb = E.f('n07b');
  F.titulo(ctx, t, 'VALE A PENA?', W / 2, 120, { at: a - 0.2, out: tc - 0.2, size: 74 });
  if (t < tc - 0.1) F.carimbo(ctx, t - a - 1.0, 'VALE!', 1420, 250, { size: 80, color: COR.reserva, rot: -0.12, seed: 9 });
  // dinheiro volta / tempo não
  const al1 = vis(t, bb, tc - 0.1), al2 = vis(t, bb + 1.5, tc - 0.1);
  ctx.save();
  ctx.globalAlpha = al1;
  text2(ctx, 'DINHEIRO', 400, 420, 64, '#c9cfe8');
  text2(ctx, 'A GENTE RECUPERA', 400, 500, 40, '#c9cfe8');
  ctx.globalAlpha = al2;
  text2(ctx, 'TEMPO COM', 1520, 420, 64, '#ffb3cf');
  text2(ctx, 'O PAI, NÃO.', 1520, 500, 64, COR.pai);
  ctx.restore();
  ['GRATIDÃO', 'MEMÓRIA', 'CARINHO'].forEach((w2, i) => {
    const ti = bb + 3.0 + i * 0.55;
    F.pill(ctx, w2, W / 2 + (i - 1) * 300, 800, { size: 32, bg: 'rgba(255,77,141,0.2)', border: COR.pai, alpha: vis(t, ti, tc - 0.1), scale: lerp(0.4, 1, easeOutBack(ap(t, ti, 0.35), 2.5)) });
  });
  // jogar juntos
  if (t > tc - 0.1) {
    const p = easeOutBack(ap(t, tc + 0.3, 0.8), 1.2);
    const c1 = E.img['ps1-controle-recorte'], c2 = E.img['ps4-controle-recorte'];
    const w1 = 400, h1 = w1 * c1.height / c1.width, w2 = 380, h2 = w2 * c2.height / c2.width;
    ctx.save();
    ctx.globalAlpha = clamp(p * 2);
    ctx.drawImage(c1, lerp(-500, 470, p), 610 - h1 / 2 + Math.sin(t * 2) * 6, w1, h1);
    ctx.drawImage(c2, lerp(W + 100, 1060, p), 610 - h2 / 2 + Math.cos(t * 2) * 6, w2, h2);
    ctx.restore();
    F.pill(ctx, 'PAI', 670, 790, { size: 30, alpha: ap(t, tc + 1.1), bg: 'rgba(12,16,44,0.85)', border: 'rgba(255,255,255,0.3)' });
    F.pill(ctx, 'DANIEL', 1250, 790, { size: 30, alpha: ap(t, tc + 1.3), bg: COR.ouro, color: '#1a1200' });
    F.titulo(ctx, t, 'JOGAR JUNTOS', W / 2, 120, { at: tc + 1.6, size: 80, fill: COR.ouro, glow: 'rgba(255,200,58,0.4)' });
  }
}
function text2(ctx, s, x, y, size, color) {
  F.text3D(ctx, s, x, y, { size, fill: color, depth: 4 });
}

// ================================================================== 8. REGRA 20·50·30
const FATIAS = [
  { pct: 20, nome: 'RESERVA (CAIXA)', valor: 2750, cor: COR.reserva, c3: C3.reserva, fala: 'n08b' },
  { pct: 50, nome: 'PRESENTE DO PAI', valor: 6875, cor: COR.pai, c3: C3.pai, fala: 'n08c' },
  { pct: 30, nome: 'SEUS PROJETOS', valor: 4125, cor: COR.proj, c3: C3.proj, fala: 'n08d', sub: 'tablet + trilhas + FlipaClip' },
];
const DONUT_X = -2.7;
function setRegra() {
  return lazy('regra', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    const grupo = new THREE.Group();
    grupo.position.x = DONUT_X;
    scene.add(grupo);
    let a = Math.PI / 2;
    const fat = FATIAS.map((f) => {
      const da = (f.pct / 100) * Math.PI * 2;
      const m = T.fatia(1.25, 2.55, a - da + 0.012, a - 0.012, 1, f.c3);
      const mid = a - da / 2;
      a -= da;
      const g = new THREE.Group();
      g.add(m);
      grupo.add(g);
      return { g, m, mid };
    });
    const fantasma = T.fatia(1.25, 2.55, 0, Math.PI * 2 - 0.001, 0.12, '#2a336f');
    fantasma.material.transparent = true;
    fantasma.material.opacity = 0.6;
    grupo.add(fantasma);
    const pi = T.piso(9);
    pi.position.set(DONUT_X, -0.02, 0);
    scene.add(pi);
    T.luzes(scene, { key: 2.4, rim: 1.8 });
    return { scene, cam, fat, grupo };
  });
}
async function regra(ctx, t, E) {
  F.fundo(ctx, t, {});
  const s = setRegra();
  s.cam.position.set(DONUT_X + 2.6 + Math.sin(t * 0.18) * 0.5, 7.4, 9.4);
  s.cam.lookAt(DONUT_X + 2.6, 0.55, 0);
  s.grupo.rotation.y = Math.sin(t * 0.25) * 0.08;
  let ativo = -1;
  FATIAS.forEach((f, i) => { if (t >= E.f(f.fala) - 0.1) ativo = i; });
  s.fat.forEach((k, i) => {
    const tk = E.f(FATIAS[i].fala) - 0.1;
    const p = clamp((t - tk) / 0.8);
    const e = easeOutBack(p, 2);
    k.g.visible = p > 0;
    k.g.scale.set(1, Math.max(0.001, e * (i === ativo ? 0.62 : 0.42)), 1);
    const out = (i === ativo ? 0.28 : 0.06) * easeOutCubic(p);
    k.g.position.set(Math.cos(k.mid) * out, 0, -Math.sin(k.mid) * out);
  });
  T.draw3D(ctx, s.scene, s.cam);
  // número no centro
  etiqueta(ctx, s.cam, [DONUT_X, 0.3, 0], (x) => {
    x.globalAlpha = vis(t, E.f('n08a') + 0.5);
    F.text3D(x, 'R$ 13.750', 0, 0, { size: 44, fill: '#fff', depth: 3 });
  });
  // porcentagens sobre as fatias
  s.fat.forEach((k, i) => {
    const tk = E.f(FATIAS[i].fala);
    const r = 1.9;
    etiqueta(ctx, s.cam, [DONUT_X + Math.cos(k.mid) * r, 0.9, -Math.sin(k.mid) * r], (x) => {
      const al = ap(t, tk, 0.3);
      if (al <= 0) return;
      x.globalAlpha = al;
      x.scale(lerp(0.5, 1, easeOutBack(al, 3)), lerp(0.5, 1, easeOutBack(al, 3)));
      F.text3D(x, FATIAS[i].pct + '%', 0, 0, { size: 64, fill: '#fff', depth: 5 });
    });
  });
  F.titulo(ctx, t, 'REGRA 20 · 50 · 30', W / 2, 118, { at: E.f('n08a') - 0.2, size: 74, colors: null, fill: COR.ouro });
  // legenda lateral
  FATIAS.forEach((f, i) => {
    const tk = E.f(f.fala);
    const al = ap(t, tk, 0.4);
    if (al <= 0) return;
    const x = 1080, y = 300 + i * 190, w = 770, h = 160;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.translate((1 - easeOutCubic(al)) * 120, 0);
    F.painel(ctx, x, y, w, h, { accent: f.cor, border: i === ativo ? f.cor : 'rgba(255,255,255,0.14)', borderW: i === ativo ? 4 : 2.5 });
    txt(ctx, f.pct + '%', x + 40, y + 62, 64, { weight: 900, color: f.cor });
    txt(ctx, f.nome, x + 200, y + 50, 32, { weight: 800 });
    txt(ctx, brl(f.valor), x + 200, y + 108, 52, { weight: 900, color: COR.ouro });
    if (f.sub) txt(ctx, f.sub, x + w - 30, y + 112, 20, { weight: 600, color: COR.suave, align: 'right' });
    ctx.restore();
  });
}

// ================================================================== 9. RESERVA NA CAIXA
function setCaixa() {
  return lazy('caixa', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    const b1 = T.barra(1.5, 1.5, '#5b6bb0', 0.08);
    b1.position.set(0.6, 0, 0);
    const b2 = T.barra(1.5, 1.5, C3.reserva, 0.08);
    b2.position.set(3.8, 0, 0);
    scene.add(b1, b2);
    const m = T.moedas(16, 0.33, 0.07);
    scene.add(m.mesh);
    const cad = T.cadeado();
    scene.add(cad.group);
    const pi = T.piso(10);
    pi.position.set(2.2, -0.01, 0);
    scene.add(pi);
    [0.6, 3.8].forEach((x) => { const sh = T.sombra(2.6, 2.6, 0.7); sh.position.set(x, 0.005, 0); scene.add(sh); });
    T.luzes(scene, { key: 2.4, rim: 2.0, rimColor: '#5cf2c8' });
    return { scene, cam, b1, b2, m, cad };
  });
}
const H_POUP = 8.3 * 0.26, H_CDB = 11.3 * 0.26;
async function caixa(ctx, t, E) {
  F.fundo(ctx, t, { tint: 'rgba(34,211,166,0.12)' });
  const s = setCaixa();
  const tb = E.f('n09b'), tc = E.f('n09c'), td = E.f('n09d'), te = E.f('n09e');
  s.cam.position.set(Math.sin(t * 0.15) * 0.5, 2.7, 13);
  s.cam.lookAt(0, 1.6, 0);
  const p1 = easeOutBack(clamp((t - tb - 0.2) / 0.9), 1.3), p2 = easeOutBack(clamp((t - tc - 0.2) / 0.9), 1.3);
  s.b1.scale.y = Math.max(0.001, H_POUP * p1);
  s.b2.scale.y = Math.max(0.001, H_CDB * p2);
  s.b1.visible = p1 > 0.001;
  s.b2.visible = p2 > 0.001;
  // moedas caindo em cima das barras quando os valores aparecem
  for (let i = 0; i < 16; i++) {
    const naCdb = i >= 6;
    const k = naCdb ? i - 6 : i;
    const x = naCdb ? 3.8 : 0.6, topo = naCdb ? H_CDB : H_POUP;
    const ti = td + 2.6 + (naCdb ? 1.0 : 0) + k * 0.09;
    const p = clamp((t - ti) / 0.35);
    const y = topo + 0.04 + k * 0.07 + (1 - easeInCubic(p)) * 3;
    s.m.set(i, x + Math.sin(k * 2.1) * 0.06, y, Math.cos(k * 1.7) * 0.06, 0, 0, p > 0 ? 1 : 0, k);
  }
  s.m.done();
  const pc = clamp((t - te + 0.2) / 0.6);
  s.cad.group.visible = pc > 0;
  s.cad.group.position.set(2.2, 1.2 + (1 - easeOutCubic(pc)) * 4, 2.6);
  s.cad.group.rotation.y = Math.sin(t * 1.2) * 0.25;
  s.cad.group.scale.setScalar(0.85);
  s.cad.arco.position.y = 0.3 * (1 - easeOutBack(clamp((t - te - 0.6) / 0.35), 3));
  T.draw3D(ctx, s.scene, s.cam);

  F.titulo(ctx, t, 'ONDE DEIXAR A RESERVA?', W / 2, 118, { at: E.f('n09a') - 0.2, size: 66 });
  // painel de opções
  const pin = ap(t, E.f('n09a'), 0.5);
  ctx.save();
  ctx.globalAlpha = pin;
  ctx.translate((1 - easeOutCubic(pin)) * -100, 0);
  F.painel(ctx, 70, 200, 610, 610, { accent: COR.reserva });
  txt(ctx, 'NA CAIXA', 110, 262, 40, { weight: 900, color: COR.reserva });
  const ops = [
    ['Poupança', '~8,3% em 12 meses · isenta de IR', tb],
    ['CDB liquidez diária', '~100% do CDI · tem IR', tc],
    ['Tesouro Selic', '~100% da Selic · tem IR', tc + 1.6],
  ];
  ops.forEach(([a, b, ti], i) => {
    const al = ap(t, ti, 0.35);
    if (al <= 0) return;
    ctx.save();
    ctx.globalAlpha *= al;
    txt(ctx, a, 110, 345 + i * 110, 36, { weight: 800 });
    txt(ctx, b, 110, 390 + i * 110, 24, { weight: 600, color: COR.suave });
    ctx.restore();
  });
  ctx.save();
  ctx.globalAlpha *= ap(t, tc + 2.5, 0.4);
  F.iconeCadeado(ctx, 128, 712, 46, COR.ouro);
  txt(ctx, 'Poupança e CDB: garantia', 165, 700, 23, { weight: 700, color: '#dfe3f7' });
  txt(ctx, 'do FGC até R$ 250 mil.', 165, 732, 23, { weight: 700, color: '#dfe3f7' });
  ctx.restore();
  ctx.restore();
  F.pill(ctx, 'SELIC 13,75% · NOV/2026', 520, 262, { size: 21, bg: 'rgba(34,211,166,0.18)', border: COR.reserva, color: '#bff7e6', alpha: vis(t, tc + 0.5) });
  // rótulos das barras
  [[0.6, H_POUP, 'POUPANÇA', '8,3% a.a.', 228, tb, '#c9d1f2'], [3.8, H_CDB, 'CDB / TESOURO SELIC', '~11,3% a.a. líquido', 310, tc, COR.reserva]].forEach(([x, hh, nome, taxa, ganho, ti, cor], i) => {
    const al = ap(t, ti + 0.3, 0.4);
    if (al <= 0) return;
    etiqueta(ctx, s.cam, [x, 0, 0.9], (c) => { c.globalAlpha = al; F.pill(c, nome, 0, 42, { size: 24, bg: 'rgba(12,16,44,0.9)', border: cor }); });
    etiqueta(ctx, s.cam, [x, hh + 0.2, 0], (c) => {
      c.globalAlpha = al;
      const lt = t - td - (i === 0 ? 2.2 : 1.2);
      if (lt > 0) {
        F.contador(c, lt, ganho, 0, -110, { size: 62, fill: i ? COR.ouro : '#fff', prefix: '+R$ ', dur: 1.0, glow: i ? 'rgba(255,200,58,0.5)' : null });
        c.globalAlpha = al * ap(t, td + 0.5);
        F.pill(c, 'em 1 ano, com R$ 2.750', 0, -46, { size: 20, bg: 'rgba(12,16,44,0.8)' });
      } else {
        F.pill(c, taxa, 0, -40, { size: 26, bg: cor, color: '#08102a' });
      }
    });
  });
  F.pill(ctx, 'RESERVA = SÓ PRA EMERGÊNCIA', W / 2 + 120, 205, { size: 32, bg: COR.ouro, color: '#1a1200', alpha: vis(t, te + 0.8), scale: lerp(0.5, 1, easeOutBack(ap(t, te + 0.8), 2.5)) });
  ctx.save();
  ctx.globalAlpha = vis(t, td + 0.5) * 0.85;
  txt(ctx, 'Estimativa: Selic mantida por 12 meses e IR de 17,5%', 75, 842, 19, { weight: 600, color: COR.suave });
  txt(ctx, 'no CDB/Tesouro. Se os juros mudarem, o rendimento muda.', 75, 868, 19, { weight: 600, color: COR.suave });
  ctx.restore();
}

// ================================================================== 10. TRILHAS DA VANGUARDA
function setTrilhas() {
  return lazy('trilhas', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    const f1 = T.fitaVHS('Previsão 2004');
    const f2 = T.fitaVHS('Previsão 2013', '#fff7d6');
    scene.add(f1.group, f2.group);
    const barras = [];
    for (let i = 0; i < 14; i++) {
      const b = T.barra(0.18, 0.18, i % 2 ? COR.roxo : COR.proj, 0.03);
      b.position.set(-4.3 + i * 0.25, -1.8, 0.6);
      scene.add(b);
      barras.push(b);
    }
    T.luzes(scene, { key: 2.4, rim: 2.4, rimColor: '#b48cff' });
    return { scene, cam, f1, f2, barras };
  });
}
function seqGrid(ctx, x, y, t, al) {
  // sequenciador de passos (estilo "piano roll" genérico)
  const cols = 16, rows = 4, cw = 44, chh = 40;
  const passo = Math.floor(t * (92 / 60) * 4) % cols;
  const padrao = ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', '..x..x....x..x..'];
  const cores = [COR.ouro, COR.pai, COR.reserva, COR.proj];
  ctx.save();
  ctx.globalAlpha *= al;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = padrao[r][c] === 'x';
      const atual = c === passo;
      ctx.fillStyle = on ? cores[r] : 'rgba(255,255,255,0.08)';
      if (on && atual) ctx.fillStyle = '#fff';
      F.roundRect(ctx, x + c * cw, y + r * chh, cw - 6, chh - 6, 6);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + passo * cw - 3, y - 8, 3, rows * chh + 10);
  ctx.restore();
}
function ondaComVoz(ctx, x, y, w, t, al) {
  ctx.save();
  ctx.globalAlpha *= al;
  ctx.strokeStyle = '#9aa3c7';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const xx = x + (i / 60) * w;
    const a = (18 + 26 * Math.abs(Math.sin(i * 0.7 + t * 6))) * (0.5 + 0.5 * Math.sin(i * 0.23));
    ctx.moveTo(xx, y - a); ctx.lineTo(xx, y + a);
  }
  ctx.stroke();
  ctx.restore();
}
async function trilhas(ctx, t, E) {
  F.fundo(ctx, t, { inner: '#1d1550', tint: 'rgba(155,107,255,0.18)' });
  const s = setTrilhas();
  const a = E.f('n10a'), b = E.f('n10b'), c = E.f('n10c'), d = E.f('n10d');
  s.cam.position.set(0, 0.3, 10);
  s.cam.lookAt(0, 0.1, 0);
  const pin = easeOutBack(ap(t, a - 0.3, 0.9), 1.4);
  s.f1.group.position.set(-3.5, 0.6 + Math.sin(t * 1.1) * 0.08, lerp(-4, 0, pin));
  s.f1.group.rotation.set(-0.12, 0.42 + Math.sin(t * 0.6) * 0.08, 0.06);
  s.f2.group.position.set(-2.3, -0.6 + Math.cos(t * 1.0) * 0.08, lerp(-5, 0.6, pin));
  s.f2.group.rotation.set(-0.08, 0.32 + Math.cos(t * 0.5) * 0.08, -0.08);
  [s.f1, s.f2].forEach((f) => f.carreteis.forEach((r) => { r.rotation.z = -t * 3; }));
  const beat = (t * 92) / 60;
  const pe = ap(t, b + 3.2, 0.6);
  s.barras.forEach((m, i) => {
    const v = 0.25 + 0.75 * Math.abs(Math.sin(beat * Math.PI * (1 + (i % 3) * 0.5) + i * 0.8)) * (0.6 + 0.4 * Math.sin(i * 0.9 + t));
    m.scale.y = Math.max(0.001, v * 1.1 * pe);
    m.visible = pe > 0;
  });
  T.draw3D(ctx, s.scene, s.cam);

  F.titulo(ctx, t, 'TRILHAS DA PREVISÃO VANGUARDA', W / 2 + 120, 118, { at: a - 0.2, size: 58 });
  const PX0 = 820, PW = 1020;
  // fase 1: anos
  ctx.save();
  ctx.globalAlpha = vis(t, a + 0.6, b - 0.1);
  F.painel(ctx, PX0, 230, PW, 520, { accent: COR.roxo });
  txt(ctx, '2 TRILHAS PRA SALVAR', PX0 + 60, 300, 40, { weight: 900, color: COR.roxo });
  txt(ctx, '2004', PX0 + 60, 420, 90, { weight: 900, color: COR.ouro });
  txt(ctx, 'gravada em fita (VHS) em 2007', PX0 + 330, 400, 28, { weight: 700 });
  txt(ctx, 'áudio gasto, com chiado', PX0 + 330, 440, 26, { weight: 600, color: COR.suave });
  txt(ctx, '2013', PX0 + 60, 600, 90, { weight: 900, color: COR.ouro });
  txt(ctx, 'voz do apresentador', PX0 + 330, 580, 28, { weight: 700 });
  txt(ctx, 'por cima da música', PX0 + 330, 620, 26, { weight: 600, color: COR.suave });
  ctx.restore();
  // fase 2: tirar a voz x reconstruir
  ctx.save();
  ctx.globalAlpha = vis(t, b, c - 0.1);
  F.painel(ctx, PX0, 230, PW, 520, { accent: COR.roxo });
  txt(ctx, 'TIRAR A VOZ', PX0 + 60, 300, 38, { weight: 900, color: '#c9cfe8' });
  ondaComVoz(ctx, PX0 + 60, 380, 520, t, 1);
  F.itemCheck(ctx, t - b - 1.2, PX0 + 680, 380, 'Sai sujo', { size: 38, ok: false });
  txt(ctx, 'RECONSTRUIR NO FL STUDIO', PX0 + 60, 500, 38, { weight: 900, color: COR.reserva });
  seqGrid(ctx, PX0 + 60, 540, t, ap(t, b + 3.2, 0.4));
  F.itemCheck(ctx, t - b - 4.0, PX0 + 800, 620, 'Limpo', { size: 38 });
  ctx.restore();
  // fase 3: orçamento
  ctx.save();
  ctx.globalAlpha = vis(t, c, d - 0.1);
  F.painel(ctx, PX0, 230, PW, 520, { accent: COR.ouro });
  txt(ctx, 'ORÇAMENTO NO 99FREELAS', PX0 + 60, 300, 38, { weight: 900, color: COR.ouro });
  const linhas = [['Proposta do freelancer', '~R$ 650', c + 3.2, '#fff'], ['Taxa da plataforma + Pix', '~R$ 100', c + 1.2, COR.suave]];
  linhas.forEach(([l, v, ti, cor], i) => {
    ctx.save();
    ctx.globalAlpha *= ap(t, ti, 0.35);
    txt(ctx, l, PX0 + 60, 400 + i * 80, 34, { weight: 700, color: cor });
    txt(ctx, v, PX0 + PW - 60, 400 + i * 80, 40, { weight: 900, color: cor, align: 'right' });
    ctx.restore();
  });
  ctx.save();
  ctx.globalAlpha *= ap(t, c + 5.0, 0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(PX0 + 60, 520, PW - 120, 3);
  txt(ctx, 'TOTAL', PX0 + 60, 580, 40, { weight: 900 });
  txt(ctx, '~R$ 750', PX0 + PW - 60, 580, 58, { weight: 900, color: COR.ouro, align: 'right' });
  ctx.restore();
  F.pill(ctx, 'TETO MÁXIMO: R$ 1.000', PX0 + PW / 2, 690, { size: 30, bg: 'rgba(255,200,58,0.16)', border: COR.ouro, color: COR.ouro, alpha: ap(t, c + 8.0, 0.3) });
  ctx.restore();
  // fase 4: combinado
  ctx.save();
  ctx.globalAlpha = vis(t, d);
  F.painel(ctx, PX0, 230, PW, 520, { accent: COR.reserva });
  txt(ctx, 'ANTES DE FECHAR', PX0 + 60, 300, 38, { weight: 900, color: COR.reserva });
  F.itemCheck(ctx, t - d - 0.2, PX0 + 100, 410, 'Peça uma amostra antes', { size: 38, sub: 'uns 20 segundos, pra ver se ele pega o estilo' });
  F.itemCheck(ctx, t - d - 1.6, PX0 + 100, 535, 'Entrega: WAV + projeto do FL Studio', { size: 38, sub: 'arquivo .flp e as faixas separadas' });
  F.itemCheck(ctx, t - d - 4.4, PX0 + 100, 660, 'Pagamento só depois de aprovar', { size: 38, sub: 'a plataforma segura o dinheiro até você liberar' });
  ctx.restore();
}

// ================================================================== 11. FLIPACLIP
function telaAnimacao(c, t) {
  const x = c.getContext('2d'), w = c.width, h = c.height;
  x.fillStyle = '#f3f1ea';
  x.fillRect(0, 0, w, h);
  x.fillStyle = '#e6e2d6';
  x.fillRect(0, 0, w, 64);
  [40, 110, 180, 250].forEach((xx, i) => { x.fillStyle = ['#ff6b6b', '#4d7cff', '#22d3a6', '#ffc83a'][i]; x.beginPath(); x.arc(xx, 32, 18, 0, 6.283); x.fill(); });
  txt(x, 'quadro ' + (Math.floor(t * 12) % 12 + 1) + '/12', w - 30, 32, 26, { weight: 700, color: '#555', align: 'right' });
  // chão
  x.strokeStyle = '#2b2b2b';
  x.lineWidth = 5;
  x.beginPath(); x.moveTo(80, 470); x.lineTo(w - 80, 470); x.stroke();
  const pos = (f) => {
    const ph = (f % 12) / 12;
    const bx2 = 160 + ph * (w - 320);
    const by = 470 - 36 - Math.abs(Math.sin(ph * Math.PI * 2)) * 300;
    const squash = ph < 0.04 || ph > 0.96 || Math.abs(ph - 0.5) < 0.04 ? 1.3 : 1;
    return [bx2, by, squash];
  };
  const fr = Math.floor(t * 12);
  // papel cebola (quadros anteriores)
  for (let k = 3; k >= 1; k--) {
    const [px, py, sq] = pos(fr - k);
    x.strokeStyle = `rgba(255,80,120,${0.12 * (4 - k)})`;
    x.lineWidth = 4;
    x.beginPath(); x.ellipse(px, py + (sq > 1 ? 8 : 0), 36 * sq, 36 / sq, 0, 0, 6.283); x.stroke();
  }
  const [bx2, by, sq] = pos(fr);
  x.fillStyle = '#ff4d8d';
  x.strokeStyle = '#222';
  x.lineWidth = 5;
  x.beginPath(); x.ellipse(bx2, by + (sq > 1 ? 8 : 0), 36 * sq, 36 / sq, 0, 0, 6.283); x.fill(); x.stroke();
  // linha do tempo
  x.fillStyle = '#e6e2d6';
  x.fillRect(0, h - 110, w, 110);
  for (let i = 0; i < 12; i++) {
    x.fillStyle = i === fr % 12 ? '#ff4d8d' : '#fff';
    F.roundRect(x, 40 + i * 78, h - 92, 66, 72, 8);
    x.fill();
    x.strokeStyle = '#bbb';
    x.lineWidth = 2;
    x.stroke();
  }
}
function setFlipa() {
  return lazy('flipa', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    cam.position.set(0, 0.2, 9.2);
    cam.lookAt(0, 0.1, 0);
    const c = canvas(1024, 640);
    telaAnimacao(c, 0);
    const tb = T.tabletEstilizado(c);
    scene.add(tb.group);
    T.luzes(scene, { key: 2.2, rim: 2.2 });
    return { scene, cam, tb, c };
  });
}
async function flipaclip(ctx, t, E) {
  F.fundo(ctx, t, { tint: 'rgba(255,159,28,0.14)' });
  const s = setFlipa();
  const a = E.f('n11a');
  telaAnimacao(s.c, t);
  s.tb.tex.needsUpdate = true;
  const pin = easeOutBack(ap(t, a - 0.5, 0.9), 1.3);
  s.tb.group.position.set(-2.3, 0.15 + Math.sin(t) * 0.05, lerp(-3, 0, pin));
  s.tb.group.rotation.set(-0.1, 0.32 + Math.sin(t * 0.5) * 0.05, 0.02);
  const fr = (Math.floor(t * 12) % 12) / 12;
  s.tb.caneta.position.set(-1.2 + fr * 2.2, 0.6 - Math.abs(Math.sin(fr * Math.PI * 2)) * 0.8, 0.9);
  s.tb.caneta.rotation.set(0.5, 0, -0.5);
  T.draw3D(ctx, s.scene, s.cam);
  const X = 1440;
  F.titulo(ctx, t, 'FLIPACLIP', X, 260, { at: a - 0.2, size: 96, fill: '#FF9F1C' });
  F.contador(ctx, t - a - 0.8, 99, X, 420, { size: 120, fill: '#fff', dur: 0.8 });
  F.pill(ctx, 'POR ANO', X, 520, { size: 30, alpha: ap(t, a + 1.0) });
  F.pill(ctx, '= R$ 8,25 POR MÊS', X, 610, { size: 38, bg: 'rgba(255,200,58,0.16)', border: COR.ouro, color: COR.ouro, alpha: ap(t, a + 2.2), scale: lerp(0.5, 1, easeOutBack(ap(t, a + 2.2), 2.5)) });
  F.carimbo(ctx, t - a - 5.6, 'VALE MUITO!', X, 750, { size: 60, color: COR.reserva, rot: -0.08, seed: 12 });
}

// ================================================================== 12. O TABLET
function desenhaCaminho(x, w, h, o) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#232a6a');
  g.addColorStop(1, '#10143c');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.fillStyle = o.cor;
  x.fillRect(0, 0, w, 16);
  txt(x, o.titulo, 50, 92, 66, { weight: 900, color: o.cor });
  F.pill(x, o.tag, 50, 168, { size: 26, bg: o.cor, color: '#08102a', align: 'left' });
  let y = 268;
  o.linhas.forEach((l) => {
    x.fillStyle = o.cor;
    x.beginPath(); x.arc(62, y, 11, 0, 6.283); x.fill();
    txt(x, l[0], 92, y, 43, { weight: 800 });
    if (l[1]) txt(x, l[1], 92, y + 50, 33, { weight: 600, color: '#c3c9e6' });
    y += l[1] ? 128 : 84;
  });
}
function setTablet(E) {
  return lazy('tablet', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    cam.position.set(0, 0.2, 12.5);
    cam.lookAt(0, 0.1, 0);
    const cv = canvas(1000, 700);
    cv.getContext('2d').drawImage(E.img.tablet, 0, 0);
    const tab = T.cartao(4.2, 2.94, cv, { corpo: '#d9dce8' });
    scene.add(tab.group);
    const defs = [
      { titulo: 'CAMINHO A', tag: 'MAIS SEGURO', cor: COR.reserva, linhas: [['Galaxy Tab mais em conta', 'com S Pen, perto de R$ 3.000'], ['FlipaClip roda igualzinho', ''], ['Presente do pai completo', 'PS1 ao PS5 de uma vez']] },
      { titulo: 'CAMINHO B', tag: 'APERTADO', cor: COR.ouro, linhas: [['Tab S11 Ultra agora', 'só em promoção (~R$ 6.750)'], ['Pai em 2 capítulos', 'PS1 ao PS4 agora (~R$ 2.950)'], ['PS5 num 2º momento especial', 'ex.: Dia dos Pais'], ['Trilhas no limite de R$ 750', '']] },
    ];
    const cards = defs.map((d) => {
      const c = canvas(860, 760);
      desenhaCaminho(c.getContext('2d'), 860, 760, d);
      const k = T.cartao(4.3, 3.8, c);
      scene.add(k.group);
      return k;
    });
    T.luzes(scene, { key: 2.2, rim: 1.8 });
    return { scene, cam, tab, cards };
  });
}
async function tablet(ctx, t, E) {
  F.fundo(ctx, t, { tint: 'rgba(77,124,255,0.16)' });
  const s = setTablet(E);
  const a = E.f('n12a'), b = E.f('n12b'), c = E.f('n12c'), d = E.f('n12d');
  const sai = easeInOutCubic(ap(t, b - 0.3, 0.8));
  const pin = easeOutBack(ap(t, a - 0.5, 0.9), 1.3);
  s.tab.group.position.set(lerp(-3.4, -3.4, sai), lerp(0.4, 4.2, sai), lerp(-4, 0, pin) - sai * 3);
  s.tab.group.rotation.set(-0.08, 0.35 + Math.sin(t * 0.6) * 0.12, 0.03);
  s.tab.group.visible = sai < 0.99;
  s.cards.forEach((k, i) => {
    const tk = i === 0 ? b - 0.1 : c - 0.1;
    const p = clamp((t - tk) / 0.75);
    const e = easeOutBack(p, 1.3);
    k.group.visible = p > 0;
    const ativo = (i === 0 && t < c - 0.1) || (i === 1 && t >= c - 0.1) || t >= d - 0.2;
    k.group.position.set((i ? 2.45 : -2.45) + (1 - e) * (i ? 4 : -4), 0.05 + Math.sin(t + i) * 0.04, (1 - easeOutCubic(p)) * -3);
    k.group.rotation.set(0, (1 - e) * (i ? -1.4 : 1.4) + (i ? -0.08 : 0.08), 0);
    k.frente.material.color.setScalar(ativo ? 1 : 0.6);
  });
  T.draw3D(ctx, s.scene, s.cam);
  // fase 1: orçamento x preço
  F.titulo(ctx, t, 'E O TABLET?', W / 2, 118, { at: a - 0.2, out: b - 0.3, size: 74 });
  ctx.save();
  ctx.globalAlpha = vis(t, a + 1.2, b - 0.2);
  F.painel(ctx, 1000, 270, 820, 200, { accent: COR.reserva });
  txt(ctx, 'NOS SEUS 30%, SOBRA', 1050, 330, 30, { weight: 800, color: COR.suave });
  txt(ctx, '~R$ 3.000', 1050, 410, 70, { weight: 900, color: COR.reserva });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = vis(t, a + 3.8, b - 0.2);
  F.painel(ctx, 1000, 500, 820, 250, { accent: COR.pai });
  txt(ctx, 'TAB S11 ULTRA EM PROMOÇÃO', 1050, 560, 30, { weight: 800, color: COR.suave });
  txt(ctx, '~R$ 7.000', 1050, 640, 70, { weight: 900, color: COR.pai });
  txt(ctx, 'lançamento: R$ 9.999 · já saiu por R$ 6.749', 1050, 710, 24, { weight: 600, color: COR.suave });
  ctx.restore();
  F.titulo(ctx, t, 'DOIS CAMINHOS', W / 2, 118, { at: b, size: 70, fill: '#fff' });
  // reserva intacta
  const pr = ap(t, d, 0.4);
  if (pr > 0) {
    ctx.save();
    ctx.globalAlpha = pr;
    ctx.translate(W / 2, 872);
    ctx.scale(lerp(0.5, 1, easeOutBack(pr, 2.4)), lerp(0.5, 1, easeOutBack(pr, 2.4)));
    F.pill(ctx, 'NOS DOIS: RESERVA INTACTA (R$ 2.750)', 30, 0, { size: 36, bg: COR.reserva, color: '#04241b' });
    F.iconeCadeado(ctx, -380, -4, 58, COR.ouro);
    ctx.restore();
  }
}

// ================================================================== 13. CENÁRIOS
const CEN = [
  { total: 13750, nome: '1º + POPULAR', x: -3.7 },
  { total: 8750, nome: 'SÓ 1º LUGAR', x: 0 },
  { total: 5000, nome: 'SÓ POPULAR', x: 3.7 },
];
const CEN_ESC = 2.7 / 13750;
function setCenarios() {
  return lazy('cen', () => {
    const scene = T.newScene();
    const cam = T.camera(34);
    const cols = CEN.map((c) => {
      const segs = [C3.reserva, C3.pai, C3.proj].map((cor) => { const b = T.barra(1.9, 1.9, cor, 0.05); b.position.x = c.x; scene.add(b); return b; });
      const sh = T.sombra(3.2, 3.2, 0.7);
      sh.position.set(c.x, 0.005, 0);
      scene.add(sh);
      return segs;
    });
    const pi = T.piso(12);
    scene.add(pi);
    T.luzes(scene, { key: 2.4, rim: 2.0 });
    return { scene, cam, cols };
  });
}
async function cenarios(ctx, t, E) {
  F.fundo(ctx, t, {});
  const s = setCenarios();
  const a = E.f('n13a'), b = E.f('n13b');
  const tc = [a - 0.2, a + 2.4, a + 4.9];
  s.cam.position.set(Math.sin(t * 0.18) * 0.8, 3.0, 14.2);
  s.cam.lookAt(0, 1.92, 0);
  s.cols.forEach((segs, i) => {
    const p = easeOutBack(clamp((t - tc[i]) / 0.8), 1.2);
    let y = 0;
    [0.2, 0.5, 0.3].forEach((fr, k) => {
      const hh = CEN[i].total * fr * CEN_ESC * Math.max(0.001, p);
      segs[k].scale.y = Math.max(0.001, hh);
      segs[k].position.y = y;
      segs[k].visible = p > 0.001;
      y += hh + (p > 0 ? 0.03 : 0);
    });
  });
  T.draw3D(ctx, s.scene, s.cam);
  F.titulo(ctx, t, 'E SE O PRÊMIO VIER MENOR?', W / 2, 118, { at: a - 0.2, out: b - 0.2, size: 66 });
  CEN.forEach((c, i) => {
    const al = ap(t, tc[i] + 0.4, 0.35);
    if (al <= 0) return;
    const topo = c.total * CEN_ESC + 0.1;
    etiqueta(ctx, s.cam, [c.x, topo, 0], (x) => {
      x.globalAlpha = al;
      F.text3D(x, brl(c.total), 0, -40, { size: 50, fill: i === 0 ? COR.ouro : '#fff' });
      F.pill(x, c.nome, 0, -102, { size: 22, bg: 'rgba(12,16,44,0.9)', border: 'rgba(255,255,255,0.25)' });
    });
    etiqueta(ctx, s.cam, [c.x, 0, 1.0], (x) => {
      x.globalAlpha = al;
      [['Reserva', 0.2, COR.reserva], ['Pai', 0.5, COR.pai], ['Projetos', 0.3, COR.proj]].forEach(([n, fr, cor], k) => {
        x.fillStyle = cor;
        x.beginPath(); x.arc(-120, 40 + k * 34, 8, 0, 6.283); x.fill();
        txt(x, n, -100, 40 + k * 34, 22, { weight: 700, color: '#dfe3f7' });
        txt(x, brl(c.total * fr), 130, 40 + k * 34, 22, { weight: 800, color: '#fff', align: 'right' });
      });
    });
  });
  // prioridades
  const pr = ['1  RESERVA', '2  PS1, PS2 E PS3', '3  O RESTO COM O TEMPO'];
  const tp = [b + 3.2, b + 4.3, b + 5.6];
  const xs = [440, 960, 1500];
  pr.forEach((p, i) => {
    F.pill(ctx, p, xs[i], 118, { size: 32, bg: i === 0 ? COR.reserva : i === 1 ? COR.pai : COR.proj, color: '#08102a', alpha: ap(t, tp[i], 0.3), scale: lerp(0.5, 1, easeOutBack(ap(t, tp[i], 0.35), 2.5)) });
    if (i < 2) F.seta(ctx, xs[i] + 170, 118, xs[i + 1] - (i === 0 ? 200 : 260), 118, '#fff', ap(t, tp[i + 1] - 0.2, 0.3), 6);
  });
  F.pill(ctx, 'MESMA REGRA: 20 · 50 · 30', W / 2, 200, { size: 28, alpha: vis(t, b + 0.3), bg: 'rgba(255,200,58,0.16)', border: COR.ouro, color: COR.ouro });
}

// ================================================================== 14. FINAL
async function final(ctx, t, E) {
  F.fundo(ctx, t, { tint: 'rgba(255,190,60,0.16)' });
  const s = setTrofeu();
  const a = E.f('n14a'), b = E.f('n14b');
  const pb = easeInOutCubic(ap(t, b - 0.2, 1.0));
  s.cam.position.set(Math.sin(t * 0.3) * 0.6, lerp(2.2, 1.7, pb), lerp(12.5, 9.2, pb));
  s.cam.lookAt(0, lerp(1.0, 1.3, pb), 0);
  desenhaTrofeu(ctx, t, lerp(0, 0, pb));
  F.brilhos(ctx, t, 8, { n: 50, color: '#ffe7a0', alpha: 0.6 });
  // resumo
  const res = [
    [F.iconeCadeado, COR.reserva, 'RESERVA', 'PRIMEIRO'],
    [F.iconeCoracao, COR.pai, 'PRESENTE', 'COM CARINHO'],
    [F.iconeLapis, COR.proj, 'PROJETOS', 'SEM DÍVIDA'],
  ];
  res.forEach(([ic, cor, l1, l2], i) => {
    const ti = a + 0.2 + i * 1.1;
    const al = vis(t, ti, b - 0.1);
    if (al <= 0) return;
    const e = easeOutBack(ap(t, ti, 0.45), 1.8);
    const x = W / 2 + (i - 1) * 560, y = 330;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.translate(x, y + (1 - e) * 80);
    ctx.scale(lerp(0.6, 1, e), lerp(0.6, 1, e));
    F.painel(ctx, -240, -150, 480, 300, { border: cor, borderW: 4 });
    ic(ctx, 0, -60, 90, cor);
    txt(ctx, l1, 0, 40, 46, { weight: 900, align: 'center' });
    txt(ctx, l2, 0, 95, 36, { weight: 800, color: cor, align: 'center' });
    ctx.restore();
  });
  F.titulo(ctx, t, 'BOA SORTE NA FINAL,', W / 2, 150, { at: b, size: 78 });
  F.titulo(ctx, t, 'DANIEL!', W / 2, 262, { at: b + 0.35, size: 120, fill: COR.ouro, glow: 'rgba(255,200,58,0.55)' });
  ['DANIEL', 'GABRIEL', 'VITOR', 'CLEBER'].forEach((n, i) => {
    const ti = b + 1.8 + i * 0.35;
    F.pill(ctx, n, W / 2 + (i - 1.5) * 260, 820, { size: 30, bg: i === 0 ? COR.ouro : 'rgba(12,16,44,0.88)', color: i === 0 ? '#1a1200' : '#fff', border: i ? 'rgba(255,255,255,0.3)' : null, alpha: ap(t, ti, 0.3), scale: lerp(0.4, 1, easeOutBack(ap(t, ti, 0.35), 2.5)) });
  });
  F.pill(ctx, 'FINAL DO EMPREENDA · 26/11/2026', W / 2, 740, { size: 26, dot: COR.ouro, alpha: ap(t, b + 3.2, 0.4) });
  F.confete(ctx, t - b - 0.3, 21, { n: 110 });
  const fim = E.fe('n14b') + 0.4;
  ctx.save();
  ctx.globalAlpha = ap(t, fim, 0.5) * 0.9;
  txt(ctx, 'Valores estimados em novembro de 2026 (anúncios OLX/Mercado Livre, Samsung, Banco Central).', W / 2, 950, 24, { weight: 600, color: '#c9cfe8', align: 'center' });
  txt(ctx, 'Confira preços, taxas e o regulamento do prêmio antes de decidir. Não é recomendação oficial de investimento.', W / 2, 990, 24, { weight: 600, color: '#c9cfe8', align: 'center' });
  ctx.restore();
}

export const CENAS = { abertura, premio, avisos, lista, pai, dicas, vale, regra, caixa, trilhas, flipaclip, tablet, cenarios, final };

/** Cria todos os conjuntos 3D antes do primeiro quadro (evita travadas e mantém os workers iguais). */
export async function preparar(E) {
  setTrofeu(); setPremio(); setAvisos(); setLista(); setPai(E); setVale(); setRegra(); setCaixa(); setTrilhas(); setFlipa(); setTablet(E); setCenarios();
}
