// Cenas 13–18: mecanismo, ejetar, emissoras, desligar, fim da fabricação, encerramento.
import * as THREE from 'three';
import { clamp, prog, lerp, smooth, easeOutExpo, easeOutBack, easeInCubic, fbm, ruido, janela, rng, W, H } from './util.js';
import { texto3D, animarLetras } from './texto3d.js';
import { callout, cartao, textoKinetico, linha, COR, projetar } from './overlay.js';
import { estudio, camera, trilho, usar, chaves, pressao } from './base.js';
import { DIM, criarFita } from './fita.js';
import { DK } from './deck.js';
import { MEC, texTrilhas } from './mecanismo.js';
import { plugue, monitor, deckLeve, canvasFrenteDeck, cameraENG, tripe, prateleira, poeira, coneLuz } from './extras.js';
import { deckLigado, tc } from './cenas1.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** coloca a fita L dentro do deck (posição carregada) */
function fitaNoDeck(A, dk) {
  const f = A.fitaL;
  f.padrao();
  if (f.grupo.parent !== dk.grupo) dk.grupo.add(f.grupo);
  f.grupo.position.set(MEC.fita.x, MEC.fita.y, MEC.fita.z);
  f.sombra.visible = false;
  f.setCarretel(0.6);
  return f;
}

// ------------------------------------------------------------------ 13 · MECANISMO
export const s13 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-2.5, 9, 1.5], key: 460, angulo: 0.6, posRim: [5, 6, -9], rim: 240, alvo: [0.5, 1, -2.2] }, zFundo: -11 });
    S.e = e;
    S.cam = camera(30);
    const tex = texTrilhas();
    tex.repeat.set(2.2, 1);
    S.diag = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.45), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }));
    S.diag.position.set(0.55, 2.55, -2.2);
    S.diagTex = tex;
    e.cena.add(S.diag);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    const mec = A.mec;
    dk.verInterno = true;
    dk.setTampaSup(1);
    dk.setPower(1); dk.setLuz(1);
    const f = fitaNoDeck(A, dk);
    f.setTampa(smooth(prog(lt, S.f[0] + 0.2, S.f[0] + 0.8)));
    const p = smooth(prog(lt, S.f[0] + 0.9, S.f[0] + 4.3));
    // tambor: acelera
    const t0 = S.f[1] - 0.2;
    const vel = smooth(prog(lt, t0, t0 + 2.2)) * 30;
    const ang = lt < t0 ? 0 : (lt - t0) * vel * Math.PI * 2 * 0.5;
    mec.setTambor(vel > 4 ? (lt * 977) % (Math.PI * 2) : ang, vel > 4);
    const trilhas = lt > S.f[2] - 0.2;
    const anda = Math.max(0, lt - (S.f[4] + 0.8));
    mec.setCarregamento(p, anda * 0.9, trilhas);
    mec.setRolo(smooth(prog(lt, S.f[4] + 0.2, S.f[4] + 0.7)));
    f.girar(anda * 3);
    // diagrama da fita
    const dv = janela(lt, S.f[2] + 1.2, S.f[4] - 0.1, 0.6, 0.5);
    S.diag.visible = dv > 0.01;
    S.diag.material.opacity = dv;
    S.diag.scale.set(1, Math.max(0.001, easeOutBack(prog(lt, S.f[2] + 1.2, S.f[2] + 1.9))), 1);
    S.diagTex.offset.x = lt * 0.05;
    trilho(cam, lt, [
      [0, [0.6, 5.2, 1.6], [0.55, 1.0, -1.6], 30],
      [S.f[0] + 0.6, [0.4, 3.8, 0.3], [0.55, 0.95, -2.0], 30],
      [S.f[1] - 0.4, [1.6, 2.6, -0.9], [0.6, 1.0, -2.5], 30],
      [S.f[1] + 2.4, [1.9, 1.7, -1.6], [0.6, 1.1, -2.6], 28],
      [S.f[2] + 0.4, [1.15, 1.45, -1.75], [0.45, 1.0, -2.35], 26],
      [S.f[2] + 1.6, [0.55, 2.62, 2.5], [0.55, 2.5, -2.2], 30],
      [S.f[4] - 0.4, [0.55, 2.62, 2.3], [0.55, 2.5, -2.2], 30],
      [S.f[4] + 0.6, [2.9, 2.0, -1.0], [1.6, 1.0, -2.35], 28],
      [S.dur, [2.6, 1.9, -0.7], [1.5, 1.0, -2.4], 28],
    ], { mao: 0.008 });
    const alvo = lt < S.f[1] - 0.4 ? V(0.55, 1.0, -2.0) : lt < S.f[2] + 1.2 ? V(0.55, 1.05, -2.4) : lt < S.f[4] ? V(0.55, 2.55, -2.2) : V(1.6, 1.0, -2.3);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0018, maxblur: 0.008 }, bloom: 0.42 },
      overlay(ctx) {
        const T = MEC.tambor, g = dk.grupo;
        const w = (x, y, z) => g.localToWorld(V(x, y, z));
        callout(ctx, cam, w(0.575, MEC.fita.y + 0.1, -1.76), 'Tampa abre', lt, S.f[0] + 0.3, { lado: 'esq', dx: 100, dy: -120, t1: S.f[0] + 2.6 });
        callout(ctx, cam, A.mec.carrinhos[0].localToWorld(V(0, 0.3, 0)), 'Guias puxam a fita', lt, S.f[0] + 2.2, { lado: 'esq', dx: 120, dy: -110, t1: S.f[1] - 0.4 });
        callout(ctx, cam, w(T.x, MEC.yPlaca + 0.4, T.z), 'Tambor de cabeças', lt, S.f[1] + 0.3, { lado: 'dir', dx: 100, dy: -150, t1: S.f[2] - 0.2, sub: '≈ 1.800 rpm · 30 voltas por segundo' });
        textoKinetico(ctx, 'TRILHAS INCLINADAS (HELICOIDAIS)', W / 2, 205, 54, lt, S.f[2] + 0.2, { al: 'centro', peso: 900, t1: S.f[4] - 0.2 });
        const pd = (u, v) => projetar(cam, S.diag.localToWorld(V((u - 0.5) * 2.7, (v - 0.5) * 0.45, 0)));
        if (S.diag.visible) {
          const a = pd(0.25, 0.0), b = pd(0.55, 0.0);
          textoKinetico(ctx, 'Y · BRILHO', a.x, a.y + 70, 44, lt, S.f[2] + 2.0, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.f[3] - 0.1, cor: '#7fd8ff' });
          textoKinetico(ctx, 'C · CORES', b.x, b.y + 70, 44, lt, S.f[2] + 2.5, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.f[3] - 0.1, cor: '#ff8ad8' });
          const top = pd(0.5, 1.0);
          textoKinetico(ctx, 'ÁUDIO 1 · ÁUDIO 2', top.x, top.y - 30, 40, lt, S.f[3] + 0.3, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.f[4] - 0.2, cor: '#ffd24a' });
          const b1 = pd(0.3, 0.0), b2 = pd(0.7, 0.0);
          textoKinetico(ctx, 'CONTROLE (CTL)', b1.x, b1.y + 70, 40, lt, S.f[3] + 1.6, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.f[4] - 0.2, cor: '#7dff8a' });
          textoKinetico(ctx, 'CÓDIGO DE TEMPO', b2.x, b2.y + 70, 40, lt, S.f[3] + 2.6, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.f[4] - 0.2, cor: '#ff8a3a' });
        }
        callout(ctx, cam, A.mec.cabrest.localToWorld(V(0, 0.12, 0)), 'Cabrestante', lt, S.f[4] + 0.5, { lado: 'dir', dx: 110, dy: -140, t1: S.dur - 0.5 });
        callout(ctx, cam, A.mec.rolo.localToWorld(V(0.1, 0.22, 0)), 'Rolo de pressão', lt, S.f[4] + 1.3, { lado: 'dir', dx: 120, dy: 90, t1: S.dur - 0.5 });
        textoKinetico(ctx, 'VELOCIDADE SEMPRE CONSTANTE', 120, 960, 52, lt, S.f[4] + 2.2, { peso: 900, t1: S.dur - 0.5 });
      },
    };
  },
  sons(S) { return [['tampa_abre', S.f[0] + 0.2], ['carrega', S.f[0] + 0.9], ['mecanico', S.f[0] + 4.3], ['tambor', S.f[1] - 0.2], ['whoosh', S.f[2] + 1.1], ['brilho', S.f[2] + 1.3], ['pop', S.f[3] + 0.3], ['pop', S.f[3] + 1.6], ['pop', S.f[3] + 2.6], ['rolo', S.f[4] + 0.3], ['fita_corre', S.f[4] + 0.8]]; },
};

// ------------------------------------------------------------------ 14 · EJETANDO
export const s14 = {
  preparar(A, S) {
    S.e = estudio({ luz: { posKey: [-4, 9, 5], key: 420, angulo: 0.65, posRim: [6, 6, -8], rim: 220, alvo: [0.5, 1, -1] }, zFundo: -10 });
    S.cam = camera(30);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    const mec = A.mec;
    deckLigado(dk, lt, { contador: tc(lt < 3.4 ? lt + 1200 : 3.4 + 1200) });
    dk.setVU(0.12, 0.12, 0.55);
    dk.setIndicador(1);
    const tS = S.f[0] + 1.2, tE = S.f[0] + 2.8;
    dk.apertar('stop', pressao(lt, tS));
    dk.apertar('eject', pressao(lt, tE));
    dk.setLed('servo', lt < tE ? 1 : 0);
    dk.verInterno = true;
    const abre = smooth(prog(lt, S.f[1] - 0.6, S.f[1] + 0.4)) * (1 - smooth(prog(lt, S.f[2] + 0.2, S.f[2] + 1.2)));
    dk.setTampaSup(Math.max(abre, 0.0001));
    const f = fitaNoDeck(A, dk);
    const u = smooth(prog(lt, S.f[1] + 0.1, S.f[1] + 1.6));
    mec.setCarregamento(1 - u);
    mec.setTambor(0, false);
    mec.setRolo(1 - u);
    f.setTampa(1 - smooth(prog(lt, S.f[1] + 1.6, S.f[1] + 2.0)));
    // sobe e sai pela abertura
    const sobe = smooth(prog(lt, S.f[1] + 2.1, S.f[1] + 2.6));
    const sai = easeOutExpo(prog(lt, S.f[1] + 2.7, S.f[1] + 4.2));
    f.grupo.position.set(MEC.fita.x, lerp(MEC.fita.y, dk.slot.y, sobe), lerp(MEC.fita.z, 0.62, sai));
    const frenteZ = f.grupo.position.z + DIM.L.d / 2;
    dk.setPorta(clamp((frenteZ + 0.05) / 0.1) * (f.grupo.position.z - DIM.L.d / 2 < 0.05 ? 1 : 1 - smooth(prog(lt, S.f[1] + 4.3, S.f[1] + 4.6))));
    if (lt > S.f[1] + 4.6) dk.setPorta(0);
    trilho(cam, lt, [
      [0, [1.4, 0.95, 2.2], [0.5, 0.25, 0], 28],
      [S.f[0] + 1.0, [1.2, 0.8, 1.7], [0.45, 0.15, 0], 26],
      [S.f[0] + 2.4, [0.2, 0.8, 1.8], [-0.2, 0.15, 0], 26],
      [S.f[1] - 0.2, [1.2, 4.2, 2.6], [0.6, 1.0, -1.4], 30],
      [S.f[1] + 2.2, [2.4, 3.4, 3.4], [0.6, 1.1, -0.8], 30],
      [S.f[1] + 4.4, [2.8, 2.2, 4.4], [0.6, 1.3, 0.2], 30],
      [S.dur, [2.4, 2.0, 4.6], [0.6, 1.2, 0.2], 30],
    ], { mao: 0.01 });
    const alvo = lt < S.f[1] - 0.4 ? V(0.0, 0.15, 0) : lt < S.f[1] + 2.2 ? V(0.6, 1.0, -1.4) : V(0.6, 1.35, 0.2);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.002, maxblur: 0.008 }, bloom: 0.4 },
      overlay(ctx) {
        const w = (fx, fy) => dk.grupo.localToWorld(dk.pos(fx, fy, 0.09));
        callout(ctx, cam, w(2.59, 1.725), '1 · STOP', lt, tS - 0.3, { lado: 'dir', dx: 100, dy: -130, t1: S.f[1] - 0.4 });
        callout(ctx, cam, w(1.8, 1.725), '2 · EJECT', lt, tE - 0.3, { lado: 'esq', dx: 100, dy: -130, t1: S.f[1] - 0.4 });
        textoKinetico(ctx, 'A FITA VOLTA PARA DENTRO DO CASSETE', W / 2, 205, 50, lt, S.f[1] + 0.2, { al: 'centro', peso: 900, t1: S.f[1] + 2.4 });
        textoKinetico(ctx, 'A TAMPA FECHA E A FITA SAI', W / 2, 205, 50, lt, S.f[1] + 2.6, { al: 'centro', peso: 900, t1: S.f[2] - 0.2 });
        if (lt > S.f[2] - 0.1) {
          const a = smooth(prog(lt, S.f[2], S.f[2] + 0.5)) * (1 - smooth(prog(lt, S.dur - 0.7, S.dur - 0.3)));
          ctx.save();
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(40,6,6,0.82)';
          ctx.fillRect(0, H - 300, W, 190);
          ctx.fillStyle = '#ff3b30';
          ctx.fillRect(0, H - 300, W, 6);
          ctx.font = '900 64px "DejaVu Sans"';
          ctx.fillStyle = '#ffcf3a';
          ctx.fillText('⚠', 140, H - 175);
          ctx.restore();
          textoKinetico(ctx, 'NUNCA PUXE A FITA', 250, H - 195, 66, lt, S.f[2] + 0.2, { peso: 900, t1: S.dur - 0.7, alfa: a });
          textoKinetico(ctx, 'com o aparelho trabalhando', 254, H - 140, 40, lt, S.f[2] + 0.5, { fam: 'Rajdhani', peso: 700, t1: S.dur - 0.7, cor: '#ffb0a8', alfa: a });
        }
      },
      semEtiqueta: lt > S.f[2] - 0.2,
    };
  },
  sons(S) { const tS = S.f[0] + 1.2, tE = S.f[0] + 2.8; return [['clique', tS + 0.1], ['motor_para', tS + 0.2], ['clique', tE + 0.1], ['mecanico', tE + 0.3], ['whoosh_longo', S.f[1] - 0.6], ['carrega', S.f[1] + 0.1], ['tampa_fecha', S.f[1] + 1.7], ['mecanico', S.f[1] + 2.1], ['porta', S.f[1] + 2.8], ['ejeta', S.f[1] + 2.7], ['alerta', S.f[2] + 0.1]]; },
};

// ------------------------------------------------------------------ 15 · NAS EMISSORAS
export const s15 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-3, 11, 7], key: 500, angulo: 0.7, posRim: [8, 7, -6], rim: 260, corRim: '#7aa8ff', alvo: [0, 2, -2] }, ciclo: false, amb: 0.45, fundo: '#06070a', nevoaPerto: 18, nevoaLonge: 40 });
    S.e = e;
    S.cam = camera(32);
    const sala = new THREE.Group();
    const parede = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshLambertMaterial({ color: '#15171c' }));
    parede.position.set(0, 7, -5.2);
    sala.add(parede);
    const rackMat = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.6, metalness: 0.4 });
    S.monitores = [];
    const telas = ['barras', 'jornal', 'relogio', 'claquete', 'estudio', 'chiado', 'jornal', 'barras', 'estudio'];
    [-5.3, 0, 5.3].forEach((x, i) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(4.9, 6.4, 2.4), rackMat);
      rack.position.set(x, 3.2, -4.0);
      rack.receiveShadow = true;
      sala.add(rack);
      for (let j = 0; j < 3; j++) {
        const d = deckLeve(canvasFrenteDeck(i * 3 + j + 1));
        d.position.set(x, 0.15 + j * 2.05, -2.79);
        sala.add(d);
      }
      for (let k = 0; k < 3; k++) {
        const m = monitor(1.5, telas[i * 3 + k]);
        m.grupo.position.set(x + (k - 1) * 1.6, 6.45, -3.4);
        sala.add(m.grupo);
        S.monitores.push(m);
      }
    });
    e.cena.add(sala);
    // mesa de edição
    const mesaEd = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 3), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.5 }));
    mesaEd.position.set(-1.2, 1.6, 1.3);
    mesaEd.castShadow = true; mesaEd.receiveShadow = true;
    e.cena.add(mesaEd);
    S.mesaY = 1.66;
    S.cam2 = cameraENG();
    S.cam2.grupo.position.set(4.6, 2.35, 2.2);
    S.cam2.grupo.rotation.y = 0.75;
    S.cam2.grupo.scale.setScalar(0.85);
    const tr = tripe(2.2);
    tr.position.set(4.6, 0, 2.2);
    e.cena.add(S.cam2.grupo, tr);
    S.prat = prateleira((i) => criarFita('L', { etiqueta: ['NOTÍCIAS\n1992', 'COMERCIAIS\nBLOCO A', 'VINHETAS\nCHAMADAS', 'ENTREVISTAS\n1997', 'ESPORTE\nFINAL', 'MASTER\nPROGRAMA'][i], fracao: 0.02 }), 6);
    S.prat.grupo.position.set(-7.6, 0, 1.6);
    S.prat.grupo.rotation.y = 0.9;
    e.cena.add(S.prat.grupo);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    for (const m of S.monitores) m.desenhar(lt);
    const dk = usar(cena, A.deck);
    dk.grupo.position.set(-1.3, S.mesaY, 0.9);
    dk.grupo.rotation.y = 0.15;
    deckLigado(dk, lt);
    const f1 = usar(cena, A.fitaL2), f2 = usar(cena, A.fitaS2);
    f1.grupo.position.set(1.4, S.mesaY + DIM.L.h / 2, 1.6); f1.grupo.rotation.y = -0.4;
    f2.grupo.position.set(1.3, S.mesaY + DIM.L.h + DIM.S.h / 2 + 0.004, 1.65); f2.grupo.rotation.y = -0.15;
    f2.sombra.visible = false;
    S.cam2.tally.material.emissiveIntensity = Math.floor(lt * 1.2) % 2 ? 4 : 1.2;
    trilho(cam, lt, [
      [0, [7.5, 3.6, 9.0], [1.0, 2.6, -2.0], 32],
      [S.f[1] - 0.2, [5.0, 3.2, 8.4], [0.5, 2.4, -1.5], 32],
      [S.f[1] + 1.4, [7.4, 3.0, 5.6], [4.6, 2.4, 2.0], 30],
      [S.f[1] + 2.8, [1.0, 3.6, 6.4], [-1.0, 2.2, 0.8], 30],
      [S.f[1] + 4.2, [0.2, 4.6, 7.4], [0, 5.6, -3.4], 30],
      [S.f[2] - 0.4, [-3.6, 3.2, 6.8], [-7.2, 1.4, 1.4], 30],
      [S.f[2] + 1.2, [-0.5, 4.6, 12.0], [0, 3.2, -2.0], 34],
      [S.dur, [0.3, 4.4, 11.0], [0, 3.2, -2.0], 34],
    ], { mao: 0.015 });
    const alvo = lt < S.f[1] + 0.7 ? V(0, 3, -2) : lt < S.f[1] + 2.1 ? V(4.6, 2.4, 2.2) : lt < S.f[1] + 3.5 ? V(-1.2, 2.3, 0.9) : lt < S.f[2] - 0.2 ? V(0, 6, -3.4) : lt < S.f[2] + 0.6 ? V(-7.5, 1.3, 1.6) : V(0, 3, -2);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0014, maxblur: 0.008 }, bloom: 0.55, exposure: 1.05 },
      overlay(ctx) {
        textoKinetico(ctx, 'EM TODA PARTE', W / 2, 210, 70, lt, S.f[0] + 0.4, { al: 'centro', peso: 900, t1: S.f[1] - 0.2 });
        const it = [
          ['Câmeras de reportagem', V(4.6, 3.1, 2.2), S.f[1] + 0.9],
          ['Ilhas de edição', V(-1.2, 2.8, 0.9), S.f[1] + 2.3],
          ['Exibição · comerciais e vinhetas', V(0, 6.6, -3.4), S.f[1] + 3.7],
          ['Arquivo', V(-7.6, 2.6, 1.6), S.f[2] - 0.6],
        ];
        it.forEach(([s, p, t], i) => callout(ctx, cam, p, s, lt, t, { lado: i % 2 ? 'esq' : 'dir', dx: 100, dy: -120, t1: Math.min(S.f[2] + 0.6, t + 3.6) }));
        textoKinetico(ctx, 'QUASE 20 ANOS', 120, 860, 84, lt, S.f[2] + 1.0, { peso: 900, t1: S.dur - 0.5, grad: ['#fff1c8', '#e0a63c'] });
        textoKinetico(ctx, 'PADRÃO DO TELEJORNALISMO · INCLUSIVE NO BRASIL', 126, 920, 40, lt, S.f[2] + 1.4, { fam: 'Rajdhani', peso: 700, esp: 2, t1: S.dur - 0.5, grad: ['#7dff8a', '#ffe14a'] });
      },
    };
  },
  sons(S) { return [['ambiente_tv', 0.2], ['whoosh', S.f[1] + 0.9], ['pop', S.f[1] + 0.9], ['pop', S.f[1] + 2.3], ['pop', S.f[1] + 3.7], ['pop', S.f[2] - 0.6], ['impacto_suave', S.f[2] + 1.0]]; },
};

// ------------------------------------------------------------------ 16 · DESLIGAR E DESCONECTAR
export const s16 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [4, 9, -9], key: 420, angulo: 0.65, posRim: [-6, 6, 7], rim: 200, alvo: [0, 1, -2.5] }, zFundo: -14 });
    S.e = e;
    S.cam = camera(30);
    const C = A.deck.traseira.conectores;
    const caboPts = (dx) => [[0, 0, 0.28], [0, 0, 0.7], [dx * 0.3, -0.5, 1.3], [dx * 0.8, -1.2, 1.9], [dx * 1.4, -1.45, 3.2]];
    S.plugs = {
      ac: { p: plugue('iec', caboPts(-0.6), '#2a2a2a'), c: C.ac },
      vin: { p: plugue('bnc', caboPts(0.6), '#1d4f8f'), c: C.video_in, gira: true },
      ain1: { p: plugue('xlr', caboPts(0.2)), c: C.a_in1 },
    };
    for (const k in S.plugs) e.cena.add(S.plugs[k].p);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    dk.grupo.position.set(0, 0.03, 0);
    const tE = S.f[0] + 0.3, tP = S.f[0] + 2.4;
    dk.apertar('eject', pressao(lt, tE));
    const desl = smooth(prog(lt, tP + 0.1, tP + 0.7));
    dk.setPower(lt < tP ? 1 : 1 - smooth(prog(lt, tP, tP + 0.15)));
    dk.setLuz(1 - desl);
    dk.setVU(0.1 * (1 - desl), 0.1 * (1 - desl), 0.5 * (1 - desl));
    dk.setContador('00:00:00:00');
    // fita saindo
    const f = usar(cena, A.fitaL);
    const sai = easeOutExpo(prog(lt, tE + 0.4, tE + 1.6));
    f.grupo.position.set(dk.slot.x, dk.slot.y + 0.03, lerp(-0.9, 0.62, sai));
    f.grupo.visible = sai > 0.001;
    f.sombra.visible = false;
    dk.setPorta(sai > 0.01 ? 1 : 0);
    // plugues: saem
    const tAC = S.f[1] + 1.3, tB = S.f[3] + 0.5, tX = S.f[3] + 2.6;
    const pos = { ac: tAC, vin: tB, ain1: tX };
    for (const k in S.plugs) {
      const P = S.plugs[k];
      const pc = P.c.pos.clone().add(V(0, 0.03, 0));
      const t0 = pos[k];
      const gira = P.gira ? 1 - smooth(prog(lt, t0, t0 + 0.35)) : 0;
      const tirar = smooth(prog(lt, t0 + (P.gira ? 0.45 : k === 'ain1' ? 0.5 : 0), t0 + (P.gira ? 1.6 : k === 'ain1' ? 1.7 : 1.4)));
      const enc = k === 'ain1' ? 0.035 : 0.07;
      P.p.position.copy(pc).add(V(0, tirar * 0.25, -lerp(enc, 0.9, tirar)));
      P.p.rotation.set(0, Math.PI, gira * Math.PI / 2);
    }
    const trava = A.deck.traseira.conectores.a_in1.mesh.userData.trava;
    if (trava) trava.position.z = 0.016 - 0.008 * pressao(lt, tX + 0.1, 0.8);
    trilho(cam, lt, [
      [0, [1.6, 1.3, 3.0], [0.4, 1.0, 0.3], 30],
      [tP - 0.6, [-0.8, 1.6, 2.4], [-1.6, 1.3, 0], 30],
      [S.f[1] - 0.2, [-0.9, 1.5, 2.3], [-1.7, 1.3, 0], 30],
      [S.f[1] + 0.5, [-0.4, 1.3, -7.0], [-1.4, 0.6, -4.6], 30],
      [S.f[2] + 0.4, [0.1, 1.6, -7.4], [-0.6, 0.9, -4.6], 30],
      [S.f[3] + 0.2, [2.3, 1.85, -7.0], [1.5, 1.4, -4.6], 28],
      [S.f[3] + 2.2, [2.0, 1.4, -6.8], [1.6, 1.0, -4.6], 28],
      [S.dur, [1.6, 1.8, -8.4], [0.8, 1.1, -4.6], 30],
    ], { mao: 0.01 });
    const alvo = lt < tP - 0.3 ? V(0.6, 1.4, 0.3) : lt < S.f[1] ? V(-1.85, 1.4, 0) : lt < S.f[3] ? V(-1.2, 0.8, -4.6) : V(1.6, 1.2, -4.6);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0018, maxblur: 0.008 }, bloom: 0.35 },
      overlay(ctx) {
        const w = (fx, fy, z = 0.08) => dk.grupo.localToWorld(dk.pos(fx, fy, z));
        callout(ctx, cam, w(1.8, 1.725), '1 · Ejete a fita', lt, tE - 0.2, { lado: 'esq', dx: 90, dy: -120, t1: tP - 0.5 });
        callout(ctx, cam, w(0.25, 0.44, 0.06), '2 · POWER desligado', lt, tP, { lado: 'dir', dx: 100, dy: -120, t1: S.f[1] - 0.2 });
        const C = A.deck.traseira.conectores, wc = (c) => c.pos.clone().add(V(0, 0.03, -0.1));
        callout(ctx, cam, wc(C.ac), '3 · Tire da tomada', lt, S.f[1] + 0.9, { lado: 'esq', dx: 90, dy: -140, t1: S.f[2] - 0.2 });
        textoKinetico(ctx, '✓ PELO CONECTOR', 120, 860, 64, lt, S.f[2] + 0.4, { peso: 900, t1: S.f[3] - 0.2, cor: '#9dffb0' });
        textoKinetico(ctx, '✗ NUNCA PELO FIO', 120, 940, 64, lt, S.f[2] + 1.2, { peso: 900, t1: S.f[3] - 0.2, cor: '#ff8a80' });
        callout(ctx, cam, wc(C.video_in), 'BNC: gire ¼ de volta', lt, tB - 0.2, { lado: 'esq', dx: 100, dy: -150, t1: S.dur - 0.5 });
        callout(ctx, cam, wc(C.a_in1).add(V(0, 0.09, 0)), 'XLR: aperte a trava', lt, tX - 0.2, { lado: 'dir', dx: 110, dy: -150, t1: S.dur - 0.5, sub: 'botão PUSH' });
      },
    };
  },
  sons(S) { const tE = S.f[0] + 0.3, tP = S.f[0] + 2.4; return [['clique', tE + 0.1], ['ejeta', tE + 0.4], ['power', tP], ['desliga', tP + 0.1], ['whoosh_longo', S.f[1] - 0.1], ['plugue', S.f[1] + 0.8], ['bnc_trava', S.f[3] + 0.5], ['whoosh_curto', S.f[3] + 1.0], ['clique', S.f[3] + 2.7], ['whoosh_curto', S.f[3] + 3.1]]; },
};

// ------------------------------------------------------------------ 17 · FIM DA FABRICAÇÃO
export const s17 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [0, 10, 1.5], key: 520, angulo: 0.32, posRim: [5, 5, -8], rim: 120, alvo: [0, 0.8, -1.8] }, amb: 0.2, corFundo: '#0e0f12', zFundo: -10 });
    S.e = e;
    S.cam = camera(30);
    S.cone = coneLuz(9, 3.4, '#ffe8c8', 0.07);
    S.cone.position.set(0, 0, -1.8);
    S.poeira = poeira(600, [6, 6, 5]);
    S.poeira.grupo.position.set(0, 0, -1.8);
    e.cena.add(S.cone, S.poeira.grupo);
    const ano = (s, m, tam) => { const t = texto3D(s, { fonte: 'titulo', tam, mat: m }); t.grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; }); e.cena.add(t.grupo); return t; };
    S.a01 = ano('2001', 'vermelho', 0.75);
    S.a01.grupo.position.set(0, 2.75, -2.6);
    S.a16 = ano('2016', 'cromo', 0.75);
    S.a16.grupo.position.set(0, 2.75, -2.6);
    S.dig = criarFita('L', { marca: 'digital', cor: '#6f7f95', fracao: 0.5 });
    S.sx = criarFita('L', { marca: 'sx', cor: '#b99a3e', fracao: 0.5 });
    e.cena.add(S.dig.grupo, S.sx.grupo);
  },
  quadro(lt, S, A) {
    const { cena, L } = S.e, cam = S.cam;
    S.poeira.set(lt);
    const dk = usar(cena, A.deck);
    dk.grupo.position.set(0, 0.03, -1.8 + DK.D / 2 - 1.2);
    dk.grupo.rotation.y = 0.0;
    const apaga = smooth(prog(lt, S.dur - 4.0, S.dur - 2.0));
    deckLigado(dk, lt, { luz: 1 - apaga, contador: '00:00:00:00' });
    const f = usar(cena, A.fitaL);
    f.grupo.position.set(0.55, DK.H + 0.03 + DIM.L.h / 2, -1.8 + DK.D / 2 - 1.2 - 2.0);
    f.grupo.rotation.y = 0.12;
    f.sombra.visible = false;
    L.key.intensity = 520 * (1 - apaga * 0.6);
    S.cone.children[0].material.opacity = 0.07 * (1 - apaga * 0.6);
    animarLetras(S.a01, lt, S.f[0] + 0.8, S.f[1] - 0.4, { tipo: 'queda', stagger: 0.09, zSaida: -2, ySaida: 1.5 });
    animarLetras(S.a16, lt, S.f[2] + 0.6, null, { tipo: 'queda', stagger: 0.09 });
    // fitas digitais entram dos lados
    const e1 = easeOutExpo(prog(lt, S.f[1] + 1.4, S.f[1] + 2.4)), e2 = easeOutExpo(prog(lt, S.f[1] + 2.4, S.f[1] + 3.4));
    S.dig.grupo.visible = e1 > 0.001; S.sx.grupo.visible = e2 > 0.001;
    S.dig.grupo.position.set(lerp(-9, -3.6, e1), DIM.L.h / 2, 0.4); S.dig.grupo.rotation.y = 0.4;
    S.sx.grupo.position.set(lerp(9, 3.6, e2), DIM.L.h / 2, 0.4); S.sx.grupo.rotation.y = -0.4;
    trilho(cam, lt, [
      [0, [0.0, 2.2, 7.4], [0, 1.4, -1.8], 30],
      [S.f[1] + 0.6, [0.0, 2.0, 6.8], [0, 1.3, -1.6], 30],
      [S.f[1] + 2.0, [0.0, 2.6, 9.6], [0, 1.0, -0.8], 34],
      [S.f[2] - 0.2, [0.0, 2.7, 9.8], [0, 1.1, -0.8], 34],
      [S.f[2] + 1.2, [0.6, 2.2, 7.2], [0, 1.6, -1.8], 30],
      [S.dur, [0.9, 1.8, 6.4], [0, 1.4, -1.8], 30],
    ], { mao: 0.008 });
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(V(0, 1.4, -1.8)), aperture: 0.0014, maxblur: 0.007 }, bloom: 0.45, exposure: 1.0 },
      overlay(ctx) {
        textoKinetico(ctx, 'FIM DA FABRICAÇÃO DO BETACAM SP', W / 2, 960, 54, lt, S.f[0] + 1.4, { al: 'centro', peso: 900, t1: S.f[1] - 0.4 });
        const pD = projetar(cam, S.dig.grupo.localToWorld(V(0, 0, 0.9))), pX = projetar(cam, S.sx.grupo.localToWorld(V(0, 0, 0.9)));
        textoKinetico(ctx, 'BETACAM DIGITAL', pD.x, pD.y + 30, 40, lt, S.f[1] + 2.2, { al: 'centro', peso: 900, t1: S.f[2] - 0.3, cor: '#b8cbe6' });
        textoKinetico(ctx, '1993', pD.x, pD.y + 76, 34, lt, S.f[1] + 2.5, { al: 'centro', fam: 'Share Tech Mono', peso: 400, t1: S.f[2] - 0.3, cor: COR.cinza });
        textoKinetico(ctx, 'BETACAM SX', pX.x, pX.y + 30, 40, lt, S.f[1] + 3.2, { al: 'centro', peso: 900, t1: S.f[2] - 0.3, cor: '#ffe08a' });
        textoKinetico(ctx, '1996', pX.x, pX.y + 76, 34, lt, S.f[1] + 3.5, { al: 'centro', fam: 'Share Tech Mono', peso: 400, t1: S.f[2] - 0.3, cor: COR.cinza });
        textoKinetico(ctx, 'OS ÚLTIMOS APARELHOS: ATÉ O ESTOQUE ACABAR', W / 2, 205, 44, lt, S.f[1] + 4.6, { al: 'centro', peso: 800, t1: S.f[2] - 0.3 });
        textoKinetico(ctx, 'A SONY ENCERRA AS VENDAS', W / 2, 940, 50, lt, S.f[2] + 1.2, { al: 'centro', peso: 900, t1: S.dur - 0.5 });
        textoKinetico(ctx, 'de todos os seus gravadores de fita de ½ polegada', W / 2, 992, 36, lt, S.f[2] + 1.6, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.dur - 0.5, cor: COR.ouro });
      },
    };
  },
  sons(S) { return [['drone', 0.2], ['impacto_grande', S.f[0] + 1.1], ['whoosh_longo', S.f[1] + 1.4], ['impacto_suave', S.f[1] + 2.3], ['whoosh_longo', S.f[1] + 2.4], ['impacto_suave', S.f[1] + 3.3], ['impacto_grande', S.f[2] + 0.9], ['desliga', S.dur - 4.0]]; },
};

// ------------------------------------------------------------------ 18 · ENCERRAMENTO
export const s18 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-5, 8, 6], key: 400, angulo: 0.6, corKey: '#ffe2c0', posRim: [6, 5, -7], rim: 240, corRim: '#a8c8ff', alvo: [0, 0.9, -1.5] }, zFundo: -10 });
    S.e = e;
    S.cam = camera(30);
    S.obr = texto3D('OBRIGADO!', { fonte: 'titulo', tam: 0.62, mat: 'ouro' });
    S.obr.grupo.position.set(0.3, 2.65, -1.2);
    S.obr.grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    e.cena.add(S.obr.grupo);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    dk.grupo.position.set(0, 0.03, -2.0);
    dk.grupo.rotation.y = 0;
    deckLigado(dk, lt, { contador: lt > S.f[2] ? '00:00:00:00' : tc(lt, 3600) });
    const f = usar(cena, A.fitaL);
    f.grupo.position.set(-0.4, DIM.L.h / 2, 1.5);
    f.grupo.rotation.y = 0.35;
    f.setCarretel(0.5);
    animarLetras(S.obr, lt, S.f[2] - 0.1, null, { tipo: 'queda', stagger: 0.06 });
    const ang = lt * 0.035;
    trilho(cam, lt, [
      [0, [-4.6, 1.4, 5.6], [0, 0.6, 0], 30],
      [S.f[1], [-1.6, 2.0, 6.6], [0, 0.9, -0.6], 30],
      [S.f[2] - 0.4, [1.2, 2.3, 7.0], [0.2, 1.4, -0.8], 30],
      [S.dur, [0.5, 2.6, 8.6], [0.3, 1.85, -1.2], 30],
    ], { mao: 0.01 });
    void ang;
    const alvo = lt < S.f[2] ? V(-0.2, 0.4, 1.0) : V(0.3, 2.65, -1.2);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0016, maxblur: 0.008 }, bloom: 0.4 },
      semEtiqueta: lt > S.f[1] - 0.4,
      overlay(ctx) {
        textoKinetico(ctx, 'DÉCADAS DE HISTÓRIA DA TV', 120, 860, 72, lt, S.f[0] + 0.8, { peso: 900, t1: S.f[1] - 0.4, grad: ['#fff1c8', '#e0a63c'] });
        textoKinetico(ctx, 'guardadas em fita', 126, 920, 42, lt, S.f[0] + 1.3, { fam: 'Rajdhani', peso: 700, t1: S.f[1] - 0.4 });
        // pílulas de chamada
        const pil = [['CURTA', '#f0c66a'], ['INSCREVA-SE', '#ff3b30'], ['COMENTE', '#5cb8ff']];
        pil.forEach(([s, cor], i) => {
          const t0 = S.f[1] + 0.3 + i * 0.6, t1 = S.f[2] - 0.3;
          if (lt < t0 || lt > t1 + 0.5) return;
          const a = easeOutBack(prog(lt, t0, t0 + 0.5)), sa = smooth(prog(lt, t1, t1 + 0.4));
          const x = W / 2 + (i - 1) * 440, y = 880;
          ctx.save();
          ctx.globalAlpha = 1 - sa;
          ctx.translate(x, y);
          ctx.scale(a, a);
          ctx.fillStyle = cor;
          ctx.beginPath(); ctx.roundRect(-190, -48, 380, 96, 48); ctx.fill();
          ctx.fillStyle = i === 1 ? '#fff' : '#111';
          ctx.font = '900 40px "Montserrat"';
          ctx.textAlign = 'center';
          ctx.fillText(s, 0, 14);
          ctx.restore();
        });
        textoKinetico(ctx, 'VOCÊ JÁ VIU UMA FITA DESSAS DE PERTO?', W / 2, 215, 56, lt, S.f[1] + 2.4, { al: 'centro', peso: 900, t1: S.f[2] - 0.3 });
        textoKinetico(ctx, 'ATÉ O PRÓXIMO VÍDEO', W / 2, 960, 52, lt, S.f[2] + 1.2, { al: 'centro', peso: 900, esp: 6, t1: S.dur - 1.8 });
      },
    };
  },
  sons(S) { return [['whoosh_longo', S.f[0] + 0.6], ['pop', S.f[1] + 0.3], ['pop', S.f[1] + 0.9], ['pop', S.f[1] + 1.5], ['whoosh', S.f[1] + 2.4], ['impacto_grande', S.f[2] + 0.3], ['brilho', S.f[2] + 0.5], ['whoosh', S.f[2] + 1.2]]; },
};
