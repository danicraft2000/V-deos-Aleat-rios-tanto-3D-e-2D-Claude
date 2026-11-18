// Cenas 07–12: conexões, inserir a fita, duração, gravar, frame a frame, manutenção.
import * as THREE from 'three';
import { clamp, prog, lerp, smooth, easeOutExpo, easeOutBack, easeInCubic, fbm, ruido, janela, W, H } from './util.js';
import { texto3D, animarLetras } from './texto3d.js';
import { callout, cota, cartao, textoKinetico, linha, COR, projetar } from './overlay.js';
import { estudio, camera, trilho, usar, chaves, pressao } from './base.js';
import { DIM, criarFita } from './fita.js';
import { DK } from './deck.js';
import { MEC } from './mecanismo.js';
import { plugue, monitor, contorno, frasco, haste, prateleira } from './extras.js';
import { deckLigado, tc } from './cenas1.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ 07 · CONEXÕES
export const s07 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [5, 9, -10], key: 420, angulo: 0.6, posRim: [-6, 6, 6], rim: 160, alvo: [0, 1, -4] }, zFundo: -14 });
    S.e = e;
    S.cam = camera(30);
    const C = A.deck.traseira.conectores;
    const caboPts = (dx, cor) => [[0, 0, 0.28], [0, 0, 0.7], [dx * 0.3, -0.5, 1.3], [dx * 0.8, -1.2, 1.9], [dx * 1.4, -1.45, 3.2]];
    S.plugs = {
      vin: { p: plugue('bnc', caboPts(0.6), '#1d4f8f'), c: C.video_in, t: S.f[1] + 0.3, gira: true },
      vout: { p: plugue('bnc', caboPts(0.9), '#1d4f8f'), c: C.video_out1, t: S.f[1] + 2.7, gira: true },
      ain1: { p: plugue('xlr', caboPts(0.2)), c: C.a_in1, t: S.f[2] + 0.3 },
      ain2: { p: plugue('xlr', caboPts(0.35)), c: C.a_in2, t: S.f[2] + 0.9 },
      aout1: { p: plugue('xlr', caboPts(0.5)), c: C.a_out1, t: S.f[2] + 2.6 },
      ac: { p: plugue('iec', caboPts(-0.6), '#2a2a2a'), c: C.ac, t: S.f[3] + 0.8 },
    };
    for (const k in S.plugs) e.cena.add(S.plugs[k].p);
    S.mon = monitor(1.3, 'barras');
    S.mon.grupo.position.set(3.9, 0, -7.2);
    S.mon.grupo.rotation.y = Math.PI - 0.55;
    e.cena.add(S.mon.grupo);
    // pulsos de sinal
    S.pulsos = [0, 1, 2, 3, 4, 5].map(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: '#9fe0ff', toneMapped: false }));
      m.material.color.multiplyScalar(4);
      e.cena.add(m);
      return m;
    });
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    dk.grupo.position.set(0, 0.03, 0);
    dk.setPower(0);
    dk.setLuz(0);
    const ins = {};
    for (const k in S.plugs) {
      const P = S.plugs[k];
      const pc = P.c.pos.clone().add(V(0, 0.03, 0));
      const a = easeOutExpo(prog(lt, P.t, P.t + 0.8));
      const gira = P.gira ? smooth(prog(lt, P.t + 0.85, P.t + 1.2)) : 0;
      const enc = k.startsWith('a') && k !== 'ac' ? 0.035 : 0.07;
      P.p.position.copy(pc).add(V(0, lerp(0.4, 0, a), -lerp(1.6, enc, a)));
      P.p.rotation.set(0, Math.PI, gira * Math.PI / 2);
      P.p.visible = lt > P.t - 0.05;
      ins[k] = a;
    }
    S.mon.desenhar(lt);
    S.mon.conteudo = lt > S.plugs.vout.t + 1.3 ? 'barras' : 'chiado';
    // pulsos andando pelos cabos de vídeo
    const curva = (k) => {
      const P = S.plugs[k].p;
      const tubo = P.children.find((c) => c.geometry?.type === 'TubeGeometry');
      return { P, path: tubo.geometry.parameters.path };
    };
    S.pulsos.forEach((m, i) => {
      const k = i < 3 ? 'vin' : 'vout';
      const on = lt > S.plugs[k].t + 1.3;
      m.visible = on;
      if (!on) return;
      const { P, path } = curva(k);
      let u = ((lt * 0.45 + i / 3) % 1);
      if (k === 'vin') u = 1 - u;
      const pt = path.getPointAt(u);
      m.position.copy(P.localToWorld(pt));
    });
    trilho(cam, lt, [
      [0, [4.6, 2.1, 4.2], [0, 1.0, -1.4], 30],
      [S.f[0] + 0.8, [6.4, 2.3, -1.6], [0, 1.0, -2.6], 30],
      [S.f[1] - 0.2, [2.6, 2.0, -8.6], [0.8, 1.2, -4.6], 30],
      [S.f[1] + 1.0, [2.3, 1.85, -7.2], [1.35, 1.4, -4.6], 30],
      [S.f[2] - 0.4, [2.5, 1.9, -7.4], [1.3, 1.3, -4.6], 30],
      [S.f[2] + 0.4, [1.7, 1.45, -6.9], [1.0, 1.0, -4.6], 30],
      [S.f[3] - 0.3, [1.4, 1.4, -7.0], [0.6, 0.95, -4.6], 30],
      [S.f[3] + 0.5, [-0.5, 1.2, -6.9], [-1.25, 0.55, -4.6], 30],
      [S.dur, [0.6, 2.6, -9.6], [0.2, 0.9, -4.6], 30],
    ], { mao: 0.012 });
    const alvo = lt < S.f[1] ? V(0, 1, -2) : lt < S.f[2] ? V(1.4, 1.5, -4.6) : lt < S.f[3] ? V(1.0, 1.0, -4.6) : V(-1, 0.6, -4.6);
    const foco = cam.position.distanceTo(alvo);
    return {
      cena, cam,
      pos: { dof: { focus: foco, aperture: 0.0016, maxblur: 0.007 }, bloom: 0.35 },
      overlay(ctx) {
        const C = A.deck.traseira.conectores, w = (c) => c.pos.clone().add(V(0, 0.03, -0.1));
        const t1 = S.f[2] - 0.4;
        callout(ctx, cam, w(C.video_in), 'Vídeo IN', lt, S.plugs.vin.t + 0.9, { lado: 'esq', dx: 90, dy: -160, t1, sub: 'o sinal entra' });
        callout(ctx, cam, w(C.video_out1), 'Vídeo OUT', lt, S.plugs.vout.t + 0.9, { lado: 'dir', dx: 100, dy: -150, t1, sub: 'vai para o monitor', corSub: COR.azul });
        textoKinetico(ctx, 'VÍDEO: CONECTOR BNC', 120, 920, 52, lt, S.f[1] + 0.2, { peso: 900, t1 });
        textoKinetico(ctx, 'encaixa e gira ¼ de volta para travar', 124, 970, 34, lt, S.f[1] + 0.6, { fam: 'Rajdhani', peso: 600, t1, cor: COR.ouro });
        const t2 = S.f[3] - 0.2;
        callout(ctx, cam, w(C.a_in1), 'Áudio IN · CH-1', lt, S.plugs.ain1.t + 0.8, { lado: 'esq', dx: 80, dy: -170, t1: t2 });
        callout(ctx, cam, w(C.a_in2), 'CH-2', lt, S.plugs.ain2.t + 0.8, { lado: 'dir', dx: 60, dy: -210, t1: t2 });
        callout(ctx, cam, w(C.a_out1), 'Áudio OUT', lt, S.plugs.aout1.t + 0.8, { lado: 'dir', dx: 90, dy: -120, t1: t2, sub: 'saídas separadas' });
        textoKinetico(ctx, 'ÁUDIO: CONECTOR XLR', 120, 920, 52, lt, S.f[2] + 0.2, { peso: 900, t1: t2 });
        textoKinetico(ctx, '3 pinos · balanceado · canais 1 e 2', 124, 970, 34, lt, S.f[2] + 0.6, { fam: 'Rajdhani', peso: 600, t1: t2, cor: COR.ouro });
        callout(ctx, cam, w(C.ac), 'Energia', lt, S.plugs.ac.t + 0.8, { lado: 'esq', dx: 90, dy: -150, t1: S.dur - 0.7, sub: 'sempre por último', corSub: '#ff8a80' });
        cartao(ctx, 1260, 640, [['ORDEM CERTA', { tam: 40, peso: 700, cor: COR.ouro }], '1 · Vídeo (BNC)', '2 · Áudio (XLR)', ['3 · Energia, por último', { cor: '#ff8a80' }]], lt, S.f[3] + 1.8, S.dur - 0.6, { w: 540 });
      },
    };
  },
  sons(S) {
    const r = [['whoosh_longo', S.f[0] + 0.2]];
    const pl = { vin: S.f[1] + 0.3, vout: S.f[1] + 2.7, ain1: S.f[2] + 0.3, ain2: S.f[2] + 0.9, aout1: S.f[2] + 2.6, ac: S.f[3] + 0.8 };
    for (const [k, t] of Object.entries(pl)) { r.push(['whoosh_curto', t]); r.push([k.startsWith('v') ? 'bnc' : k === 'ac' ? 'plugue' : 'xlr', t + 0.75]); if (k.startsWith('v')) r.push(['bnc_trava', t + 1.15]); }
    return r;
  },
};

// ------------------------------------------------------------------ 08 · INSERINDO A FITA
export const s08 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-5, 8, 7], key: 380, angulo: 0.6, posRim: [6, 6, -6], rim: 200, alvo: [0, 1, 0] }, zFundo: -9 });
    S.e = e;
    S.cam = camera(30);
    const sl = A.deck.slot;
    S.gL = contorno(DIM.L.w, DIM.L.h, DIM.L.d, '#f0c66a');
    S.gS = contorno(DIM.S.w, DIM.S.h, DIM.S.d, '#5cb8ff');
    for (const g of [S.gL, S.gS]) { g.position.set(sl.x, sl.y, DIM.L.d / 2 + 0.25); e.cena.add(g); }
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    dk.grupo.position.set(0, 0, 0);
    const sl = dk.slot;
    const on = smooth(prog(lt, 3.0, 3.15));
    dk.setPower(on);
    dk.setLuz(smooth(prog(lt, 3.2, 4.2)));
    dk.setVU(0.05 + 0.1 * on * Math.abs(ruido(lt * 5, 1)), 0.05 + 0.1 * on * Math.abs(ruido(lt * 5, 2)), 0.1);
    dk.setContador('00:00:00:00');
    // fita L
    const f = usar(cena, A.fitaL);
    f.setCarretel(0.95);
    const t0 = S.f[1], ti = S.f[2];
    const orient = smooth(prog(lt, t0 + 0.6, t0 + 2.4));
    const chega = easeOutExpo(prog(lt, t0 - 0.4, t0 + 0.6));
    const empurra = smooth(prog(lt, ti + 0.4, ti + 1.6));
    const puxa = easeInCubic(prog(lt, ti + 1.75, ti + 2.35));
    let z = lerp(3.2, 1.3, chega);
    z = lerp(z, 0.62, smooth(prog(lt, ti - 0.2, ti + 0.4)));
    z -= empurra * 0.65 + puxa * 1.4;
    const y = lerp(sl.y + 0.42, sl.y, smooth(prog(lt, ti - 0.2, ti + 0.4)));
    f.grupo.position.set(sl.x, y, z);
    f.grupo.rotation.set(lerp(Math.PI, 0, orient), lerp(Math.PI * 0.9, 0, orient), 0);
    f.grupo.visible = lt > t0 - 0.45 && z > -1.6;
    f.sombra.visible = false;
    // portinhola: abre quando a frente da fita chega, fecha depois que a fita entra toda
    const frenteZ = z - DIM.L.d / 2;
    const atrasZ = z + DIM.L.d / 2;
    dk.setPorta(clamp((0.02 - frenteZ) / 0.12) * (atrasZ > -0.12 ? 1 : 1 - smooth(prog(lt, ti + 2.4, ti + 2.7))));
    if (lt > ti + 2.7) dk.setPorta(0);
    dk.setLed('servo', lt > ti + 2.6 ? 1 : 0);
    dk.setIndicador(lt > ti + 2.8 ? 1 : 0);
    // contornos S e L
    const cv = janela(lt, S.f[3] + 0.2, S.dur - 0.4, 0.5, 0.4);
    S.gL.visible = S.gS.visible = cv > 0.01;
    S.gL.material.opacity = cv; S.gS.material.opacity = cv * smooth(prog(lt, S.f[3] + 1.0, S.f[3] + 1.6));
    S.gL.position.z = S.gS.position.z = lerp(DIM.L.d / 2 + 1.2, DIM.L.d / 2 + 0.25, easeOutExpo(prog(lt, S.f[3] + 0.2, S.f[3] + 1.0)));
    S.gS.position.z = S.gL.position.z - (DIM.L.d - DIM.S.d) / 2;
    trilho(cam, lt, [
      [0, [-0.4, 2.0, 3.4], [-1.4, 1.45, 0], 30],
      [2.4, [-1.0, 1.6, 1.7], [-1.85, 1.42, 0], 30],
      [S.f[1] - 0.8, [-0.6, 1.7, 2.0], [-1.6, 1.4, 0], 30],
      [S.f[1] + 0.6, [2.6, 2.9, 6.0], [0.55, 1.8, 0.9], 30],
      [S.f[2] - 0.2, [2.9, 2.3, 4.6], [0.6, 1.4, 0.5], 30],
      [S.f[2] + 1.0, [-2.4, 2.0, 3.6], [0.5, 1.35, 0.0], 30],
      [S.f[3] - 0.3, [-1.8, 1.9, 4.2], [0.5, 1.3, 0], 30],
      [S.f[3] + 0.8, [0.6, 2.2, 5.2], [0.55, 1.35, 0.4], 30],
      [S.dur, [0.4, 2.0, 4.8], [0.55, 1.35, 0.4], 30],
    ], { mao: 0.01 });
    const alvo = lt < S.f[1] ? V(-1.88, 1.42, 0) : V(sl.x, sl.y, Math.max(0.2, z));
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0018, maxblur: 0.008 }, bloom: 0.4 },
      overlay(ctx) {
        const g = f.grupo;
        callout(ctx, cam, dk.grupo.localToWorld(dk.pos(0.25, 0.44, 0.06)), 'POWER', lt, S.f[0] + 0.4, { lado: 'dir', dx: 110, dy: -120, t1: S.f[1] - 0.6, sub: 'liga o aparelho' });
        if (f.grupo.visible) {
          callout(ctx, cam, g.localToWorld(V(0.3, DIM.L.h / 2, 0.2)), 'Etiqueta para cima', lt, t0 + 2.3, { lado: 'dir', dx: 120, dy: -130, t1: ti + 0.2, sub: '↑ lado de cima' });
          callout(ctx, cam, g.localToWorld(V(-0.9, 0, -DIM.L.d / 2)), 'Tampa para dentro', lt, t0 + 3.2, { lado: 'esq', dx: 120, dy: 120, t1: ti + 0.2, sub: 'entra primeiro' });
        }
        textoKinetico(ctx, 'EMPURRE COM CALMA', W / 2, 210, 60, lt, ti + 0.3, { al: 'centro', peso: 900, t1: ti + 3.0 });
        textoKinetico(ctx, 'o mecanismo puxa a fita sozinho', W / 2, 262, 36, lt, ti + 1.8, { al: 'centro', fam: 'Rajdhani', peso: 600, t1: ti + 3.0, cor: COR.ouro });
        const pL = projetar(cam, V(sl.x - DIM.L.w / 2, sl.y + DIM.L.h, S.gL.position.z)), pS = projetar(cam, V(sl.x - DIM.S.w / 2, sl.y + DIM.S.h, S.gS.position.z));
        textoKinetico(ctx, 'L', pL.x, pL.y - 20, 54, lt, S.f[3] + 0.6, { peso: 900, t1: S.dur - 0.6, cor: COR.ouro });
        textoKinetico(ctx, 'S', pS.x, pS.y - 20, 54, lt, S.f[3] + 1.3, { peso: 900, t1: S.dur - 0.6, cor: COR.azul });
        textoKinetico(ctx, 'MESMA ENTRADA PARA S E L', W / 2, 960, 56, lt, S.f[3] + 0.5, { al: 'centro', peso: 900, t1: S.dur - 0.6 });
      },
    };
  },
  sons(S) { const ti = S.f[2]; return [['power', 3.0], ['liga_painel', 3.2], ['whoosh', S.f[1] - 0.4], ['virar', S.f[1] + 0.8], ['plastico', ti + 0.4], ['porta', ti + 0.9], ['carrega', ti + 1.75], ['mecanico', ti + 2.3], ['porta_fecha', ti + 2.5], ['whoosh', S.f[3] + 0.2], ['pop', S.f[3] + 0.6], ['pop', S.f[3] + 1.3]]; },
};

// ------------------------------------------------------------------ 09 · DURAÇÃO
function anel(r, p, cor) {
  const geo = new THREE.TorusGeometry(r, 0.022, 8, 160, Math.max(0.001, p) * Math.PI * 2);
  return geo;
}
export const s09 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-4, 9, 6], key: 320, angulo: 0.6, posRim: [5, 5, -7], rim: 200 }, corFundo: '#191b20' });
    S.e = e;
    S.cam = camera(30);
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, metalness: 0.5, roughness: 0.3 });
    S.aS = new THREE.Mesh(anel(1.0, 0), mat('#5cb8ff'));
    S.aL = new THREE.Mesh(anel(1.65, 0), mat('#f0c66a'));
    S.aS.rotation.x = S.aL.rotation.x = -Math.PI / 2;
    S.aS.position.set(-1.7, 0.02, 0.3);
    S.aL.position.set(1.3, 0.02, 0);
    e.cena.add(S.aS, S.aL);
    S.nS = texto3D('0', { fonte: 'titulo', tam: 0.55, mat: 'azul' });
    S.nL = texto3D('0', { fonte: 'titulo', tam: 0.7, mat: 'ouro' });
    S.mS = texto3D('MIN', { fonte: 'tech', tam: 0.22, mat: 'branco' });
    S.mL = texto3D('MIN', { fonte: 'tech', tam: 0.26, mat: 'branco' });
    S.nS.grupo.position.set(-1.7, 0.55, -0.7); S.mS.grupo.position.set(-1.7, 0.18, -0.65);
    S.nL.grupo.position.set(1.3, 0.62, -1.1); S.mL.grupo.position.set(1.3, 0.18, -1.05);
    for (const t of [S.nS, S.nL, S.mS, S.mL]) { t.grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; }); e.cena.add(t.grupo); }
    S.pS = -1; S.pL = -1;
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const fS = usar(cena, A.fitaS), fL = usar(cena, A.fitaL);
    fS.grupo.position.set(-1.7, DIM.S.h / 2, 0.3);
    fL.grupo.position.set(1.3, DIM.L.h / 2, 0);
    const ps = smooth(prog(lt, S.f[1] + 0.2, S.f[1] + 2.2));
    const pl = smooth(prog(lt, S.f[2] + 0.1, S.f[2] + 2.3));
    fS.setCarretel(1 - ps); fL.setCarretel(1 - pl);
    fS.girar(ps * 30); fL.girar(pl * 40);
    const qs = Math.round(ps * 100) / 100, ql = Math.round(pl * 100) / 100;
    if (qs !== S.pS) { S.pS = qs; S.aS.geometry.dispose(); S.aS.geometry = anel(1.0, qs); }
    if (ql !== S.pL) { S.pL = ql; S.aL.geometry.dispose(); S.aL.geometry = anel(1.65, ql); }
    S.aS.rotation.z = Math.PI / 2; S.aL.rotation.z = Math.PI / 2;
    S.nS.set(String(Math.round(ps * 30)));
    S.nL.set(String(Math.round(pl * 90)));
    animarLetras(S.nS, lt, S.f[1], null, { tipo: 'escala', stagger: 0 });
    animarLetras(S.mS, lt, S.f[1] + 0.2, null, { tipo: 'giro', stagger: 0.05 });
    animarLetras(S.nL, lt, S.f[2], null, { tipo: 'escala', stagger: 0 });
    animarLetras(S.mL, lt, S.f[2] + 0.2, null, { tipo: 'giro', stagger: 0.05 });
    trilho(cam, lt, [
      [0, [-0.2, 3.6, 5.6], [-0.2, 0.2, -0.2], 30],
      [S.f[1] - 0.3, [-1.2, 2.6, 3.9], [-1.5, 0.3, -0.2], 30],
      [S.f[2] - 0.3, [0.2, 2.9, 4.6], [0.6, 0.3, -0.3], 30],
      [S.f[3], [-0.2, 3.4, 5.8], [-0.2, 0.3, -0.3], 30],
      [S.dur, [-0.3, 3.2, 5.4], [-0.2, 0.3, -0.3], 30],
    ], { mao: 0.008 });
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(V(-0.2, 0.3, 0)), aperture: 0.0012, maxblur: 0.006 }, bloom: 0.45 },
      overlay(ctx) {
        textoKinetico(ctx, 'QUANTO CABE EM CADA UMA?', W / 2, 205, 60, lt, S.f[0] + 0.1, { al: 'centro', peso: 900, t1: S.f[1] + 0.5 });
        cartao(ctx, 110, 650, [['PADRÃO 525 LINHAS', { tam: 38, peso: 700, cor: COR.ouro }], 'Brasil e Estados Unidos', 'S: até 30 min · L: até 90 min'], lt, S.f[3] + 0.1, S.dur - 0.5, { w: 600 });
        cartao(ctx, 1210, 650, [['PADRÃO 625 LINHAS', { tam: 38, peso: 700, cor: COR.azul }], 'Europa', 'L: passa de 100 min (até 108)'], lt, S.f[3] + 4.4, S.dur - 0.5, { w: 600, cor: COR.azul });
      },
    };
  },
  sons(S) { return [['whoosh', S.f[0] + 0.1], ['contador', S.f[1] + 0.2], ['ding', S.f[1] + 2.2], ['contador', S.f[2] + 0.1], ['contador', S.f[2] + 1.2], ['ding', S.f[2] + 2.3], ['whoosh', S.f[3] + 0.1], ['whoosh', S.f[3] + 4.4]]; },
};

// ------------------------------------------------------------------ 10 · GRAVAR
export const s10 = {
  preparar(A, S) {
    S.e = estudio({ luz: { posKey: [-5, 8, 7], key: 380, angulo: 0.6, posRim: [6, 6, -6], rim: 200, alvo: [0, 1, 0] }, zFundo: -9 });
    S.cam = camera(30);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    dk.setPower(1);
    dk.setLuz(1);
    dk.setIndicador(1);
    dk.setLed('servo', 1);
    dk.setChave('input', lerp(1, 0, smooth(prog(lt, S.f[0] + 1.4, S.f[0] + 1.8))));
    const nivel = smooth(prog(lt, S.f[1] + 0.6, S.f[1] + 2.4));
    dk.knobs.ch1_rec.rotation.z = -nivel * 1.1;
    dk.knobs.ch2_rec.rotation.z = -nivel * 1.05;
    const som = Math.abs(fbm(lt * 3.3, 7));
    dk.setVU(0.1 + nivel * (0.55 + 0.3 * som), 0.1 + nivel * (0.52 + 0.3 * Math.abs(fbm(lt * 3.1, 9))), 0.6);
    const tp = S.f[2] + 0.7;
    const pr = pressao(lt, tp, 0.45);
    dk.apertar('rec', pr);
    dk.apertar('play', pr);
    const grav = lt > tp + 0.25;
    dk.setLed('rec', grav ? 1 : 0);
    dk.setContador(grav ? tc(lt - tp - 0.25) : '00:00:00:00');
    trilho(cam, lt, [
      [0, [2.4, 1.7, 2.6], [0.7, 1.0, 0], 30],
      [S.f[0] + 0.4, [1.9, 1.35, 1.6], [0.65, 1.0, 0], 28],
      [S.f[1] - 0.2, [-0.4, 1.6, 2.0], [-1.25, 1.25, 0], 28],
      [S.f[1] + 2.4, [-0.7, 1.4, 1.6], [-1.35, 1.2, 0], 28],
      [S.f[2] - 0.2, [0.55, 0.95, 1.6], [0.08, 0.27, 0], 28],
      [S.f[2] + 1.4, [0.45, 0.8, 1.3], [0.07, 0.27, 0], 28],
      [S.f[3] + 0.3, [1.8, 1.25, 2.6], [0.7, 0.55, 0], 30],
      [S.dur, [2.2, 1.4, 3.0], [0.7, 0.6, 0], 30],
    ], { mao: 0.008 });
    const alvo = lt < S.f[1] ? V(0.64, 1.0, 0) : lt < S.f[2] ? V(-1.3, 1.2, 0) : lt < S.f[3] ? V(0.07, 0.27, 0) : V(0.9, 0.6, 0);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0022, maxblur: 0.009 }, bloom: 0.45 },
      overlay(ctx) {
        const w = (fx, fy, z = 0.05) => dk.grupo.localToWorld(dk.pos(fx, fy, z));
        callout(ctx, cam, w(2.78, 0.79), 'Input select', lt, S.f[0] + 0.8, { lado: 'esq', dx: 120, dy: -140, t1: S.f[1] - 0.4, sub: 'escolha a entrada de vídeo' });
        callout(ctx, cam, w(0.6, 0.79, 0.07), 'Nível CH-1', lt, S.f[1] + 0.6, { lado: 'esq', dx: 90, dy: 120, t1: S.f[2] - 0.4 });
        callout(ctx, cam, w(1.02, 0.79, 0.07), 'Nível CH-2', lt, S.f[1] + 1.0, { lado: 'dir', dx: 90, dy: 130, t1: S.f[2] - 0.4 });
        textoKinetico(ctx, 'PONTEIRO PERTO DO 0 VU', W / 2, 205, 56, lt, S.f[1] + 1.6, { al: 'centro', peso: 900, t1: S.f[2] - 0.4 });
        textoKinetico(ctx, 'sem entrar no vermelho', W / 2, 255, 36, lt, S.f[1] + 2.0, { al: 'centro', fam: 'Rajdhani', peso: 600, t1: S.f[2] - 0.4, cor: '#ff8a80' });
        textoKinetico(ctx, 'REC + PLAY', W / 2, 980, 96, lt, S.f[2] + 0.2, { al: 'centro', peso: 900, t1: S.f[3] + 0.4, grad: ['#ffffff', '#ff6a5a'] });
        textoKinetico(ctx, 'juntos', W / 2, 1035, 36, lt, S.f[2] + 0.5, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.f[3] + 0.4, cor: COR.ouro });
        if (lt > S.f[3] + 0.3 && lt < S.dur - 0.4) {
          const pisca = Math.floor((lt - S.f[3]) * 1.6) % 2 === 0;
          ctx.save();
          ctx.globalAlpha = smooth(prog(lt, S.f[3] + 0.3, S.f[3] + 0.7)) * (1 - smooth(prog(lt, S.dur - 0.9, S.dur - 0.4)));
          ctx.fillStyle = 'rgba(10,10,12,0.6)';
          ctx.fillRect(W - 470, 120, 360, 90);
          ctx.fillStyle = pisca ? '#ff3b30' : '#5a1510';
          ctx.beginPath(); ctx.arc(W - 420, 165, 20, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '900 52px "Montserrat"';
          ctx.fillText('GRAVANDO', W - 385, 184);
          ctx.restore();
        }
      },
    };
  },
  sons(S) { const tp = S.f[2] + 0.7; return [['chave', S.f[0] + 1.45], ['pop', S.f[0] + 0.8], ['knob', S.f[1] + 0.7], ['knob', S.f[1] + 1.6], ['clique', tp], ['clique', tp + 0.03], ['rele', tp + 0.25], ['bip', tp + 0.3], ['mecanico', tp + 0.4], ['impacto_suave', S.f[2] + 0.2]]; },
};

// ------------------------------------------------------------------ 11 · FRAME A FRAME
import { tiraQuadros } from './extras.js';
export const s11 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-5, 8, 7], key: 360, angulo: 0.6, posRim: [6, 6, -6], rim: 200, alvo: [0.5, 1, 0] }, zFundo: -9 });
    S.e = e;
    S.cam = camera(30);
    S.tira = tiraQuadros(7);
    S.tira.grupo.position.set(0.4, 2.55, 0.5);
    S.tira.grupo.scale.setScalar(0.62);
    e.cena.add(S.tira.grupo);
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    dk.setPower(1); dk.setLuz(1); dk.setIndicador(1); dk.setLed('servo', 1);
    dk.setVU(0.12, 0.12, 0.6);
    dk.setLed('jog', 1);
    // passos do jog: para frente e para trás
    const passos = [[2.6, 1], [3.2, 1], [3.8, 1], [4.4, 1], [5.2, -1], [5.8, -1], [6.6, 1], [7.2, 1], [7.8, 1], [S.f[2] + 0.4, 1], [S.f[2] + 1.0, 1], [S.f[2] + 1.6, -1]];
    let n = 0, ang = 0;
    for (const [t, d] of passos) { const k = smooth(prog(lt, t, t + 0.22)); n += d * (k > 0.5 ? 1 : 0); ang += d * k * 0.21; }
    dk.setJog(ang);
    dk.setLed('dir', 1);
    const quadro = 15 + n;
    const base = 754 * 29.97 + 0;
    dk.setContador(`00:12:34:${String(quadro).padStart(2, '0')}`);
    const corte = lt > S.f[2] + 1.9 ? quadro : -99;
    S.tira.set(quadro, corte);
    S.tira.grupo.visible = true;
    S.tira.grupo.position.x = 0.4;
    S.tira.grupo.rotation.y = Math.sin(lt * 0.4) * 0.05;
    void base;
    trilho(cam, lt, [
      [0, [2.6, 1.9, 4.2], [1.0, 1.3, 0.3], 30],
      [S.f[0] + 0.2, [2.3, 1.4, 2.8], [1.1, 0.9, 0.3], 30],
      [S.f[1] - 0.3, [2.2, 1.3, 2.7], [1.1, 0.9, 0.3], 30],
      [S.f[1] + 0.8, [1.6, 0.85, 1.35], [1.25, 0.66, 0.0], 26],
      [S.f[2] - 0.3, [1.5, 0.85, 1.3], [1.25, 0.66, 0.0], 26],
      [S.f[2] + 0.9, [0.8, 2.5, 5.0], [0.45, 1.95, 0.3], 30],
      [S.dur, [0.6, 2.55, 4.7], [0.42, 2.05, 0.3], 30],
    ], { mao: 0.008 });
    const alvo = lt < S.f[1] + 0.4 ? V(1.1, 1.2, 0.3) : lt < S.f[2] + 0.3 ? V(1.25, 0.66, 0) : V(0.4, 2.0, 0.5);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0016, maxblur: 0.007 }, bloom: 0.45 },
      overlay(ctx) {
        textoKinetico(ctx, '1 GIRO = 1 QUADRO', 120, 930, 70, lt, S.f[0] + 0.8, { peso: 900, t1: S.f[1] - 0.3, grad: ['#fff1c8', '#e0a63c'] });
        textoKinetico(ctx, '◀ para trás · para frente ▶', 126, 985, 36, lt, S.f[0] + 1.2, { fam: 'Rajdhani', peso: 700, t1: S.f[1] - 0.3 });
        const w = (fx, fy) => dk.grupo.localToWorld(dk.pos(fx, fy, 0.05));
        callout(ctx, cam, w(3.46, 1.5), 'Jog', lt, S.f[0] + 0.3, { lado: 'esq', dx: 100, dy: -120, t1: S.f[1] - 0.3, sub: 'modo quadro a quadro' });
        const rot = [['HORAS', 3.06], ['MIN', 3.28], ['SEG', 3.5], ['QUADROS', 3.72]];
        rot.forEach(([s, fx], i) => {
          const p = projetar(cam, w(fx, 1.3));
          textoKinetico(ctx, s, p.x, p.y + 60, 34, lt, S.f[1] + 1.0 + i * 0.25, { al: 'centro', fam: 'Rajdhani', peso: 700, t1: S.f[2] - 0.3, cor: i === 3 ? '#ff8a80' : COR.branco });
        });
        textoKinetico(ctx, '≈ 30 QUADROS POR SEGUNDO', W / 2, 205, 58, lt, S.f[1] + 0.4, { al: 'centro', peso: 900, t1: S.f[2] - 0.3 });
        textoKinetico(ctx, '(29,97 no padrão de 525 linhas)', W / 2, 255, 32, lt, S.f[1] + 0.8, { al: 'centro', fam: 'Rajdhani', peso: 600, t1: S.f[2] - 0.3, cor: COR.cinza });
        textoKinetico(ctx, 'O PONTO EXATO DO CORTE', W / 2, 960, 62, lt, S.f[2] + 1.9, { al: 'centro', peso: 900, t1: S.dur - 0.5, grad: ['#ffffff', '#ff6a5a'] });
      },
    };
  },
  sons(S) {
    const r = [];
    for (const t of [2.6, 3.2, 3.8, 4.4, 5.2, 5.8, 6.6, 7.2, 7.8, S.f[2] + 0.4, S.f[2] + 1.0, S.f[2] + 1.6]) r.push(['tique', t + 0.1]);
    r.push(['whoosh', S.f[1] + 0.3], ['impacto_suave', S.f[2] + 1.9]);
    return r;
  },
};

// ------------------------------------------------------------------ 12 · MANUTENÇÃO
export const s12 = {
  preparar(A, S) {
    const e = estudio({ luz: { posKey: [-3, 9, 2], key: 420, angulo: 0.7, posRim: [6, 6, -8], rim: 200, alvo: [0.5, 1, -2.2] }, zFundo: -10 });
    S.e = e;
    S.cam = camera(30);
    S.mon = monitor(1.4, 'falha');
    S.mon.grupo.position.set(-3.6, 0, 0.6);
    S.mon.grupo.rotation.y = 0.35;
    e.cena.add(S.mon.grupo);
    S.frasco = frasco();
    S.frasco.position.set(2.85, 0, 0.9);
    e.cena.add(S.frasco);
    S.haste = haste();
    e.cena.add(S.haste);
    S.prat = prateleira((i) => criarFita('L', { etiqueta: ['JORNAL 1994\nMASTER', 'ESPORTE\nGOLS 1998', 'VINHETAS\nABERTURAS', 'NOVELA\nCAP. 12', 'COMERCIAIS\nBLOCO 3', 'ARQUIVO\nENTREVISTAS'][i], fracao: 0.02 }), 6);
    S.prat.grupo.position.set(6.2, 0, -1.2);
    S.prat.grupo.rotation.y = -0.5;
    e.cena.add(S.prat.grupo);
    const lp = new THREE.SpotLight('#fff0dc', 260, 0, 0.5, 0.6, 2);
    lp.position.set(3.4, 6, 4.0);
    lp.target.position.set(6.1, 1.2, -1.1);
    e.cena.add(lp, lp.target);
    S.luzPrat = lp;
  },
  quadro(lt, S, A) {
    const { cena } = S.e, cam = S.cam;
    const dk = usar(cena, A.deck);
    const mec = A.mec;
    S.luzPrat.intensity = 260 * smooth(prog(lt, S.f[3] - 0.5, S.f[3] + 0.5));
    dk.verInterno = true;
    dk.setTampaSup(smooth(prog(lt, S.f[1] - 1.0, S.f[1] + 0.2)) * 0.999 + (lt > S.f[1] + 0.2 ? 0.001 : 0));
    dk.setPower(0); dk.setLuz(0);
    mec.setCarregamento(0);
    mec.fitaMesh.visible = false;
    mec.setTambor(lt * 0.4, false);
    mec.setRolo(0);
    S.mon.desenhar(lt);
    // haste limpando o tambor (movimento horizontal, contornando o tambor)
    const T = MEC.tambor;
    const limp = janela(lt, S.f[1] + 1.0, S.f[2] + 0.4, 0.6, 0.6);
    S.haste.visible = limp > 0.01;
    const a = Math.PI / 2 + Math.sin((lt - S.f[1]) * 2.4) * 0.5;
    const rr = T.r + 0.035 + (1 - limp) * 0.6;
    S.haste.position.set(T.x + Math.cos(a) * rr, MEC.yPlaca + 0.215 + (1 - limp) * 0.5, T.z + Math.sin(a) * rr);
    S.haste.rotation.set(0.25, -a + Math.PI / 2, 0);
    trilho(cam, lt, [
      [0, [-2.7, 1.05, 2.5], [-3.55, 0.55, 0.55], 30],
      [S.f[1] - 1.2, [-2.4, 1.15, 2.8], [-3.4, 0.55, 0.55], 30],
      [S.f[1] + 0.3, [2.4, 3.6, 0.6], [0.6, 1.0, -2.4], 30],
      [S.f[1] + 1.6, [1.7, 2.05, -1.2], [0.6, 1.05, -2.6], 30],
      [S.f[2] - 0.2, [1.5, 1.95, -1.4], [0.6, 1.05, -2.6], 30],
      [S.f[2] + 1.2, [-1.4, 3.0, 0.4], [0.5, 1.0, -2.6], 30],
      [S.f[3] - 0.2, [-0.6, 3.2, 1.2], [0.6, 0.9, -2.4], 30],
      [S.f[3] + 1.2, [3.6, 2.1, 3.4], [5.9, 1.1, -1.2], 30],
      [S.dur, [3.9, 1.9, 3.0], [6.0, 1.1, -1.2], 30],
    ], { mao: 0.01 });
    const alvo = lt < S.f[1] - 0.4 ? V(-3.5, 0.65, 0.5) : lt < S.f[3] ? V(T.x, MEC.yPlaca + 0.25, T.z) : V(6.0, 1.1, -1.2);
    return {
      cena, cam,
      pos: { dof: { focus: cam.position.distanceTo(alvo), aperture: 0.0018, maxblur: 0.008 }, bloom: 0.35 },
      overlay(ctx) {
        textoKinetico(ctx, 'CABEÇA SUJA', 120, 860, 84, lt, S.f[0] + 0.2, { peso: 900, t1: S.f[1] - 0.6 });
        textoKinetico(ctx, '= CHUVISCO E FALHAS NA IMAGEM', 126, 920, 40, lt, S.f[0] + 0.6, { fam: 'Rajdhani', peso: 700, t1: S.f[1] - 0.6, cor: '#ff8a80' });
        const t1 = S.f[2] - 0.2;
        const g = dk.grupo;
        callout(ctx, cam, V(T.x - 0.2, MEC.yPlaca + 0.22, T.z + 0.3), 'Cabeças (no tambor)', lt, S.f[1] + 1.4, { lado: 'esq', dx: 110, dy: -120, t1 });
        callout(ctx, cam, A.mec.gTensao.localToWorld(V(0, 0.3, 0)), 'Guias', lt, S.f[1] + 2.4, { lado: 'dir', dx: 90, dy: 130, t1 });
        callout(ctx, cam, A.mec.rolo.localToWorld(V(0.1, 0.2, 0)), 'Rolo de pressão', lt, S.f[1] + 3.4, { lado: 'dir', dx: 90, dy: -110, t1 });
        void g;
        cartao(ctx, 1200, 120, [['HASTE DE CAMURÇA', { tam: 38, peso: 700, cor: COR.ouro }], '+ álcool isopropílico', 'movimento só na horizontal'], lt, S.f[1] + 0.8, t1, { w: 600 });
        // horas do tambor
        if (lt > S.f[2] && lt < S.f[3] + 0.6) {
          const a2 = smooth(prog(lt, S.f[2] + 0.2, S.f[2] + 0.8)) * (1 - smooth(prog(lt, S.f[3] - 0.2, S.f[3] + 0.4)));
          ctx.save();
          ctx.globalAlpha = a2;
          ctx.fillStyle = 'rgba(10,10,12,0.72)';
          ctx.fillRect(W / 2 - 380, 120, 760, 190);
          ctx.fillStyle = '#ff3a2a';
          ctx.font = '400 92px "Share Tech Mono"';
          ctx.textAlign = 'center';
          const horas = Math.round(lerp(0, 1284, smooth(prog(lt, S.f[2] + 0.4, S.f[2] + 2.2))));
          ctx.fillText(`${horas.toLocaleString('pt-BR')} h`, W / 2, 222);
          ctx.fillStyle = COR.branco;
          ctx.font = '700 34px "Rajdhani"';
          ctx.fillText('HORAS DE USO DO TAMBOR', W / 2, 160);
          const pb = horas / 1500;
          ctx.fillStyle = '#2a2a2e'; ctx.fillRect(W / 2 - 320, 260, 640, 18);
          ctx.fillStyle = pb > 0.8 ? '#ff8a3a' : COR.ouro; ctx.fillRect(W / 2 - 320, 260, 640 * pb, 18);
          ctx.fillStyle = COR.cinza; ctx.font = '600 24px "Rajdhani"'; ctx.textAlign = 'right';
          ctx.fillText('REVISÃO', W / 2 + 320, 302);
          ctx.restore();
        }
        const t3 = S.f[3] + 0.6;
        ['✓ EM PÉ', '✓ REBOBINADAS', '✗ CALOR', '✗ UMIDADE'].forEach((s, i) => {
          textoKinetico(ctx, s, 120, 640 + i * 78, 56, lt, t3 + i * 0.5, { peso: 900, t1: S.dur - 0.5, cor: s.startsWith('✓') ? '#9dffb0' : '#ff8a80' });
        });
      },
    };
  },
  sons(S) { return [['estatica', S.f[0]], ['mecanico', S.f[1] - 1.0], ['whoosh_longo', S.f[1] - 0.6], ['limpeza', S.f[1] + 1.1], ['pop', S.f[1] + 1.4], ['pop', S.f[1] + 2.4], ['pop', S.f[1] + 3.4], ['contador', S.f[2] + 0.4], ['whoosh_longo', S.f[3] + 0.1], ['pop', S.f[3] + 0.6], ['pop', S.f[3] + 1.1], ['pop', S.f[3] + 1.6], ['pop', S.f[3] + 2.1]]; },
};
