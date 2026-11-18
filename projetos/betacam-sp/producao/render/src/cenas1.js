// Cenas 01–06: introdução, origem, preço, fita S, fita L, videocassete.
import * as THREE from 'three';
import { clamp, prog, lerp, smooth, easeOutExpo, easeOutBack, fbm, ruido, canvas, janela } from './util.js';
import { texto3D, animarLetras } from './texto3d.js';
import { callout, cota, cartao, textoKinetico, linha, COR, projetar } from './overlay.js';
import { estudio, camera, trilho, usar, chaves } from './base.js';
import { DIM, criarFita } from './fita.js';
import { DK } from './deck.js';
import { bandeiraJapao, etiquetaPreco } from './extras.js';
import { W, H } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const local = (obj, x, y, z) => (obj.grupo ?? obj).localToWorld(new THREE.Vector3(x, y, z));
const tc = (lt, base = 0) => {
  const fr = Math.floor((lt + base) * 29.97);
  const f = fr % 30, s = Math.floor(fr / 30) % 60, m = Math.floor(fr / 1800) % 60, h = Math.floor(fr / 108000);
  return [h, m, s, f].map((v) => String(v).padStart(2, '0')).join(':');
};
export { tc };

function deckLigado(dk, lt, o = {}) {
  dk.setPower(1);
  dk.setLuz(o.luz ?? 1);
  dk.setVU(0.3 + 0.32 * Math.abs(fbm(lt * 3.1, 3)), 0.28 + 0.32 * Math.abs(fbm(lt * 2.9, 5)), 0.55 + 0.05 * ruido(lt * 4, 2));
  dk.setContador(o.contador ?? tc(lt, 754));
}
export { deckLigado };

// ------------------------------------------------------------------ 01 · INTRODUÇÃO
export const s01 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-6, 7, 5], key: 0, angulo: 0.45, posRim: [5, 5, -7], rim: 220, alvo: [0, 0.2, -1] }, zFundo: -10 });
    S.e = e;
    S.cam = camera(26);
    S.t1 = texto3D('BETACAM', { fonte: 'titulo', tam: 0.34, mat: 'branco', esp: 0.02 });
    S.t2 = texto3D('SP', { fonte: 'titulo', tam: 0.34, mat: 'ouro' });
    S.tit = new THREE.Group();
    const gap = 0.14, tot = S.t1.larg + gap + S.t2.larg;
    S.t1.grupo.position.x = -tot / 2 + S.t1.larg / 2;
    S.t2.grupo.position.x = tot / 2 - S.t2.larg / 2;
    S.tit.add(S.t1.grupo, S.t2.grupo);
    S.tit.position.set(0.15, 0.82, -0.6);
    S.tit.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    e.cena.add(S.tit);
  },
  quadro(lt, S, A) {
    const { cena, L } = S.e, cam = S.cam;
    const f = usar(cena, A.fitaL);
    f.grupo.position.set(0, DIM.L.h / 2, 0.25);
    f.grupo.rotation.y = 0.22;
    f.setCarretel(0.85);
    const pilha1 = usar(cena, A.fitaL2), pilha2 = usar(cena, A.fitaS2);
    pilha1.grupo.position.set(-2.7, DIM.L.h / 2, -1.3); pilha1.grupo.rotation.y = 0.55;
    pilha2.grupo.position.set(-2.6, DIM.L.h * 1.5 + 0.004, -1.25); pilha2.grupo.rotation.y = 0.3;
    pilha2.sombra.visible = false;
    const dk = usar(cena, A.deck);
    dk.grupo.position.set(0.9, 0, -4.4);
    dk.grupo.rotation.y = -0.32;
    deckLigado(dk, lt, { luz: smooth(prog(lt, 8, 10)) });
    dk.verInterno = lt > S.f[2] + 3.2;
    dk.setTampaSup(chaves(lt, [[S.f[2] + 3.2, 0], [S.f[2] + 4.2, 0.18], [S.dur, 0.2]]));
    // luz principal varre a cena no começo
    L.key.intensity = 300 * (0.35 + 0.65 * smooth(prog(lt, 0.2, 2.2)));
    L.key.position.set(lerp(-9, -5, smooth(prog(lt, 0, 4))), 7, lerp(2, 5, smooth(prog(lt, 0, 4))));
    L.rim.intensity = 220 * smooth(prog(lt, 0.6, 2.6));
    // título 3D
    animarLetras(S.t1, lt, 2.0, 7.0, { tipo: 'voo', stagger: 0.07, dur: 1.1, z0: 3, ySaida: 1.2, zSaida: 1.0 });
    animarLetras(S.t2, lt, 2.6, 7.1, { tipo: 'escala', stagger: 0.1, dur: 0.8, ySaida: 1.2, zSaida: 1.0 });
    S.tit.visible = lt < 8.5;
    S.tit.rotation.y = -0.12 + lt * 0.012;
    trilho(cam, lt, [
      [0, [1.45, 0.66, 0.05], [0.9, 0.25, -0.62], 24],
      [1.6, [0.6, 0.64, 0.3], [0.1, 0.25, -0.5], 24],
      [4.6, [0.4, 0.8, 4.3], [0.15, 0.62, -0.4], 26],
      [7.2, [0.3, 0.9, 4.5], [0.1, 0.52, -0.4], 26],
      [10.6, [-1.0, 1.7, 4.9], [-0.3, 0.4, -1.4], 28],
      [15.2, [-3.6, 1.3, 3.0], [-0.6, 0.35, -0.9], 28],
      [S.f[2] + 2.0, [0.4, 1.9, 4.8], [0.4, 0.8, -2.8], 28],
      [S.dur, [1.6, 2.4, 3.6], [0.8, 0.9, -3.6], 28],
    ], { mao: 0.01 });
    const alvoFoco = lt < 1.9 ? V(0.6, 0.25, -0.6) : lt < 9 ? V(0.1, 0.6, -0.5) : lt < S.f[2] + 1 ? V(0, 0.2, 0.2) : V(0.9, 0.9, -4.2);
    const foco = cam.position.distanceTo(alvoFoco);
    return {
      cena, cam, semEtiqueta: true,
      pos: { dof: { focus: foco, aperture: lt < 9 ? 0.0035 : 0.0016, maxblur: 0.009 }, bloom: 0.35, exposure: 1.05 },
      overlay(ctx) {
        textoKinetico(ctx, 'A FITA QUE GRAVOU A HISTÓRIA DA TV', W / 2, 860, 46, lt, 3.3, { al: 'centro', fam: 'Rajdhani', peso: 700, esp: 6, t1: 7.0, cor: COR.branco });
        linha(ctx, W / 2 - 240, 885, W / 2 + 240, 885, smooth(prog(lt, 3.6, 4.4)) * (1 - smooth(prog(lt, 7.0, 7.5))));
        textoKinetico(ctx, 'QUASE 20 ANOS', 140, 820, 96, lt, S.f[1] + 0.9, { peso: 900, t1: S.fe[1] + 0.2, grad: ['#fff1c8', '#e0a63c'] });
        textoKinetico(ctx, 'O PADRÃO DAS EMISSORAS DE TV', 146, 880, 40, lt, S.f[1] + 1.3, { fam: 'Rajdhani', peso: 700, esp: 4, t1: S.fe[1] + 0.2 });
        textoKinetico(ctx, 'POR FORA', 160, 860, 84, lt, S.f[2] + 2.1, { peso: 900, t1: S.dur - 0.8 });
        textoKinetico(ctx, '...E POR DENTRO', W - 160, 860, 84, lt, S.f[2] + 3.2, { peso: 900, al: 'dir', t1: S.dur - 0.8, grad: ['#fff1c8', '#e0a63c'] });
      },
    };
  },
  sons(S) { return [['luz_liga', 0.3], ['whoosh_longo', 1.8], ['impacto_grande', 2.9], ['brilho', 3.0], ['whoosh', 7.0], ['whoosh', S.f[1] + 0.8], ['impacto_suave', S.f[1] + 1.0], ['pop', S.f[2] + 2.1], ['mecanico', S.f[2] + 3.2], ['pop', S.f[2] + 3.3]]; },
};

// ------------------------------------------------------------------ 02 · ORIGEM E HISTÓRIA
function imagemComponentes(tipo) {
  // imagem colorida simples -> Y (brilho), R-Y e B-Y (diferenças de cor)
  const w = 320, h = 240, c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3f8ee0'); g.addColorStop(0.6, '#bfe3ff'); g.addColorStop(0.6, '#3d9a3d'); g.addColorStop(1, '#2a6a22');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(250, 55, 30, 0, 7); x.fill();
  x.fillStyle = '#d23a2a'; x.fillRect(60, 110, 90, 60);
  x.fillStyle = '#7a2a1a'; x.beginPath(); x.moveTo(50, 112); x.lineTo(105, 70); x.lineTo(160, 112); x.fill();
  x.fillStyle = '#f2e6c8'; x.fillRect(92, 135, 24, 35);
  x.fillStyle = '#7a3ac8'; x.beginPath(); x.arc(220, 175, 28, 0, 7); x.fill();
  if (tipo === 'cor') { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const d = x.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    const R = d.data[i * 4] / 255, G = d.data[i * 4 + 1] / 255, B = d.data[i * 4 + 2] / 255;
    const Y = 0.299 * R + 0.587 * G + 0.114 * B;
    let o;
    if (tipo === 'Y') o = [Y, Y, Y];
    else if (tipo === 'RY') { const v = (R - Y) * 1.4; o = [0.5 + v, 0.5 - v * 0.5, 0.5 - v * 0.5]; }
    else { const v = (B - Y) * 1.4; o = [0.5 - v * 0.5, 0.5 - v * 0.3, 0.5 + v]; }
    d.data[i * 4] = clamp(o[0]) * 255; d.data[i * 4 + 1] = clamp(o[1]) * 255; d.data[i * 4 + 2] = clamp(o[2]) * 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const s02 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [3, 8, 6], key: 300, angulo: 0.9, posRim: [6, 5, -8], rim: 160, alvo: [5, 0, 0] }, zFundo: -8 });
    S.e = e;
    S.cam = camera(28);
    // trilho dourado da linha do tempo
    const trilhoM = new THREE.Mesh(new THREE.BoxGeometry(16, 0.012, 0.025), new THREE.MeshStandardMaterial({ color: '#f0c66a', metalness: 1, roughness: 0.3, emissive: '#6a4a10', emissiveIntensity: 0.8 }));
    trilhoM.position.set(5, 0.006, 1.0);
    e.cena.add(trilhoM);
    S.trilho = trilhoM;
    S.anos = [['1975', 0, 'branco'], ['1982', 4.5, 'branco'], ['1986', 9.5, 'ouro']].map(([a, x, m]) => {
      const t = texto3D(a, { fonte: 'titulo', tam: 0.5, mat: m });
      t.grupo.position.set(x + 0.15, 0.25, -0.95);
      t.grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      e.cena.add(t.grupo);
      const marco = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20), new THREE.MeshStandardMaterial({ color: '#f0c66a', metalness: 1, roughness: 0.3, emissive: '#7a5410', emissiveIntensity: 1 }));
      marco.position.set(x, 0.015, 1.0);
      e.cena.add(marco);
      return t;
    });
    S.betamax = criarFita('S', { marca: 'betamax', cor: '#1e1e21', fracao: 0.7 });
    S.betamax.grupo.position.set(0, DIM.S.h / 2, 0.15);
    S.betamax.grupo.rotation.y = -0.25;
    S.betacam = criarFita('S', { marca: 'betacam', cor: '#232326', fracao: 0.5 });
    S.betacam.grupo.position.set(4.5, DIM.S.h / 2, 0.15);
    S.betacam.grupo.rotation.y = -0.2;
    e.cena.add(S.betamax.grupo, S.betacam.grupo);
    // planos de componentes (Y, R-Y, B-Y) a partir de uma imagem colorida
    S.comp = ['cor', 'Y', 'RY', 'BY'].map((k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.69), new THREE.MeshBasicMaterial({ map: imagemComponentes(k), toneMapped: false, transparent: true }));
      m.position.set(6.95, 0.75, -0.2);
      e.cena.add(m);
      return m;
    });
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const f = usar(cena, A.fitaL);
    f.grupo.position.set(9.5, DIM.L.h / 2, 0.1);
    f.grupo.rotation.y = -0.15 + lt * 0.004;
    f.setCarretel(0.8);
    animarLetras(S.anos[0], lt, 1.0, null, { tipo: 'giro', stagger: 0.07 });
    animarLetras(S.anos[1], lt, S.f[1] + 0.6, null, { tipo: 'giro', stagger: 0.07 });
    animarLetras(S.anos[2], lt, S.f[3] + 0.6, null, { tipo: 'giro', stagger: 0.07 });
    // componentes: começam juntos e se separam
    const sep = smooth(prog(lt, S.f[2] + 0.6, S.f[2] + 2.2));
    const vis = janela(lt, S.f[2] - 0.6, S.f[3] + 1.2, 0.5, 0.6);
    S.comp.forEach((m, i) => {
      m.visible = vis > 0.01;
      m.material.opacity = vis * (i === 0 ? 1 - sep * 0.9 : smooth(prog(lt, S.f[2] + 0.3 + i * 0.15, S.f[2] + 0.9 + i * 0.15)));
      const k = i === 0 ? 0 : i;
      m.position.set(6.95 + (k - 2) * 1.04 * sep, 0.75, -0.2 - (i === 0 ? 0.25 * sep : 0));
      m.rotation.y = (k - 2) * -0.22 * sep;
    });
    trilho(cam, lt, [
      [0, [-1.6, 0.6, 2.8], [0, 0.3, -0.2], 30],
      [2.0, [0.5, 0.95, 2.7], [0, 0.3, -0.3], 30],
      [S.f[1] - 0.4, [0.9, 0.9, 2.5], [0.2, 0.3, -0.3], 30],
      [S.f[1] + 1.2, [5.0, 0.95, 2.7], [4.5, 0.3, -0.3], 30],
      [S.f[2] - 0.2, [5.3, 0.9, 2.5], [4.7, 0.3, -0.3], 30],
      [S.f[2] + 1.2, [6.95, 0.95, 3.3], [6.95, 0.72, -0.2], 30],
      [S.f[3] - 0.2, [6.95, 0.95, 3.5], [6.95, 0.72, -0.2], 30],
      [S.f[3] + 1.5, [10.3, 1.05, 3.0], [9.5, 0.35, -0.3], 28],
      [S.dur, [9.9, 0.7, 2.3], [9.4, 0.3, -0.2], 26],
    ], { mao: 0.008 });
    const alvo = lt < S.f[1] + 0.5 ? V(0, 0.2, 0) : lt < S.f[2] + 0.4 ? V(4.5, 0.2, 0) : lt < S.f[3] + 0.8 ? V(6.95, 0.75, -0.2) : V(9.5, 0.2, 0);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0022, maxblur: 0.008 }, bloom: 0.3 },
      overlay(ctx) {
        const bloco = (t0, t1, a, b) => {
          textoKinetico(ctx, a, 140, 800, 92, lt, t0, { peso: 900, t1, grad: ['#ffffff', '#c8c8c8'] });
          textoKinetico(ctx, b, 146, 862, 40, lt, t0 + 0.35, { fam: 'Rajdhani', peso: 700, esp: 4, t1, cor: COR.ouro });
        };
        bloco(2.4, S.f[1] - 0.6, 'BETAMAX', 'VÍDEO DOMÉSTICO DA SONY');
        bloco(S.f[1] + 1.4, S.f[2] - 0.5, 'BETACAM', 'FORMATO PROFISSIONAL');
        const tY = S.f[2] + 1.6, tS = S.f[3] - 0.3;
        const lbl = (i, txt, cor) => {
          const m = S.comp[i];
          const p = projetar(cam, V(m.position.x, 0.75 - 0.345, m.position.z));
          textoKinetico(ctx, txt, p.x, p.y + 50, 36, lt, tY + i * 0.2, { fam: 'Rajdhani', peso: 700, al: 'centro', t1: tS, cor });
        };
        lbl(1, 'Y · BRILHO', COR.branco); lbl(2, 'R-Y · COR', '#ff8a8a'); lbl(3, 'B-Y · COR', '#8ac4ff');
        textoKinetico(ctx, 'IMAGEM EM COMPONENTES', W / 2, 205, 52, lt, S.f[2] + 0.4, { al: 'centro', peso: 800, t1: tS });
        textoKinetico(ctx, 'BETACAM SP', 140, 780, 92, lt, S.f[3] + 1.0, { peso: 900, t1: S.dur - 0.7, grad: ['#fff1c8', '#e0a63c'] });
        textoKinetico(ctx, 'SUPERIOR PERFORMANCE', 146, 842, 42, lt, S.f[3] + 1.5, { fam: 'Rajdhani', peso: 700, esp: 5, t1: S.dur - 0.7 });
        cartao(ctx, 1240, 700, [['FITA DE PARTÍCULAS METÁLICAS', { tam: 34, peso: 700 }], ['Imagem mais nítida', { cor: COR.ouro }], ['Cor e brilho gravados separados', { tam: 32 }]], lt, S.f[3] + 3.4, S.dur - 0.7, { w: 560 });
      },
    };
  },
  sons(S) { return [['whoosh', 0.9], ['impacto_suave', 1.2], ['whoosh_longo', S.f[1] + 0.4], ['impacto_suave', S.f[1] + 0.9], ['whoosh', S.f[2] + 0.3], ['brilho', S.f[2] + 1.2], ['whoosh_longo', S.f[3] - 0.1], ['impacto_grande', S.f[3] + 0.9]]; },
};

// ------------------------------------------------------------------ 03 · PREÇO E LANÇAMENTO
export const s03 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-3, 9, 5], key: 380, angulo: 0.5, posRim: [5, 6, -8], rim: 200, alvo: [0, 0.6, -2] }, zFundo: -9 });
    S.e = e;
    S.cam = camera(30);
    S.a86 = texto3D('1986', { fonte: 'titulo', tam: 0.42, mat: 'ouro' });
    S.a86.grupo.position.set(-1.05, 0.24, 1.4);
    S.a87 = texto3D('1987', { fonte: 'titulo', tam: 0.42, mat: 'branco' });
    S.a87.grupo.position.set(1.05, 0.24, 1.4);
    for (const t of [S.a86, S.a87]) { t.grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; }); e.cena.add(t.grupo); }
    S.flag = bandeiraJapao();
    S.flag.position.set(-1.05, 0.95, 1.25);
    S.flag.scale.setScalar(0.42);
    e.cena.add(S.flag);
    // anel de pontos (o mundo)
    const pts = new THREE.Group();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: '#9fd0ff', emissive: '#5ab0ff', emissiveIntensity: 2 }));
      d.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
      pts.add(d);
    }
    pts.position.set(1.05, 0.95, 1.25);
    e.cena.add(pts);
    S.mundo = pts;
    // prato giratório
    S.prato = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.05, 0.08, 96), new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.75, metalness: 0.1 }));
    S.prato.position.set(0, 0.04, -4.2);
    S.prato.receiveShadow = true;
    e.cena.add(S.prato);
    S.tag = etiquetaPreco();
    e.cena.add(S.tag.grupo);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const tSai = S.f[1] + 0.2;
    animarLetras(S.a86, lt, 2.3, tSai, { tipo: 'queda', stagger: 0.08, ySaida: 1.5 });
    animarLetras(S.a87, lt, 5.2, tSai + 0.1, { tipo: 'queda', stagger: 0.08, ySaida: 1.5 });
    const some = 1 - smooth(prog(lt, tSai, tSai + 0.6));
    S.flag.visible = lt > 2.8 && some > 0.01;
    S.flag.rotation.y = -0.2 + Math.sin(lt * 0.8) * 0.08;
    S.flag.position.y = 0.95 - (1 - easeOutBack(prog(lt, 2.8, 3.6))) * 1.4;
    S.flag.scale.setScalar(0.42 * some);
    S.mundo.visible = lt > 6 && some > 0.01;
    S.mundo.rotation.z = lt * 0.3;
    S.mundo.scale.setScalar(Math.max(0.001, easeOutBack(prog(lt, 6, 6.8)) * some));
    const dk = usar(cena, A.deck);
    const giro = lerp(-0.95, 0.3, smooth(prog(lt, 0, S.f[2] + 1.0)));
    S.prato.rotation.y = giro;
    const piv = V(0, 0.08, -4.2);
    const off = V(0, 0, DK.D / 2).applyAxisAngle(V(0, 1, 0), giro);
    dk.grupo.position.copy(piv).add(off);
    dk.grupo.rotation.y = giro;
    deckLigado(dk, lt, { luz: 1 });
    dk.grupo.updateMatrixWorld(true);
    // etiqueta presa na alça direita
    const al = dk.grupo.localToWorld(dk.pos(4.1, 1.25, 0.18));
    S.tag.grupo.position.copy(al).add(V(0.5, -0.12 + Math.sin(lt * 1.3) * 0.02, 0.12).applyAxisAngle(V(0, 1, 0), giro));
    S.tag.grupo.rotation.set(0, giro + Math.sin(lt * 0.9) * 0.15, -0.12 + Math.sin(lt * 1.1) * 0.05);
    S.tag.grupo.visible = lt > S.f[2] - 0.2;
    S.tag.grupo.scale.setScalar(Math.max(0.001, easeOutBack(prog(lt, S.f[2] - 0.2, S.f[2] + 0.5))));
    const p = smooth(prog(lt, S.f[2] + 2.6, S.f[2] + 4.6));
    S.tag.set(`US$ ${Math.round(lerp(0, 200, smooth(prog(lt, S.f[2] + 0.6, S.f[2] + 2.2))))}${p > 0 ? ' – ' + Math.round(lerp(200, 2300, p)).toLocaleString('pt-BR') : ''}`, p >= 1 ? 'videocassete Betacam SP usado' : '');
    trilho(cam, lt, [
      [0, [0.0, 0.85, 6.0], [0.0, 0.62, 1.3], 30],
      [S.f[1] - 0.6, [0.0, 0.95, 5.6], [0.0, 0.65, 1.3], 30],
      [S.f[1] + 1.4, [-3.0, 2.6, 5.0], [0, 0.9, -4.0], 30],
      [S.f[2] - 0.4, [2.0, 2.2, 4.2], [0.6, 0.9, -3.6], 30],
      [S.dur, [2.6, 1.6, 2.8], [2.2, 0.9, -1.6], 30],
    ], { mao: 0.01 });
    const alvo = lt < S.f[1] + 0.6 ? V(0, 0.6, 1.3) : lt < S.f[2] ? V(0, 0.9, -4.0) : S.tag.grupo.position;
    if (lt > S.f[2] - 0.6) {
      // aproxima da etiqueta de preço
      const k = smooth(prog(lt, S.f[2] - 0.6, S.f[2] + 1.4));
      const tg = S.tag.grupo.position;
      const perto = tg.clone().add(V(-1.1, 0.5, 3.3).applyAxisAngle(V(0, 1, 0), giro * 0.6));
      cam.position.lerp(perto, k);
      cam.lookAt(new THREE.Vector3().lerpVectors(V(0.6, 0.9, -3.6), tg.clone().add(V(-0.25, 0.05, 0)), k));
      cam.updateMatrixWorld(true);
    }
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.002, maxblur: 0.008 }, bloom: 0.32 },
      overlay(ctx) {
        const p86 = projetar(cam, V(-1.05, 0.1, 1.4)), p87 = projetar(cam, V(1.05, 0.1, 1.4));
        textoKinetico(ctx, 'LANÇAMENTO NO JAPÃO', p86.x, p86.y + 56, 36, lt, 3.0, { fam: 'Rajdhani', peso: 700, al: 'centro', t1: S.f[1] - 0.3, cor: COR.ouro });
        textoKinetico(ctx, 'NO RESTO DO MUNDO', p87.x, p87.y + 56, 36, lt, 5.9, { fam: 'Rajdhani', peso: 700, al: 'centro', t1: S.f[1] - 0.3, cor: COR.azul });
        cartao(ctx, 120, 200, [['EQUIPAMENTO DE EMISSORA', { tam: 40, peso: 700, cor: COR.ouro }], 'Vendido para TVs e produtoras', ['Não era aparelho de loja', { cor: '#ff8a80' }]], lt, S.f[1] + 1.2, S.f[2] - 0.3, { w: 620 });
        textoKinetico(ctx, 'HOJE, NO MERCADO DE USADOS', 120, 200, 46, lt, S.f[2] + 0.4, { peso: 800, t1: S.dur - 0.7 });
        textoKinetico(ctx, 'faixa vista em anúncios de usados (varia com o estado do aparelho)', 124, 250, 30, lt, S.f[2] + 1.0, { fam: 'Rajdhani', peso: 600, t1: S.dur - 0.7, cor: COR.cinza });
      },
    };
  },
  sons(S) { return [['impacto_suave', 2.5], ['impacto_suave', 5.4], ['brilho', 6.0], ['whoosh_longo', S.f[1] + 0.2], ['pop', S.f[2] - 0.1], ['contador', S.f[2] + 0.6], ['contador', S.f[2] + 2.6], ['ding', S.f[2] + 4.6]]; },
};

// ------------------------------------------------------------------ 04 · FITA S
export const s04 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-4, 7, 5], key: 240, angulo: 0.5, posRim: [3, 4, -6], rim: 200 }, corFundo: '#1b1d22' });
    S.e = e;
    S.cam = camera(28);
    S.letra = texto3D('S', { fonte: 'titulo', tam: 2.4, mat: 'ouro', prof: 0.45 });
    S.letra.grupo.position.set(1.9, 1.05, -2.6);
    S.letra.grupo.rotation.y = -0.4;
    S.letra.grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    e.cena.add(S.letra.grupo);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const f = usar(cena, A.fitaS);
    const D = DIM.S;
    f.grupo.position.set(0, D.h / 2 + 0.002, 0);
    f.grupo.rotation.set(0, chaves(lt, [[0, -0.55], [S.f[1], -0.2], [S.f[2], 0.0], [S.f[3], 0.35], [S.dur, 0.6]]), 0);
    f.setTampa(chaves(lt, [[S.f[2] + 2.2, 0], [S.f[2] + 2.9, 0.85], [S.f[2] + 4.6, 0.85], [S.f[2] + 5.3, 0]]));
    f.setCarretel(0.9);
    animarLetras(S.letra, lt, 2.4, null, { tipo: 'queda', dur: 0.9 });
    trilho(cam, lt, [
      [0, [-1.6, 0.35, 2.6], [0, 0.1, 0], 30],
      [S.f[1] - 0.3, [-0.6, 1.25, 2.3], [0, 0.05, 0], 30],
      [S.f[2] - 0.2, [0.3, 2.7, 1.7], [0, 0, 0.05], 30],
      [S.f[2] + 2.0, [-0.9, 1.1, 1.9], [-0.2, 0.1, -0.1], 28],
      [S.f[3], [1.4, 1.0, 2.2], [0, 0.1, 0], 28],
      [S.dur, [1.9, 0.7, 2.6], [0.1, 0.15, 0], 26],
    ]);
    const dist = cam.position.length();
    return {
      cena, cam,
      pos: { dof: { focus: dist, aperture: 0.0016, maxblur: 0.007 }, bloom: 0.25 },
      overlay(ctx) {
        const g = f.grupo;
        const t1 = S.f[2] - 0.3;
        cota(ctx, cam, local(g, -D.w / 2, D.h / 2, D.d / 2 + 0.08), local(g, D.w / 2, D.h / 2, D.d / 2 + 0.08), '156 mm', lt, S.f[1] + 0.2, { t1 });
        cota(ctx, cam, local(g, D.w / 2 + 0.08, D.h / 2, D.d / 2), local(g, D.w / 2 + 0.08, D.h / 2, -D.d / 2), '96 mm', lt, S.f[1] + 0.7, { t1, ox: 70, oy: 0 });
        cota(ctx, cam, local(g, -D.w / 2 - 0.06, -D.h / 2, D.d / 2), local(g, -D.w / 2 - 0.06, D.h / 2, D.d / 2), '25 mm', lt, S.f[1] + 1.2, { t1, ox: -80, oy: 0, tam: 34 });
        textoKinetico(ctx, '= TAMANHO DE UMA FITA BETAMAX', W / 2, 205, 44, lt, S.f[1] + 2.4, { al: 'centro', peso: 800, t1 });
        callout(ctx, cam, local(g, -0.42, D.h / 2, 0.0), 'Janela do carretel', lt, S.f[2] + 0.2, { lado: 'esq', dx: 120, dy: -120, t1: S.f[3] - 0.2 });
        callout(ctx, cam, local(g, 0.35, D.h / 2 + 0.05, -D.d / 2 + 0.05), 'Tampa antiestática', lt, S.f[2] + 2.2, { lado: 'dir', dx: 140, dy: -110, t1: S.f[3] - 0.2, sub: 'protege contra poeira e estática' });
        cartao(ctx, 1220, 640, [['FITA S · PEQUENA', { tam: 40, peso: 700, cor: COR.ouro }], 'Leve e rápida de trocar', 'Câmeras de reportagem (ENG)'], lt, S.f[3] + 0.2, S.dur - 0.6, { w: 600 });
      },
    };
  },
  sons(S) { return [['impacto_suave', 2.75], ['pop', S.f[1] + 0.2], ['pop', S.f[1] + 0.7], ['pop', S.f[1] + 1.2], ['pop', S.f[2] + 0.2], ['tampa_abre', S.f[2] + 2.25], ['tampa_fecha', S.f[2] + 4.7], ['whoosh', S.f[3] + 0.1]]; },
};

// ------------------------------------------------------------------ 05 · FITA L
export const s05 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-5, 8, 5], key: 300, angulo: 0.55, posRim: [4, 5, -7], rim: 200 }, corFundo: '#1b1d22' });
    S.e = e;
    S.cam = camera(28);
    S.letra = texto3D('L', { fonte: 'titulo', tam: 2.6, mat: 'ouro', prof: 0.45 });
    S.letra.grupo.position.set(2.6, 1.1, -3.0);
    S.letra.grupo.rotation.y = -0.45;
    S.letra.grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    e.cena.add(S.letra.grupo);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const fS = usar(cena, A.fitaS), fL = usar(cena, A.fitaL);
    fS.grupo.position.set(-1.75, DIM.S.h / 2, 0.35);
    fS.grupo.rotation.y = 0.12;
    fS.setCarretel(0.9);
    const ent = easeOutExpo(prog(lt, 1.6, 3.0));
    fL.grupo.position.set(lerp(5, 0.5, ent), DIM.L.h / 2, 0);
    fL.grupo.rotation.y = lerp(-0.6, -0.05, ent) + Math.max(0, lt - 12) * 0.01;
    fL.setCarretel(0.9);
    const rx = smooth(prog(lt, S.f[2] + 0.6, S.f[2] + 1.8)) * (1 - smooth(prog(lt, S.dur - 1.6, S.dur - 0.6)));
    fL.setRaioX(rx * 0.92);
    fS.setRaioX(rx * 0.92);
    const giro = Math.max(0, lt - S.f[2] - 1.0) * 1.2;
    fL.girar(giro); fS.girar(giro * 1.4);
    animarLetras(S.letra, lt, 2.6, null, { tipo: 'queda', dur: 0.9 });
    trilho(cam, lt, [
      [0, [-0.6, 2.7, 4.9], [-0.5, 0.1, 0], 30],
      [S.f[1] - 0.3, [-0.2, 2.8, 4.5], [-0.3, 0.1, 0], 30],
      [S.f[1] + 2.5, [1.2, 2.2, 3.0], [0.5, 0.1, 0], 30],
      [S.f[2] + 0.3, [-0.4, 3.2, 3.0], [-0.4, 0.0, 0.1], 30],
      [S.dur, [-0.2, 2.6, 3.6], [-0.4, 0.05, 0.0], 30],
    ], { mao: 0.008 });
    const foco = cam.position.distanceTo(V(0.2, 0.1, 0));
    return {
      cena, cam,
      pos: { dof: { focus: foco, aperture: 0.0016, maxblur: 0.007 }, bloom: 0.25 },
      overlay(ctx) {
        const g = fL.grupo, D = DIM.L, t1 = S.f[2] - 0.2;
        cota(ctx, cam, local(g, -D.w / 2, D.h / 2, D.d / 2 + 0.1), local(g, D.w / 2, D.h / 2, D.d / 2 + 0.1), '253 mm', lt, S.f[1] + 0.2, { t1 });
        cota(ctx, cam, local(g, D.w / 2 + 0.1, D.h / 2, D.d / 2), local(g, D.w / 2 + 0.1, D.h / 2, -D.d / 2), '144 mm', lt, S.f[1] + 0.8, { t1, ox: -95, oy: 0 });
        callout(ctx, cam, local(g, -0.75, D.h / 2, -0.15), '2 janelas', lt, S.f[1] + 2.4, { lado: 'esq', dx: 100, dy: -150, t1 });
        callout(ctx, cam, local(g, 0.65, D.h / 2, 0.1), '2 carretéis à mostra', lt, S.f[1] + 3.2, { lado: 'dir', dx: 120, dy: -170, t1 });
        const pS = projetar(cam, local(fS.grupo, 0, 0, 0.6)), pL = projetar(cam, local(g, 0, 0, 0.85));
        textoKinetico(ctx, 'S', pS.x, pS.y + 70, 54, lt, 3.4, { al: 'centro', peso: 900, t1: S.f[1] - 0.1, cor: COR.branco });
        textoKinetico(ctx, 'L', pL.x, pL.y + 70, 54, lt, 3.6, { al: 'centro', peso: 900, t1: S.f[1] - 0.1, cor: COR.ouro });
        textoKinetico(ctx, 'MUITO MAIS FITA', W / 2, 205, 64, lt, S.f[2] + 1.4, { al: 'centro', peso: 900, t1: S.dur - 0.7, grad: ['#fff1c8', '#e0a63c'] });
        cartao(ctx, 1240, 700, [['FITA L · GRANDE', { tam: 40, peso: 700, cor: COR.ouro }], 'Ilhas de edição', 'Exibição dos programas'], lt, S.f[2] + 3.0, S.dur - 0.6, { w: 560 });
      },
    };
  },
  sons(S) { return [['whoosh_longo', 1.5], ['impacto_suave', 2.9], ['impacto_suave', 3.0], ['pop', S.f[1] + 0.2], ['pop', S.f[1] + 0.8], ['pop', S.f[1] + 2.4], ['pop', S.f[1] + 3.2], ['raiox', S.f[2] + 0.6], ['carretel', S.f[2] + 1.0]]; },
};

// ------------------------------------------------------------------ 06 · VIDEOCASSETE
export const s06 = {
  preparar(A, S) {
    S.e = estudio({ luz: { posKey: [-6, 9, 8], key: 420, angulo: 0.6, posRim: [6, 6, -8], rim: 220, alvo: [0, 0.9, -1.5] }, zFundo: -9 });
    S.cam = camera(30);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam, dk = usar(cena, A.deck);
    dk.grupo.position.set(0, 0.03, 0);
    deckLigado(dk, lt, { luz: smooth(prog(lt, 0.3, 1.6)) });
    trilho(cam, lt, [
      [0, [-5.2, 2.2, 5.0], [0, 1.0, -1.0], 32],
      [S.f[1] - 0.2, [-2.2, 1.9, 4.2], [-0.4, 1.3, 0], 30],
      [S.f[2] - 0.6, [0.6, 2.0, 4.4], [0.4, 1.25, 0], 30],
      [S.f[2] + 1.6, [1.6, 0.95, 3.6], [1.0, 0.55, 0], 30],
      [S.dur, [3.6, 1.3, 4.6], [0.4, 0.8, -0.5], 30],
    ], { mao: 0.015 });
    const foco = cam.position.distanceTo(V(0.3, 0.9, 0));
    return {
      cena, cam,
      pos: { dof: { focus: foco, aperture: 0.0011, maxblur: 0.006 }, bloom: 0.38 },
      overlay(ctx) {
        const p = dk.pos, g = dk.grupo;
        const w = (v) => g.localToWorld(v.clone());
        textoKinetico(ctx, 'SONY PVW-2800', 140, 800, 84, lt, 3.0, { peso: 900, t1: S.f[1] - 0.3 });
        textoKinetico(ctx, 'VIDEOCASSETE BETACAM SP · LINHA PROFISSIONAL', 146, 858, 36, lt, 3.4, { fam: 'Rajdhani', peso: 700, esp: 3, t1: S.f[1] - 0.3, cor: COR.ouro });
        const t1 = S.f[2] - 0.5;
        callout(ctx, cam, w(p(0.9, 0.44, 0.02)), 'Medidores de áudio', lt, S.f[1] + 0.3, { lado: 'dir', dx: 60, dy: -170, t1, sub: 'VU · canais 1 e 2' });
        callout(ctx, cam, w(p(2.7, 0.44, 0.05)), 'Entrada da fita', lt, S.f[1] + 1.4, { lado: 'dir', dx: 90, dy: -190, t1, sub: 'aceita fitas S e L' });
        callout(ctx, cam, w(p(2.78, 0.86, 0.04)), 'Seleção de entrada', lt, S.f[1] + 2.6, { lado: 'dir', dx: 160, dy: 40, t1, sub: 'componente · composto · S-vídeo' });
        const t2 = S.dur - 0.7;
        callout(ctx, cam, w(p(2.2, 1.6, 0.09)), 'Botões de comando', lt, S.f[2] + 1.0, { lado: 'esq', dx: 120, dy: 120, t1: t2 });
        callout(ctx, cam, w(p(3.38, 1.19, 0.04)), 'Contador de tempo', lt, S.f[2] + 1.9, { lado: 'dir', dx: 110, dy: -150, t1: t2, sub: 'horas : min : seg : quadros' });
        callout(ctx, cam, w(p(3.46, 1.67, 0.2)), 'Jog / Shuttle', lt, S.f[2] + 3.0, { lado: 'dir', dx: 120, dy: 90, t1: t2, sub: 'disco de busca' });
      },
    };
  },
  sons(S) { return [['liga_painel', 0.4], ['whoosh', S.f[1] - 0.6], ['pop', S.f[1] + 0.3], ['pop', S.f[1] + 1.4], ['pop', S.f[1] + 2.6], ['whoosh', S.f[2] - 0.8], ['pop', S.f[2] + 1.0], ['pop', S.f[2] + 1.9], ['pop', S.f[2] + 3.0]]; },
};
