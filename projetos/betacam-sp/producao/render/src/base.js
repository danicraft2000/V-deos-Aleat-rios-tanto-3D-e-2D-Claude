// Peças comuns às cenas: ativos compartilhados, câmera em trilho, título 3D do capítulo.
import * as THREE from 'three';
import { W, H, clamp, prog, lerp, smooth, smoother, easeOutExpo, fbm } from './util.js';
import { novaCena, ciclorama, mesa, luzes } from './motor.js';
import { texto3D, animarLetras } from './texto3d.js';
import { criarFita } from './fita.js';
import { criarDeck } from './deck.js';
import { criarMecanismo } from './mecanismo.js';

export function criarAtivos() {
  const deck = criarDeck();
  return {
    deck,
    mec: criarMecanismo(deck),
    fitaS: criarFita('S'),
    fitaL: criarFita('L'),
    fitaL2: criarFita('L', { etiqueta: 'JORNAL · MASTER\nVT 14/03/1996', fracao: 0.6 }),
    fitaS2: criarFita('S', { etiqueta: 'REPORTAGEM\nBRUTO · CAM 2', fracao: 0.4 }),
  };
}

export function camera(fov = 30) {
  return new THREE.PerspectiveCamera(fov, W / H, 0.05, 120);
}

/** Estúdio padrão: ciclorama escuro + mesa brilhante + luzes */
export function estudio(o = {}) {
  const cena = novaCena(o);
  if (o.ciclo !== false) cena.add(ciclorama({ cor: o.corFundo ?? '#101114', z: o.zFundo ?? -7, raio: o.raio ?? 6 }));
  if (o.mesa !== false) cena.add(mesa({ cor: o.corMesa ?? '#101114', rugosidade: o.rugMesa ?? 0.32, verniz: o.verniz ?? 0.7 }));
  const L = luzes(cena, o.luz ?? {});
  return { cena, L };
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
/**
 * Câmera em trilho: keys = [[t, [px,py,pz], [ax,ay,az], fov?], ...]. Interpolação suave entre as chaves.
 * o.mao = amplitude de "câmera na mão" (tremor orgânico).
 */
export function trilho(cam, lt, keys, o = {}) {
  let i = 0;
  while (i < keys.length - 1 && lt > keys[i + 1][0]) i++;
  const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)];
  const p = k1 === k0 ? 0 : smoother(clamp((lt - k0[0]) / (k1[0] - k0[0])));
  _a.fromArray(k0[1]).lerp(_b.fromArray(k1[1]), p);
  cam.position.copy(_a);
  const alvo = new THREE.Vector3().fromArray(k0[2]).lerp(_b.fromArray(k1[2]), p);
  const m = o.mao ?? 0.012;
  cam.position.x += fbm(lt * 0.35, 1) * m;
  cam.position.y += fbm(lt * 0.3, 2) * m;
  alvo.x += fbm(lt * 0.33, 3) * m * 0.6;
  alvo.y += fbm(lt * 0.31, 4) * m * 0.6;
  cam.lookAt(alvo);
  cam.fov = lerp(k0[3] ?? 30, k1[3] ?? k0[3] ?? 30, p);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return alvo;
}

/** coloca um objeto compartilhado na cena (move de uma cena para outra) */
export function usar(cena, obj, pai = cena) {
  const o = obj.grupo ?? obj;
  if (o.parent !== pai) pai.add(o);
  obj.padrao?.();
  o.visible = true;
  return obj;
}

// ------------------------------------------------------------------ título 3D do capítulo
const titulos = {};
const ESC_T = 0.3;
function quebra(s, max) {
  const pal = s.split(' ');
  const linhas = [''];
  for (const p of pal) {
    const l = linhas[linhas.length - 1];
    if ((l + ' ' + p).trim().length > max && l) linhas.push(p);
    else linhas[linhas.length - 1] = (l + ' ' + p).trim();
  }
  return linhas;
}
function criaTitulo(S) {
  const g = new THREE.Group();
  const num = texto3D(String(S.numero).padStart(2, '0'), { fonte: 'titulo', tam: 0.6, mat: 'ouro' });
  num.grupo.position.y = 0.34;
  g.add(num.grupo);
  const tituloUp = S.titulo.toUpperCase();
  const linhas = quebra(tituloUp, tituloUp.length > 26 ? 20 : 26);
  const tam = linhas.length > 1 ? 0.17 : 0.19;
  const ls = linhas.map((l, i) => {
    const t = texto3D(l, { fonte: 'forte', tam, mat: 'branco', prof: tam * 0.18 });
    t.grupo.position.y = -0.1 - i * tam * 1.38;
    g.add(t.grupo);
    return t;
  });
  const barra = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.012), new THREE.MeshStandardMaterial({ color: '#f0c66a', metalness: 1, roughness: 0.25, emissive: '#5a3a08', emissiveIntensity: 0.6 }));
  barra.position.y = 0.075;
  g.add(barra);
  const luz = new THREE.PointLight('#fff2dc', 0.5, 1.2, 2);
  g.add(luz);
  const larg = Math.max(...ls.map((l) => l.larg), num.larg);
  // perto da câmera (na frente de tudo) e em escala reduzida
  g.scale.setScalar(ESC_T);
  g.position.set(0, 0.06 * ESC_T, -4.2 * ESC_T);
  return { g, num, ls, barra, luz, larg };
}

export function tituloCapitulo(S, lt, r) {
  if (S.numero === 1) return {};
  const T = (titulos[S.id] ||= criaTitulo(S));
  const cam = r.cam;
  if (cam.parent !== r.cena) r.cena.add(cam);
  if (T.g.parent !== cam) cam.add(T.g);
  const tOut = 2.25;
  if (lt > tOut + 1.3) { T.g.visible = false; return {}; }
  T.g.visible = true;
  animarLetras(T.num, lt, 0.12, tOut, { tipo: 'voo', stagger: 0.09, dur: 0.95, zSaida: 3.6, z0: 3.0 });
  T.ls.forEach((l, i) => animarLetras(l, lt, 0.4 + i * 0.12, tOut + 0.08 + i * 0.06, { tipo: 'giro', stagger: 0.016, dur: 0.6, zSaida: 3.0 }));
  T.barra.scale.x = Math.max(0.001, easeOutExpo(prog(lt, 0.35, 1.1)) * (1 - smooth(prog(lt, tOut, tOut + 0.35))) * T.larg);
  T.g.position.z = (-4.2 + lt * 0.07) * ESC_T;
  T.luz.position.set(lerp(-2.4, 2.4, prog(lt, 0.3, 2.3)), 0.5, 0.7);
  T.luz.intensity = 0.5 * (1 - prog(lt, tOut, tOut + 0.4));
  const k = smooth(prog(lt, tOut - 0.1, tOut + 0.9));
  const d = r.pos?.dof;
  return { dof: { focus: lerp(4.1 * ESC_T, d?.focus ?? 8, k), aperture: lerp(0.012, d?.aperture ?? 0.0012, k), maxblur: lerp(0.013, d?.maxblur ?? 0.006, k) } };
}

/** valor interpolado por chaves [[t, v], ...] com suavização */
export function chaves(lt, ks) {
  if (lt <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    if (lt <= ks[i + 1][0]) {
      const p = smoother((lt - ks[i][0]) / (ks[i + 1][0] - ks[i][0]));
      const a = ks[i][1], b = ks[i + 1][1];
      return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], p)) : lerp(a, b, p);
    }
  }
  return ks[ks.length - 1][1];
}

/** pressão de botão: 0 -> 1 -> 0 em torno de t0 */
export const pressao = (lt, t0, seg = 0.28) => Math.max(0, 1 - Math.abs(lt - t0 - seg / 2) / (seg / 2));
