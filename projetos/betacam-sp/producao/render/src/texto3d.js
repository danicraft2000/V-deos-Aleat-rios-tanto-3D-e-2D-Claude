// Texto 3D extrudado com chanfro (tipografia em movimento): cada letra é uma malha própria,
// o que permite animar letra a letra (voo, giro, queda, contagem de números).
import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { clamp, easeOutExpo, easeOutBack, easeInCubic, prog, lerp } from './util.js';
import { comEnv } from './motor.js';

const FONTES = {};
const cacheGeo = new Map();
const NM = '/producao/render/node_modules/@fontsource';

export async function carregarFontes3D() {
  const l = new TTFLoader();
  const ld = async (arq) => new Font(await l.loadAsync(arq));
  FONTES.titulo = await ld(`${NM}/montserrat/files/montserrat-latin-900-normal.woff`);
  FONTES.forte = await ld(`${NM}/montserrat/files/montserrat-latin-800-normal.woff`);
  FONTES.tech = await ld(`${NM}/rajdhani/files/rajdhani-latin-700-normal.woff`);
}

export const MAT = {};
export function materiaisTexto() {
  if (MAT.ouro) return MAT;
  MAT.ouro = new THREE.MeshPhysicalMaterial({ color: '#f0c66a', metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.15, envMapIntensity: 1.5 });
  MAT.ouroLado = new THREE.MeshPhysicalMaterial({ color: '#9a6a22', metalness: 1, roughness: 0.32, envMapIntensity: 1.2 });
  MAT.cromo = new THREE.MeshPhysicalMaterial({ color: '#e9edf2', metalness: 1, roughness: 0.1, envMapIntensity: 1.6 });
  MAT.cromoLado = new THREE.MeshPhysicalMaterial({ color: '#7d838c', metalness: 1, roughness: 0.25 });
  MAT.branco = new THREE.MeshPhysicalMaterial({ color: '#f4f4f2', metalness: 0, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  MAT.brancoLado = new THREE.MeshPhysicalMaterial({ color: '#9a9ca0', metalness: 0.2, roughness: 0.4 });
  MAT.vermelho = new THREE.MeshPhysicalMaterial({ color: '#d0262c', metalness: 0.1, roughness: 0.3, clearcoat: 0.8 });
  MAT.vermelhoLado = new THREE.MeshPhysicalMaterial({ color: '#6a1015', roughness: 0.4 });
  MAT.azul = new THREE.MeshPhysicalMaterial({ color: '#59b4ff', metalness: 0.3, roughness: 0.25, clearcoat: 0.8, emissive: '#0b3a66', emissiveIntensity: 0.4 });
  MAT.azulLado = new THREE.MeshPhysicalMaterial({ color: '#1d4f80', roughness: 0.4 });
  for (const k in MAT) comEnv(MAT[k], MAT[k].envMapIntensity ?? 1);
  return MAT;
}

function geoLetra(fonte, ch, tam, prof, bev) {
  const k = `${fonte}|${ch}|${tam}|${prof}|${bev}`;
  if (cacheGeo.has(k)) return cacheGeo.get(k);
  const f = FONTES[fonte];
  const formas = f.generateShapes(ch, tam);
  const geo = new THREE.ExtrudeGeometry(formas, {
    depth: prof, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * 0.75, bevelSegments: 3, curveSegments: 7,
  });
  const g = f.data.glyphs[ch] ?? f.data.glyphs['?'];
  const adv = ((g?.ha ?? f.data.resolution * 0.5) * tam) / f.data.resolution;
  // pivô no centro da letra
  geo.translate(-adv / 2, -tam * 0.36, -prof / 2);
  geo.computeVertexNormals();
  const r = { geo, adv };
  cacheGeo.set(k, r);
  return r;
}

/**
 * Cria um texto 3D. o: { fonte, tam, prof, bev, mat:'ouro'|'cromo'|'branco'|..., al:'centro'|'esq'|'dir', esp (espaçamento extra) }
 * Retorna { grupo, letras:[{m, x, ch}], larg, set(str) } — set troca o texto (útil para contadores).
 */
export function texto3D(str, o = {}) {
  const M = materiaisTexto();
  const grupo = new THREE.Group();
  const fonte = o.fonte ?? 'titulo', tam = o.tam ?? 0.5, prof = o.prof ?? tam * 0.22, bev = o.bev ?? tam * 0.025;
  const mats = [M[o.mat ?? 'ouro'], M[(o.mat ?? 'ouro') + 'Lado']];
  const api = { grupo, letras: [], larg: 0, tam, str: '' };
  api.set = (s) => {
    if (s === api.str) return api;
    api.str = s;
    for (const l of api.letras) grupo.remove(l.m);
    api.letras = [];
    let x = 0;
    const esp = (o.esp ?? 0) * tam;
    for (const ch of s) {
      if (ch === ' ') { x += tam * 0.32 + esp; continue; }
      const { geo, adv } = geoLetra(fonte, ch, tam, prof, bev);
      const m = new THREE.Mesh(geo, o.clonar ? mats.map((mm) => mm.clone()) : mats);
      m.position.x = x + adv / 2;
      grupo.add(m);
      api.letras.push({ m, x: x + adv / 2, ch });
      x += adv + esp;
    }
    api.larg = x - esp;
    const off = o.al === 'esq' ? 0 : o.al === 'dir' ? -api.larg : -api.larg / 2;
    for (const l of api.letras) { l.x += off; l.m.position.x = l.x; }
    return api;
  };
  api.set(str);
  return api;
}

/**
 * Anima a entrada/saída letra a letra.
 * lt = tempo local; t0 = início da entrada; t1 = início da saída (ou null).
 * tipo: 'voo' | 'giro' | 'queda' | 'escala'
 */
export function animarLetras(txt, lt, t0, t1 = null, o = {}) {
  const n = txt.letras.length;
  const stg = o.stagger ?? 0.035, dur = o.dur ?? 0.75, tipo = o.tipo ?? 'voo';
  const durS = o.durSaida ?? 0.5;
  txt.letras.forEach((l, i) => {
    const ordem = o.reverso ? n - 1 - i : i;
    const p = clamp((lt - t0 - ordem * stg) / dur);
    let ps = 0;
    if (t1 != null) ps = clamp((lt - t1 - ordem * (o.staggerSaida ?? stg * 0.6)) / durS);
    const m = l.m;
    const e = tipo === 'queda' ? easeOutBack(p, 1.4) : easeOutExpo(p);
    m.position.set(l.x, 0, 0);
    m.rotation.set(0, 0, 0);
    let s = 1;
    if (tipo === 'voo') {
      m.position.z = lerp(o.z0 ?? 2.2, 0, e);
      m.position.y = lerp(-0.25 * txt.tam, 0, e);
      m.rotation.y = lerp(-1.3, 0, e);
      s = lerp(0.001, 1, Math.min(1, p * 2.5));
    } else if (tipo === 'giro') {
      m.rotation.x = lerp(-Math.PI / 2, 0, e);
      m.position.y = lerp(-txt.tam * 0.6, 0, e);
      s = p > 0 ? 1 : 0.001;
    } else if (tipo === 'queda') {
      m.position.y = lerp(txt.tam * 2.2, 0, e);
      m.rotation.z = lerp(0.6, 0, e);
      s = p > 0 ? 1 : 0.001;
    } else if (tipo === 'escala') {
      s = Math.max(0.001, easeOutBack(p, 2.0));
    }
    if (ps > 0) {
      const es = easeInCubic(ps);
      m.position.z += es * (o.zSaida ?? 3.0);
      m.position.y += es * (o.ySaida ?? 0);
      m.rotation.y += es * (o.rotSaida ?? 0.9);
      s *= 1 - Math.max(0, (ps - 0.6) / 0.4);
    }
    m.scale.setScalar(Math.max(0.001, s));
    m.visible = s > 0.002;
  });
}
