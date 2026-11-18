// Videocassete Betacam SP profissional (modelado a partir da foto do Sony PVW-2800).
// Origem: centro da base, frente da unidade de cima em z = 0. Unidade: 1 = 10 cm.
// Coordenadas de "face" (fx, fy): a partir do canto superior esquerdo da frente, fy para baixo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, rrect, clamp } from './util.js';
import { texPontilhado, texSerrilhado, sombraContato } from './texturas.js';
import { canvasSelo } from './fita.js';
import { comEnv } from './motor.js';

export const DK = { W: 4.27, HS: 1.03, HI: 0.83, H: 1.86, D: 4.6 };
const PXU = 960; // pixels por unidade nas texturas da frente
const fx2X = (fx) => fx - DK.W / 2;
const fy2Y = (fy) => DK.H - fy;

const FONTE = '"Rajdhani"';
const COR_TXT = '#cfcfc6';

function txt(x, s, X, Y, tam, o = {}) {
  x.save();
  x.font = `${o.peso ?? 600} ${tam}px ${o.fonte ?? FONTE}`;
  x.fillStyle = o.cor ?? COR_TXT;
  x.textAlign = o.al ?? 'center';
  x.textBaseline = 'middle';
  if (o.esp) x.letterSpacing = `${o.esp}px`;
  x.fillText(s, X, Y);
  x.restore();
}

function texFace(cv, x0, x1, y0, y1) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // UV da ShapeGeometry = (X, Y) local
  t.repeat.set(1 / (x1 - x0), 1 / (y1 - y0));
  t.offset.set(-x0 / (x1 - x0), -y0 / (y1 - y0));
  return t;
}

// ------------------------------------------------------------------ pintura da frente (unidade de cima)
function pinturaSuperior() {
  const Wc = Math.round(DK.W * PXU), Hc = Math.round(DK.HS * PXU);
  const cv = canvas(Wc, Hc), x = cv.getContext('2d');
  const P = (v) => v * PXU;
  const g = x.createLinearGradient(0, 0, 0, Hc);
  g.addColorStop(0, '#3e3d3a'); g.addColorStop(1, '#383734');
  x.fillStyle = g;
  x.fillRect(0, 0, Wc, Hc);
  // logotipo
  txt(x, 'SONY', P(0.21), P(0.158), P(0.085), { fonte: '"DejaVu Serif", "Liberation Serif", serif', peso: 700, cor: '#e8e6e0', esp: P(0.012) });
  // bloco do POWER
  x.fillStyle = '#1b1b1b';
  rrect('fill', x, P(0.11), P(0.25), P(0.28), P(0.34), P(0.015));
  txt(x, 'POWER', P(0.25), P(0.285), P(0.04), { peso: 700, cor: '#e8e8e0' });
  txt(x, 'ON', P(0.17), P(0.35), P(0.026));
  txt(x, 'OFF', P(0.17), P(0.555), P(0.026));
  // molduras dos VU
  for (const [a, b] of [[0.49, 0.88], [0.91, 1.29], [2.89, 3.24]]) {
    const y0 = a > 2 ? 0.77 : 0.33, y1 = a > 2 ? 0.91 : 0.54;
    x.fillStyle = '#121212';
    x.fillRect(P(a - 0.012), P(y0 - 0.012), P(b - a + 0.024), P(y1 - y0 + 0.024));
  }
  // linhas de agrupamento (área de baixo)
  x.strokeStyle = '#2a2927';
  x.lineWidth = P(0.008);
  x.beginPath(); x.moveTo(0, P(0.64)); x.lineTo(P(1.3), P(0.64)); x.stroke();
  for (const vx of [1.49, 2.49, 3.68]) { x.beginPath(); x.moveTo(P(vx), P(0.74)); x.lineTo(P(vx), P(1.01)); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,0.05)';
  x.lineWidth = P(0.003);
  x.beginPath(); x.moveTo(0, P(0.645)); x.lineTo(P(1.3), P(0.645)); x.stroke();
  // áudio
  txt(x, 'HEADPHONES', P(0.25), P(0.695), P(0.03));
  txt(x, 'CH-1', P(0.705), P(0.668), P(0.032));
  txt(x, 'CH-2', P(1.12), P(0.668), P(0.032));
  x.strokeStyle = COR_TXT; x.lineWidth = P(0.004);
  for (const [px, l] of [[0.6, 'REC'], [0.81, 'PB'], [1.02, 'REC'], [1.22, 'PB']]) txt(x, l, P(px), P(0.9), P(0.028));
  txt(x, 'PULL FOR VARIABLE', P(0.91), P(0.948), P(0.022));
  x.beginPath(); x.moveTo(P(0.6), P(0.93)); x.lineTo(P(0.6), P(0.948)); x.lineTo(P(0.74), P(0.948)); x.moveTo(P(1.08), P(0.948)); x.lineTo(P(1.22), P(0.948)); x.lineTo(P(1.22), P(0.93)); x.stroke();
  // monitor / limiter
  txt(x, 'MONITOR', P(1.7), P(0.718), P(0.034), { peso: 700 });
  txt(x, 'CH-1', P(1.56), P(0.765), P(0.024));
  txt(x, 'MIX', P(1.56), P(0.84), P(0.024));
  txt(x, 'CH-2', P(1.56), P(0.915), P(0.024));
  txt(x, 'LIMITER', P(2.19), P(0.722), P(0.034), { peso: 700 });
  txt(x, 'ON', P(2.08), P(0.82), P(0.024));
  txt(x, 'OFF', P(2.08), P(0.9), P(0.024));
  txt(x, 'AUDIO', P(1.95), P(0.958), P(0.03), { peso: 700 });
  x.beginPath(); x.moveTo(P(1.69), P(0.93)); x.lineTo(P(1.69), P(0.958)); x.lineTo(P(1.86), P(0.958)); x.moveTo(P(2.04), P(0.958)); x.lineTo(P(2.18), P(0.958)); x.lineTo(P(2.18), P(0.93)); x.stroke();
  // entrada / vídeo
  txt(x, 'INPUT SELECT', P(2.8), P(0.722), P(0.034), { peso: 700 });
  txt(x, 'Y,R-Y,B-Y', P(2.62), P(0.79), P(0.022));
  txt(x, 'COMPOSITE', P(2.62), P(0.855), P(0.022));
  txt(x, 'S-VIDEO', P(2.62), P(0.92), P(0.022));
  txt(x, 'VIDEO/RF', P(3.07), P(0.722), P(0.034), { peso: 700 });
  txt(x, 'PULL FOR VARIABLE', P(3.15), P(0.975), P(0.022));
  txt(x, 'VIDEO', P(3.37), P(0.725), P(0.032), { peso: 700 });
  txt(x, 'TRACKING', P(3.57), P(0.725), P(0.032), { peso: 700 });
  txt(x, 'LEVEL', P(3.37), P(0.805), P(0.024));
  txt(x, 'FIXED', P(3.57), P(0.805), P(0.024));
  txt(x, 'REMOTE', P(3.82), P(0.865), P(0.024));
  txt(x, 'LOCAL', P(3.82), P(0.945), P(0.024));
  // contornos das chaves
  x.fillStyle = '#151515';
  for (const [cx, cy, w, h] of [[1.68, 0.84, 0.075, 0.2], [2.17, 0.86, 0.075, 0.15], [2.78, 0.855, 0.075, 0.2], [3.93, 0.9, 0.08, 0.13], [0.25, 0.79, 0.07, 0.07]]) {
    rrect('fill', x, P(cx - w / 2), P(cy - h / 2), P(w), P(h), P(0.008));
  }
  // parafusos de canto
  for (const [a, b] of [[0.05, 0.05], [4.22, 0.05]]) {
    x.fillStyle = '#222'; x.beginPath(); x.arc(P(a), P(b), P(0.012), 0, 7); x.fill();
  }
  return cv;
}

// ------------------------------------------------------------------ pintura do painel de baixo (controle)
function pinturaInferior() {
  const x0 = 0.14, x1 = 4.13;
  const Wc = Math.round((x1 - x0) * PXU), Hc = Math.round(DK.HI * PXU);
  const cv = canvas(Wc, Hc), x = cv.getContext('2d');
  const P = (v) => v * PXU;
  const X = (fx) => P(fx - x0), Y = (fy) => P(fy - DK.HS);
  x.fillStyle = '#44443f';
  x.fillRect(0, 0, Wc, Hc);
  // painéis escuros
  x.fillStyle = '#212121';
  rrect('fill', x, X(1.63), Y(1.09), P(1.07), P(0.23), P(0.01));
  rrect('fill', x, X(1.63), Y(1.335), P(1.08), P(0.51), P(0.01));
  rrect('fill', x, X(2.87), Y(1.095), P(1.06), P(0.225), P(0.012));
  // grupo do meio-esquerdo
  x.strokeStyle = '#4c6fa8'; x.lineWidth = P(0.005);
  rrect('stroke', x, X(1.19), Y(1.09), P(0.32), P(0.15), P(0.01));
  x.strokeStyle = COR_TXT; x.lineWidth = P(0.004);
  rrect('stroke', x, X(1.19), Y(1.27), P(0.32), P(0.24), P(0.01));
  rrect('stroke', x, X(1.19), Y(1.53), P(0.32), P(0.27), P(0.01));
  // textos (esquerda)
  const T = (s, fx, fy, tam = 0.026, o) => txt(x, s, X(fx), Y(fy), P(tam), o);
  T('ASSEMBLE', 0.41, 1.105, 0.026, { peso: 700 });
  T('INSERT', 0.82, 1.075, 0.026, { peso: 700 });
  x.beginPath(); x.moveTo(X(0.55), Y(1.088)); x.lineTo(X(0.55), Y(1.075)); x.lineTo(X(0.75), Y(1.075)); x.moveTo(X(0.9), Y(1.075)); x.lineTo(X(1.1), Y(1.075)); x.lineTo(X(1.1), Y(1.088)); x.stroke();
  T('VIDEO', 0.59, 1.11, 0.02); T('CH-1', 0.74, 1.125, 0.02); T('CH-2', 0.89, 1.125, 0.02); T('TIME CODE', 1.06, 1.11, 0.02);
  T('A-AUDIO', 0.815, 1.1, 0.018);
  T('SYNC EDIT', 0.41, 1.405, 0.024, { peso: 700 }); T('MEMORY', 0.66, 1.47, 0.02); T('DELETE', 1.05, 1.405, 0.024, { peso: 700 });
  T('PREVIEW', 0.48, 1.605, 0.024, { peso: 700 }); T('AUTO EDIT', 0.79, 1.605, 0.024, { peso: 700 }); T('REVIEW', 1.07, 1.605, 0.024, { peso: 700 });
  T('AUDIO', 1.35, 1.29, 0.022, { peso: 700 }); T('IN', 1.28, 1.315, 0.018); T('OUT', 1.42, 1.315, 0.018);
  T('ENTRY', 1.35, 1.513, 0.022, { peso: 700 }); T('IN', 1.28, 1.635, 0.018); T('OUT', 1.42, 1.635, 0.018);
  // centro
  T('PB', 1.86, 1.19, 0.022); T('PB/EE', 1.84, 1.255, 0.022);
  T('SYSTEM', 2.16, 1.11, 0.016); T('SET UP', 2.16, 1.13, 0.016); T('TIME CODE', 2.34, 1.11, 0.016); T('PRESET', 2.34, 1.13, 0.016);
  T('MENU', 2.08, 1.19, 0.022); T('SET', 2.24, 1.19, 0.022); T('HOLD', 2.4, 1.19, 0.022);
  T('CTL', 2.76, 1.115, 0.02); T('TC', 2.765, 1.19, 0.02); T('U-BIT', 2.75, 1.265, 0.02);
  T('STANDBY', 1.8, 1.4, 0.026, { peso: 700 }); T('PREROLL', 2.0, 1.4, 0.026, { peso: 700 }); T('REC', 2.2, 1.4, 0.026, { peso: 700 }); T('EDIT', 2.4, 1.4, 0.026, { peso: 700 });
  T('REC INHIBIT', 2.2, 1.355, 0.016); T('SERVO', 2.2, 1.565, 0.016);
  T('EJECT', 1.8, 1.65, 0.026, { peso: 700 }); T('REW', 2.0, 1.65, 0.026, { peso: 700 }); T('PLAY', 2.2, 1.65, 0.026, { peso: 700 }); T('F FWD', 2.4, 1.65, 0.026, { peso: 700 }); T('STOP', 2.59, 1.65, 0.026, { peso: 700 });
  // contador
  T('HOURS', 3.06, 1.29, 0.02, { cor: '#e0e0e0' }); T('MINUTES', 3.28, 1.29, 0.02, { cor: '#e0e0e0' }); T('SECONDS', 3.5, 1.29, 0.02, { cor: '#e0e0e0' }); T('FRAMES', 3.72, 1.29, 0.02, { cor: '#e0e0e0' });
  T('RESET', 3.85, 1.165, 0.018, { cor: '#e0e0e0' });
  // direita
  T('PLAYER', 2.84, 1.375, 0.022); T('RECORDER', 3.03, 1.375, 0.022);
  T('SHUTTLE', 2.86, 1.575, 0.018); T('JOG', 3.07, 1.575, 0.018);
  T('SEARCH', 2.81, 1.65, 0.026, { peso: 700 }); T('VARIABLE', 3.0, 1.65, 0.026, { peso: 700 });
  T('REVERSE', 3.33, 1.385, 0.024, { peso: 700 }); T('FORWARD', 3.74, 1.385, 0.024, { peso: 700 });
  T('◀', 3.47, 1.385, 0.02); T('▶', 3.59, 1.385, 0.02);
  // anel de marcas em volta do jog
  x.strokeStyle = '#2a2a28'; x.lineWidth = P(0.01);
  x.beginPath(); x.arc(X(3.46), Y(1.67), P(0.3), 0, 7); x.stroke();
  return { cv, x0, x1 };
}

// ------------------------------------------------------------------ texturas especiais
function canvasVU(tipo = 'VU') {
  const w = 512, h = 300, c = canvas(w, h), x = c.getContext('2d');
  const g = x.createRadialGradient(w / 2, h * 1.1, 20, w / 2, h * 0.6, w * 0.75);
  g.addColorStop(0, '#fff2c0'); g.addColorStop(0.6, '#f2d27a'); g.addColorStop(1, '#b8913e');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 1.02, R = h * 0.78;
  x.strokeStyle = '#2b2214'; x.fillStyle = '#2b2214';
  x.lineWidth = 3;
  x.beginPath(); x.arc(cx, cy, R, -Math.PI * 0.77, -Math.PI * 0.23); x.stroke();
  x.strokeStyle = '#c42a1c'; x.lineWidth = 9;
  x.beginPath(); x.arc(cx, cy, R + 6, -Math.PI * 0.32, -Math.PI * 0.23); x.stroke();
  const marcas = tipo === 'VU' ? ['-20', '10', '7', '5', '3', '0', '+3'] : ['', '', '', '', '', '', ''];
  marcas.forEach((m, i) => {
    const a = -Math.PI * 0.77 + (i / (marcas.length - 1)) * Math.PI * 0.54;
    x.strokeStyle = i >= 5 ? '#c42a1c' : '#2b2214';
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4)); x.lineTo(cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22)); x.stroke();
    x.font = '600 26px "Rajdhani"';
    x.textAlign = 'center';
    x.fillStyle = i >= 5 ? '#c42a1c' : '#2b2214';
    x.fillText(m, cx + Math.cos(a) * (R + 44), cy + Math.sin(a) * (R + 44) + 8);
  });
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI * 0.77 + (i / 24) * Math.PI * 0.54;
    x.strokeStyle = '#2b2214'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.lineTo(cx + Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10)); x.stroke();
  }
  x.font = '700 44px "Rajdhani"';
  x.fillStyle = '#2b2214';
  x.textAlign = 'center';
  x.fillText(tipo, cx, h * 0.72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// display de 7 segmentos
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
function seg7(x, ch, X, Y, w, h, aceso, apagado) {
  const t = w * 0.17, sk = 0.12;
  const S = {
    a: [[t, 0], [w - t, 0], [w - t * 1.5, t], [t * 1.5, t]],
    d: [[t * 1.5, h - t], [w - t * 1.5, h - t], [w - t, h], [t, h]],
    g: [[t, h / 2], [t * 1.5, h / 2 - t / 2], [w - t * 1.5, h / 2 - t / 2], [w - t, h / 2], [w - t * 1.5, h / 2 + t / 2], [t * 1.5, h / 2 + t / 2]],
    f: [[0, t], [t, t * 1.5], [t, h / 2 - t], [0, h / 2 - t / 2]],
    b: [[w, t], [w, h / 2 - t / 2], [w - t, h / 2 - t], [w - t, t * 1.5]],
    e: [[0, h / 2 + t / 2], [t, h / 2 + t], [t, h - t * 1.5], [0, h - t]],
    c: [[w, h / 2 + t / 2], [w, h - t], [w - t, h - t * 1.5], [w - t, h / 2 + t]],
  };
  const on = SEG[ch] ?? '';
  for (const k of 'abcdefg') {
    x.fillStyle = on.includes(k) ? aceso : apagado;
    x.beginPath();
    S[k].forEach(([px, py], i) => { const xx = X + px + (h - py) * sk, yy = Y + py; i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); });
    x.closePath();
    x.fill();
  }
}

// ------------------------------------------------------------------ construção
const M = {};
function mats() {
  if (M.pintura) return M;
  const p = texPontilhado(9, 10);
  M.pintura = new THREE.MeshStandardMaterial({ color: '#3a3936', roughness: 0.55, metalness: 0.12, normalMap: p.normal, normalScale: new THREE.Vector2(0.25, 0.25) });
  M.pinturaEsc = new THREE.MeshStandardMaterial({ color: '#2b2a28', roughness: 0.55, metalness: 0.12, normalMap: p.normal, normalScale: new THREE.Vector2(0.25, 0.25) });
  M.plasticoPreto = new THREE.MeshPhysicalMaterial({ color: '#0f0f10', roughness: 0.42, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3 });
  M.bege = new THREE.MeshPhysicalMaterial({ color: '#d9d0b0', roughness: 0.45, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.35 });
  M.vermelho = new THREE.MeshPhysicalMaterial({ color: '#b3201f', roughness: 0.4, clearcoat: 0.3 });
  M.azul = new THREE.MeshPhysicalMaterial({ color: '#2a6f9b', roughness: 0.4, clearcoat: 0.3 });
  M.escuro = new THREE.MeshPhysicalMaterial({ color: '#1e1e1e', roughness: 0.5, clearcoat: 0.2 });
  M.cromo = new THREE.MeshStandardMaterial({ color: '#d7dade', metalness: 1, roughness: 0.18 });
  M.niquel = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.28 });
  M.ouro = new THREE.MeshStandardMaterial({ color: '#e1b45a', metalness: 1, roughness: 0.25 });
  M.vidro = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, envMapIntensity: 2.5, depthWrite: false });
  M.borracha = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.85 });
  const serr = texSerrilhado(70);
  serr.repeat.set(1, 1);
  M.knurl = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5, metalness: 0.1, normalMap: serr, normalScale: new THREE.Vector2(1.2, 1.2) });
  for (const k of ['plasticoPreto', 'bege', 'vermelho', 'azul', 'escuro', 'cromo', 'niquel', 'ouro', 'vidro', 'knurl']) comEnv(M[k], M[k].envMapIntensity ?? 1);
  M.vidro.envMapIntensity = 2.5;
  return M;
}

function retanguloComFuro(x0, x1, y0, y1, furos) {
  const s = new THREE.Shape();
  s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath();
  for (const [a, b, c, d] of furos) {
    const h = new THREE.Path();
    h.moveTo(a, c); h.lineTo(a, d); h.lineTo(b, d); h.lineTo(b, c); h.closePath();
    s.holes.push(h);
  }
  return s;
}

function botao(w, h, mat, prof = 0.05) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, prof, 3, Math.min(w, h) * 0.12), mat);
  m.position.z = prof / 2;
  m.castShadow = true;
  g.add(m);
  // poço escuro em volta
  const poco = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.25, h * 1.25), new THREE.MeshBasicMaterial({ color: '#0a0a0a' }));
  poco.position.z = 0.001;
  g.add(poco);
  g.userData.cap = m;
  return g;
}

function simbolo(ch, cor = '#111') {
  const c = canvas(128, 128), x = c.getContext('2d');
  x.fillStyle = cor;
  x.font = '700 64px "DejaVu Sans", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(ch, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function knob(r, h, anel) {
  const mt = mats();
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, h, 48, 1), [mt.knurl, mt.plasticoPreto, mt.plasticoPreto]);
  corpo.rotation.x = Math.PI / 2;
  corpo.position.z = h / 2 + (anel ? 0.012 : 0);
  corpo.castShadow = true;
  g.add(corpo);
  // marcador
  const mk = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.6, 0.004), new THREE.MeshStandardMaterial({ color: '#ddd', roughness: 0.5 }));
  mk.position.set(0, r * 0.45, h + 0.003 + (anel ? 0.012 : 0));
  g.add(mk);
  if (anel) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.15, 0.012, 48), new THREE.MeshPhysicalMaterial({ color: anel, roughness: 0.35, clearcoat: 0.4 }));
    a.rotation.x = Math.PI / 2;
    a.position.z = 0.006;
    g.add(a);
  }
  return g;
}

function medidor(w, h, tipo) {
  const mt = mats();
  const g = new THREE.Group();
  const tex = canvasVU(tipo);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.7 }));
  face.position.z = -0.03;
  g.add(face);
  // paredes do poço
  const parede = new THREE.MeshStandardMaterial({ color: '#0c0c0c', roughness: 0.8 });
  for (const [px, py, sw, sh] of [[0, h / 2, w, 0.004], [0, -h / 2, w, 0.004], [-w / 2, 0, 0.004, h], [w / 2, 0, 0.004, h]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.032), parede);
    p.position.set(px, py, -0.015);
    g.add(p);
  }
  // ponteiro (pivô abaixo da face)
  const piv = new THREE.Group();
  piv.position.set(0, -h * 0.52, -0.02);
  const agulha = new THREE.Mesh(new THREE.BoxGeometry(0.0045, h * 0.86, 0.002), new THREE.MeshBasicMaterial({ color: '#1a1410' }));
  agulha.position.y = h * 0.43;
  piv.add(agulha);
  g.add(piv);
  const vidro = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mt.vidro);
  vidro.position.z = 0.002;
  g.add(vidro);
  g.userData = { face, piv };
  return g;
}

function chaveDeslizante(w, h, curso) {
  const g = new THREE.Group();
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.55, h * 0.95), new THREE.MeshBasicMaterial({ color: '#050505' }));
  fundo.position.z = 0.001;
  g.add(fundo);
  const alav = new THREE.Mesh(new RoundedBoxGeometry(w * 0.5, w * 0.62, 0.035, 2, 0.006), comEnv(new THREE.MeshPhysicalMaterial({ color: '#0d0d0d', roughness: 0.35, clearcoat: 0.4 })));
  alav.position.z = 0.018;
  alav.castShadow = true;
  const ponta = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.008, 0.002), new THREE.MeshBasicMaterial({ color: '#e8e8e8' }));
  ponta.position.set(0, -w * 0.2, 0.0362);
  alav.add(ponta);
  g.add(alav);
  g.userData = { alav, curso };
  return g;
}

function led(cor, r = 0.012) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2a1010', emissive: cor, emissiveIntensity: 0, roughness: 0.2 }));
  m.rotation.x = Math.PI / 2;
  m.userData.cor = cor;
  return m;
}

/**
 * Cria o videocassete. API retornada em `dk`.
 */
export function criarDeck() {
  const mt = mats();
  const g = new THREE.Group();
  g.name = 'deck';
  const { W, H, HS, HI, D } = DK;
  const pos = (fx, fy, z = 0) => new THREE.Vector3(fx2X(fx), fy2Y(fy), z);

  // ---------------- carcaça
  const base = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.04, D), mt.pinturaEsc);
  base.position.set(0, 0.02, -D / 2);
  base.receiveShadow = true;
  g.add(base);
  const pes = [];
  for (const sx of [-1, 1]) for (const sz of [-0.3, -D + 0.3]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.05, 24), mt.borracha);
    p.position.set(sx * (W / 2 - 0.35), -0.02, sz);
    g.add(p);
    pes.push(p);
  }
  // tampa de cima + laterais (removível)
  const tampaSup = new THREE.Group();
  const topoTex = canvasTopo();
  const matTopo = mt.pintura.clone();
  matTopo.map = topoTex;
  matTopo.color.set('#ffffff');
  const topo = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, D - 0.04), [mt.pintura, mt.pintura, matTopo, mt.pintura, mt.pintura, mt.pintura]);
  topo.position.set(0, H - 0.015, -D / 2 - 0.02);
  topo.castShadow = true;
  topo.receiveShadow = true;
  tampaSup.add(topo);
  for (const sx of [-1, 1]) {
    const lado = new THREE.Mesh(new THREE.BoxGeometry(0.03, H - 0.04, D - 0.04), mt.pintura);
    lado.position.set(sx * (W / 2 - 0.015), H / 2, -D / 2 - 0.02);
    lado.castShadow = true;
    lado.receiveShadow = true;
    tampaSup.add(lado);
  }
  g.add(tampaSup);
  // núcleo interno escuro (fica escondido; some quando a tampa abre)
  const nucleo = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, H - 0.1, D - 0.4), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }));
  nucleo.position.set(0, H / 2, -D / 2 - 0.15);
  g.add(nucleo);

  // ---------------- frente de cima (com furo do compartimento da fita)
  const sup = pinturaSuperior();
  const comp = { x0: fx2X(1.3), x1: fx2X(4.14), y0: fy2Y(0.71), y1: fy2Y(0.15) };
  const furoMed = (a, b, c, d) => [fx2X(a), fx2X(b), fy2Y(d), fy2Y(c)];
  const formaSup = retanguloComFuro(-W / 2, W / 2, fy2Y(HS), H, [[comp.x0, comp.x1, comp.y0, comp.y1], furoMed(0.49, 0.88, 0.33, 0.54), furoMed(0.91, 1.29, 0.33, 0.54), furoMed(2.89, 3.24, 0.77, 0.91)]);
  const matSup = new THREE.MeshStandardMaterial({ map: texFace(sup, -W / 2, W / 2, fy2Y(HS), H), roughness: 0.6, metalness: 0.1, normalMap: mt.pintura.normalMap, normalScale: new THREE.Vector2(0.2, 0.2) });
  const frenteSup = new THREE.Mesh(new THREE.ShapeGeometry(formaSup), matSup);
  frenteSup.receiveShadow = true;
  g.add(frenteSup);

  // compartimento: moldura preta saliente + abertura + portinhola
  const slot = { x0: fx2X(1.38), x1: fx2X(4.04), y0: fy2Y(0.6), y1: fy2Y(0.29) };
  const molduraForma = retanguloComFuro(comp.x0, comp.x1, comp.y0, comp.y1, [[slot.x0, slot.x1, slot.y0, slot.y1]]);
  const moldura = new THREE.Mesh(new THREE.ExtrudeGeometry(molduraForma, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }), [mt.plasticoPreto, mt.plasticoPreto]);
  moldura.position.z = -0.01;
  moldura.castShadow = true;
  g.add(moldura);
  // texto do compartimento
  const ct = canvas(2048, 128), cx = ct.getContext('2d');
  cx.clearRect(0, 0, 2048, 128);
  txt(cx, 'VIDEOCASSETTE RECORDER', 760, 66, 50, { peso: 600, cor: '#d8d8d2', esp: 4 });
  txt(cx, 'PVW-2800', 1320, 66, 50, { peso: 600, cor: '#d8d8d2', esp: 4 });
  const ctex = new THREE.CanvasTexture(ct);
  ctex.colorSpace = THREE.SRGBColorSpace;
  const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.125), new THREE.MeshBasicMaterial({ map: ctex, transparent: true, toneMapped: true }));
  rotulo.position.set(fx2X(2.55), fy2Y(0.232), 0.051);
  g.add(rotulo);
  // selo BETACAM SP do aparelho (prata + SP vermelho)
  const sc = canvas(760, 150), sx = sc.getContext('2d');
  sx.fillStyle = '#d9dadc'; sx.fillRect(0, 0, 760, 150);
  sx.fillStyle = '#111'; sx.fillRect(10, 10, 740, 130);
  sx.fillStyle = '#d9dadc'; sx.fillRect(16, 16, 728, 118);
  sx.fillStyle = '#c2242b'; sx.fillRect(520, 16, 224, 118);
  sx.font = 'italic 800 92px "Montserrat"'; sx.textBaseline = 'middle';
  sx.fillStyle = '#111'; sx.save(); sx.translate(40, 80); sx.transform(1, 0, -0.18, 1, 0, 0); sx.fillText('BETACAM', 0, 0); sx.restore();
  sx.fillStyle = '#fff'; sx.save(); sx.translate(560, 80); sx.transform(1, 0, -0.18, 1, 0, 0); sx.fillText('SP', 0, 0); sx.restore();
  const stex = new THREE.CanvasTexture(sc);
  stex.colorSpace = THREE.SRGBColorSpace;
  const selo = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.093), comEnv(new THREE.MeshStandardMaterial({ map: stex, metalness: 0.5, roughness: 0.35 })));
  selo.position.set(fx2X(3.735), fy2Y(0.238), 0.052);
  g.add(selo);
  // faixa de indicadores
  const ic = canvas(1024, 80), ix = ic.getContext('2d');
  ix.fillStyle = '#141414'; ix.fillRect(0, 0, 1024, 80);
  [['DOLBY NR', 150], ['LTC', 400], ['VITC', 570], ['AUTO OFF', 800]].forEach(([s, px]) => txt(ix, s, px, 42, 36, { peso: 600, cor: '#5d6064' }));
  const itex = new THREE.CanvasTexture(ic);
  itex.colorSpace = THREE.SRGBColorSpace;
  const indic = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.1), new THREE.MeshStandardMaterial({ map: itex, emissiveMap: itex, emissive: '#ffcf8a', emissiveIntensity: 0, roughness: 0.3 }));
  indic.position.set(fx2X(2.675), fy2Y(0.655), 0.051);
  g.add(indic);
  // túnel interno (escuro) atrás da abertura
  const tunel = new THREE.Mesh(new THREE.BoxGeometry(slot.x1 - slot.x0, slot.y1 - slot.y0, 1.9), new THREE.MeshStandardMaterial({ color: '#070707', roughness: 0.9, side: THREE.BackSide }));
  tunel.position.set((slot.x0 + slot.x1) / 2, (slot.y0 + slot.y1) / 2, -0.95);
  g.add(tunel);
  // portinhola (3 painéis) com dobradiça em cima, abre para dentro
  const porta = new THREE.Group();
  porta.position.set(0, slot.y1 - 0.005, -0.05);
  const pw = slot.x1 - slot.x0, ph = slot.y1 - slot.y0 - 0.01;
  [[0, 0.24], [0.24, 0.76], [0.76, 1]].forEach(([a, b], i) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(pw * (b - a) - 0.008, ph, 0.012), comEnv(new THREE.MeshPhysicalMaterial({ color: '#141415', roughness: 0.38, clearcoat: 0.35 })));
    p.position.set(slot.x0 + pw * (a + b) / 2, -ph / 2, 0);
    porta.add(p);
    if (i === 1) {
      const seta = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), new THREE.MeshBasicMaterial({ map: simbolo('⇨', '#3a3a3a'), transparent: true }));
      seta.position.set(slot.x0 + pw * 0.5, -ph * 0.45, 0.007);
      porta.add(seta);
    }
  });
  g.add(porta);

  // ---------------- painel de baixo
  const inf = pinturaInferior();
  const matInf = new THREE.MeshStandardMaterial({ map: texFace(inf.cv, fx2X(inf.x0), fx2X(inf.x1), 0, fy2Y(HS)), roughness: 0.58, metalness: 0.1, normalMap: mt.pintura.normalMap, normalScale: new THREE.Vector2(0.2, 0.2) });
  const formaInf = new THREE.Shape();
  formaInf.moveTo(fx2X(inf.x0), 0.0); formaInf.lineTo(fx2X(inf.x1), 0.0); formaInf.lineTo(fx2X(inf.x1), fy2Y(HS)); formaInf.lineTo(fx2X(inf.x0), fy2Y(HS)); formaInf.closePath();
  const frenteInf = new THREE.Mesh(new THREE.ShapeGeometry(formaInf), matInf);
  frenteInf.position.z = 0.035;
  frenteInf.receiveShadow = true;
  g.add(frenteInf);
  // borda/espessura do painel de baixo
  const bordaInf = new THREE.Mesh(new THREE.BoxGeometry(inf.x1 - inf.x0, HI, 0.06), mt.pinturaEsc);
  bordaInf.position.set(fx2X((inf.x0 + inf.x1) / 2), HI / 2, 0.004);
  g.add(bordaInf);
  // alças do rack
  for (const fxp of [0.17, 4.1]) {
    const al = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.42, 0.12, 2, 0.02), mt.pinturaEsc);
    al.position.copy(pos(fxp, 1.37, 0.08));
    al.castShadow = true;
    g.add(al);
  }
  // lateral escura do vão entre as unidades
  const friso = new THREE.Mesh(new THREE.BoxGeometry(W, 0.012, 0.04), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.7 }));
  friso.position.set(0, fy2Y(HS), 0.015);
  g.add(friso);

  // ---------------- controles da frente
  const zf = 0.0, zi = 0.035;
  const botoes = {};
  const addBotao = (nome, fx, fy, w, h, mat, z = zi, sim, corSim) => {
    const b = botao(w, h, mat);
    b.position.copy(pos(fx, fy, z));
    if (sim) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.7), new THREE.MeshBasicMaterial({ map: simbolo(sim, corSim), transparent: true }));
      s.position.z = 0.0505;
      b.userData.cap.add(s);
      s.position.set(0, 0, 0.0255);
    }
    g.add(b);
    botoes[nome] = b;
    return b;
  };
  const S = 0.1;
  // linha 1 e grupos da esquerda
  [['assemble', 0.41], ['ins_video', 0.59], ['ins_a1', 0.74], ['ins_a2', 0.89], ['ins_tc', 1.04]].forEach(([n, fxp]) => addBotao(n, fxp, 1.27, S, S, mt.bege));
  addBotao('sync_edit', 0.45, 1.48, S, S, mt.bege);
  addBotao('delete', 1.05, 1.48, S, S, mt.bege);
  addBotao('preview', 0.48, 1.69, S, S, mt.bege);
  addBotao('auto_edit', 0.79, 1.69, S * 1.05, S * 1.05, mt.vermelho);
  addBotao('review', 1.07, 1.69, S, S, mt.bege);
  addBotao('m1', 1.28, 1.17, 0.07, 0.08, mt.escuro);
  addBotao('m2', 1.42, 1.17, 0.07, 0.08, mt.escuro);
  addBotao('audio_in', 1.28, 1.44, 0.085, 0.085, mt.bege);
  addBotao('audio_out', 1.42, 1.44, 0.085, 0.085, mt.bege);
  addBotao('entry', 1.35, 1.555, 0.2, 0.06, mt.bege);
  addBotao('entry_in', 1.28, 1.7, 0.085, 0.085, mt.bege);
  addBotao('entry_out', 1.42, 1.7, 0.085, 0.085, mt.bege);
  addBotao('menu', 2.08, 1.265, 0.055, 0.085, mt.bege);
  addBotao('set', 2.24, 1.265, 0.055, 0.085, mt.bege);
  addBotao('hold', 2.4, 1.265, 0.055, 0.085, mt.bege);
  // transporte
  addBotao('standby', 1.8, 1.49, 0.105, 0.105, mt.bege);
  addBotao('preroll', 2.0, 1.49, 0.105, 0.105, mt.bege);
  addBotao('rec', 2.2, 1.49, 0.105, 0.105, mt.vermelho);
  addBotao('edit', 2.4, 1.49, 0.105, 0.105, mt.bege);
  addBotao('eject', 1.8, 1.725, 0.105, 0.105, mt.azul, zi, '⏏', '#0b1c2a');
  addBotao('rew', 2.0, 1.725, 0.105, 0.105, mt.bege, zi, '◀◀', '#151515');
  addBotao('play', 2.2, 1.725, 0.105, 0.105, mt.bege, zi, '▶', '#151515');
  addBotao('ffwd', 2.4, 1.725, 0.105, 0.105, mt.bege, zi, '▶▶', '#151515');
  addBotao('stop', 2.59, 1.725, 0.105, 0.105, mt.azul, zi, '■', '#0b1c2a');
  addBotao('player', 2.84, 1.47, 0.07, 0.09, mt.escuro);
  addBotao('recorder', 3.02, 1.47, 0.07, 0.09, mt.escuro);
  addBotao('search', 2.81, 1.725, 0.105, 0.105, mt.bege);
  addBotao('variable', 2.99, 1.725, 0.105, 0.105, mt.bege);
  addBotao('reset', 3.85, 1.225, 0.06, 0.06, mt.escuro);

  // LEDs
  const leds = {};
  const addLed = (nome, fx, fy, cor, z = zi) => { const l = led(cor); l.position.copy(pos(fx, fy, z + 0.002)); g.add(l); leds[nome] = l; };
  addLed('rec', 2.2, 1.49, '#ff3020', zi + 0.052);
  addLed('rec_inhibit', 2.2, 1.375, '#ff9a2a');
  addLed('servo', 2.2, 1.585, '#ffbb33');
  addLed('jog', 3.0, 1.545, '#ff2a1a');
  addLed('shuttle', 2.92, 1.545, '#ff2a1a');
  addLed('dir', 3.53, 1.385, '#ff2a1a');
  [0.41, 0.59, 0.74, 0.89, 1.04].forEach((fxp, i) => addLed('l' + i, fxp, 1.2, '#ff7a1a'));
  addLed('power', 0.17, 0.4, '#ff3a2a', zf);

  // contador LED
  const contCv = canvas(1024, 160), contX = contCv.getContext('2d');
  const contTex = new THREE.CanvasTexture(contCv);
  contTex.colorSpace = THREE.SRGBColorSpace;
  const contMat = new THREE.MeshBasicMaterial({ map: contTex, toneMapped: false, color: new THREE.Color(1, 1, 1) });
  const cont = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.14), contMat);
  cont.position.copy(pos(3.385, 1.19, zi + 0.002));
  g.add(cont);
  const contVidro = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.2), comEnv(new THREE.MeshPhysicalMaterial({ color: '#3a0606', roughness: 0.05, transparent: true, opacity: 0.25, clearcoat: 1, depthWrite: false }), 2));
  contVidro.position.copy(pos(3.385, 1.2, zi + 0.012));
  g.add(contVidro);
  let contAtual = '', contBrilho = -1;
  function desenhaContador(s, brilho) {
    contX.fillStyle = '#100404';
    contX.fillRect(0, 0, 1024, 160);
    const aceso = `rgba(255,${40 + 20 * brilho},${30 + 10 * brilho},${0.15 + 0.85 * brilho})`;
    const apagado = 'rgba(70,10,8,0.35)';
    let px = 30;
    for (const ch of s) {
      if (ch === ':') {
        contX.fillStyle = brilho > 0.05 ? aceso : apagado;
        contX.fillRect(px + 10, 52, 12, 12); contX.fillRect(px + 4, 104, 12, 12);
        px += 30;
      } else { seg7(contX, ch, px, 22, 72, 116, aceso, apagado); px += 98; }
    }
    contTex.needsUpdate = true;
  }

  // medidores
  const vu1 = medidor(0.39, 0.21, 'VU'), vu2 = medidor(0.38, 0.21, 'VU'), vrf = medidor(0.35, 0.14, 'VIDEO');
  vu1.position.copy(pos(0.685, 0.435, zf));
  vu2.position.copy(pos(1.1, 0.435, zf));
  vrf.position.copy(pos(3.065, 0.84, zf));
  g.add(vu1, vu2, vrf);

  // botões giratórios
  const knobs = {};
  [['hp', 0.4, null], ['ch1_rec', 0.6, '#9e1a1a'], ['ch1_pb', 0.81, null], ['ch2_rec', 1.02, '#9e1a1a'], ['ch2_pb', 1.22, null]].forEach(([n, fxp, anel]) => {
    const k = knob(0.045, 0.06, anel);
    k.position.copy(pos(fxp, 0.795, zf));
    g.add(k);
    knobs[n] = k;
  });
  [['vlevel', 3.37], ['tracking', 3.57]].forEach(([n, fxp]) => {
    const k = knob(0.042, 0.055, null);
    k.position.copy(pos(fxp, 0.9, zf));
    g.add(k);
    knobs[n] = k;
  });
  // fone de ouvido
  const jack = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 12, 32), mt.niquel);
  jack.position.copy(pos(0.25, 0.79, zf + 0.005));
  g.add(jack);

  // chaves
  const chaves = {};
  const addChave = (n, fx, fy, w, h, curso) => { const c = chaveDeslizante(w, h, curso); c.position.copy(pos(fx, fy, zf)); g.add(c); chaves[n] = c; };
  addChave('monitor', 1.68, 0.84, 0.075, 0.2, 0.075);
  addChave('limiter', 2.17, 0.86, 0.075, 0.15, 0.04);
  addChave('input', 2.78, 0.855, 0.075, 0.2, 0.065);
  addChave('remote', 3.93, 0.9, 0.08, 0.13, 0.035);
  addChave('pbee', 1.99, 1.24, 0.06, 0.12, 0.03);
  chaves.pbee.position.z = zi;
  addChave('ctl', 2.83, 1.2, 0.06, 0.16, 0.05);
  chaves.ctl.position.z = zi;

  // POWER (gangorra)
  const power = new THREE.Group();
  power.position.copy(pos(0.25, 0.44, zf + 0.01));
  const pBody = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.2, 0.06, 3, 0.012), comEnv(new THREE.MeshPhysicalMaterial({ color: '#111', roughness: 0.3, clearcoat: 0.5 })));
  pBody.position.z = 0.02;
  pBody.castShadow = true;
  power.add(pBody);
  const pFundo = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.24), new THREE.MeshBasicMaterial({ color: '#030303' }));
  pFundo.position.z = -0.009;
  power.add(pFundo);
  g.add(power);

  // disco do jog/shuttle
  const jog = new THREE.Group();
  jog.position.copy(pos(3.46, 1.67, zi));
  const anelExt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.11, 96, 1), [mt.knurl, mt.plasticoPreto, mt.plasticoPreto]);
  anelExt.rotation.x = Math.PI / 2;
  anelExt.position.z = 0.055;
  anelExt.castShadow = true;
  jog.add(anelExt);
  const disco = new THREE.Group();
  const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 72), [mt.plasticoPreto, new THREE.MeshPhysicalMaterial({ color: '#121212', roughness: 0.25, clearcoat: 0.6 }), mt.plasticoPreto]);
  centro.rotation.x = Math.PI / 2;
  centro.position.z = 0.13;
  disco.add(centro);
  const dedo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.012, 32), new THREE.MeshPhysicalMaterial({ color: '#0a0a0a', roughness: 0.6 }));
  dedo.rotation.x = Math.PI / 2;
  dedo.position.set(0, 0.12, 0.163);
  disco.add(dedo);
  jog.add(disco);
  g.add(jog);

  // ---------------- traseira
  const traseira = criarTraseira();
  g.add(traseira.grupo);

  // sombra de contato
  const sombra = sombraContato(W * 1.3, D * 1.15, 0.85);
  sombra.position.set(0, 0.001, -D / 2);
  g.add(sombra);

  // interior (preenchido pelo módulo do mecanismo)
  const interno = new THREE.Group();
  interno.visible = false;
  g.add(interno);

  const dk = {
    grupo: g, botoes, leds, knobs, chaves, power, jog, disco, porta, tampaSup, nucleo, traseira, interno, vu: [vu1, vu2, vrf], indic,
    slot: { x: (slot.x0 + slot.x1) / 2, y: (slot.y0 + slot.y1) / 2, z: 0, w: slot.x1 - slot.x0, h: slot.y1 - slot.y0 },
    pos,
    /** aperta um botão (p = 0..1) */
    apertar(nome, p) { const b = botoes[nome]; if (b) b.userData.cap.position.z = 0.025 - 0.02 * clamp(p); },
    setLed(nome, v) { const l = leds[nome]; if (l) { l.material.emissiveIntensity = v * 6; l.material.color.set(v > 0.05 ? l.userData.cor : '#2a1010'); } },
    setPower(v) {
      power.rotation.x = (v - 0.5) * 0.5;
      dk.ligado = v;
    },
    /** iluminação do painel (0..1) */
    setLuz(v) {
      for (const m of [vu1, vu2, vrf]) m.userData.face.material.emissiveIntensity = v * 0.9;
      indic.material.emissiveIntensity = 0;
      dk.setLed('power', v);
      if (Math.abs(contBrilho - v) > 0.01) { contBrilho = v; contAtual = ''; }
      dk.luz = v;
    },
    setVU(a, b, c = 0.5) {
      vu1.userData.piv.rotation.z = (0.5 - clamp(a)) * 1.6;
      vu2.userData.piv.rotation.z = (0.5 - clamp(b)) * 1.6;
      vrf.userData.piv.rotation.z = (0.5 - clamp(c)) * 1.6;
    },
    setContador(s) {
      const b = dk.luz ?? 0;
      if (s !== contAtual || Math.abs(contBrilho - b) > 0.01) { contAtual = s; contBrilho = b; desenhaContador(s, b); }
    },
    setIndicador(v) { indic.material.emissiveIntensity = v * 0.7; },
    setJog(a) { disco.rotation.z = -a; anelExt.rotation.y = -a * 0.15; },
    setChave(nome, v) { const c = chaves[nome]; if (c) c.userData.alav.position.y = (0.5 - v) * 2 * c.userData.curso; },
    /** porta do compartimento: 0 fechada, 1 aberta (para dentro) */
    setPorta(v) { porta.rotation.x = v * 1.35; },
    setTampaSup(v) { tampaSup.position.y = v * 2.6; tampaSup.position.z = -v * 0.6; tampaSup.rotation.x = -v * 0.12; tampaSup.visible = v < 0.999; nucleo.visible = v < 0.02 && !dk.verInterno; tunel.visible = nucleo.visible; interno.visible = v > 0.0 || !!dk.verInterno; },
    padrao() {
      dk.verInterno = false;
      for (const n in botoes) dk.apertar(n, 0);
      for (const n in leds) dk.setLed(n, 0);
      dk.setPower(0);
      dk.setLuz(0);
      dk.setVU(0, 0, 0);
      dk.setJog(0);
      dk.setPorta(0);
      dk.setTampaSup(0);
      dk.setChave('monitor', 0.5); dk.setChave('limiter', 1); dk.setChave('input', 0); dk.setChave('remote', 1); dk.setChave('pbee', 0); dk.setChave('ctl', 0.5);
      for (const k in knobs) knobs[k].rotation.z = 0;
      dk.setContador('00:00:00:00');
      traseira.padrao();
      g.visible = true;
    },
  };
  dk.padrao();
  return dk;
}

// tampa de cima: grades de ventilação e parafuso
function canvasTopo() {
  const { W, D } = DK;
  const k = 400, cv = canvas(Math.round(W * k), Math.round(D * k)), x = cv.getContext('2d');
  x.fillStyle = '#3c3b38';
  x.fillRect(0, 0, cv.width, cv.height);
  const grade = (x0, z0, w, d, passo = 0.035) => {
    x.fillStyle = '#0b0b0b';
    for (let zz = z0; zz < z0 + d; zz += passo) for (let xx = x0; xx < x0 + w; xx += passo) {
      x.beginPath(); x.arc(xx * k, zz * k, 0.009 * k, 0, 7); x.fill();
    }
  };
  // BoxGeometry: a face de cima tem v = 0 na frente? (topo: u ao longo de X, v ao longo de -Z)
  grade(0.55, D - 1.25, 1.1, 0.42);
  grade(2.6, 0.35, 0.75, 0.5);
  x.fillStyle = '#1d1d1d';
  x.beginPath(); x.arc(2.0 * k, (D - 0.55) * k, 0.05 * k, 0, 7); x.fill();
  x.fillStyle = '#6a6a66';
  x.beginPath(); x.arc(2.0 * k, (D - 0.55) * k, 0.03 * k, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------------ painel traseiro com conectores
function criarTraseira() {
  const mt = mats();
  const { W, H, D } = DK;
  const g = new THREE.Group();
  // coordenadas da traseira vista de trás: rx da esquerda (vista de trás), ry do topo
  const P = (rx, ry, dz = 0) => new THREE.Vector3(W / 2 - rx, H - ry, -D - dz);
  const k = 600, cv = canvas(Math.round(W * k), Math.round(H * k)), x = cv.getContext('2d');
  x.fillStyle = '#373633';
  x.fillRect(0, 0, cv.width, cv.height);
  const T = (s, rx, ry, tam = 0.04, o = {}) => txt(x, s, rx * k, ry * k, tam * k, o);
  x.strokeStyle = COR_TXT; x.lineWidth = 0.005 * k;
  const caixa = (a, b, c, d) => rrect('stroke', x, a * k, b * k, (c - a) * k, (d - b) * k, 0.02 * k);
  caixa(0.2, 0.08, 1.45, 0.52); T('VIDEO', 0.82, 0.12, 0.045, { peso: 700 });
  caixa(1.55, 0.08, 3.05, 0.52); T('COMPONENT', 2.3, 0.12, 0.045, { peso: 700 });
  caixa(0.2, 0.6, 2.05, 1.12); T('AUDIO', 1.12, 0.64, 0.045, { peso: 700 });
  caixa(2.15, 0.6, 3.25, 1.12); T('TIME CODE', 2.7, 0.64, 0.045, { peso: 700 });
  const conectores = {};
  const lab = (s, rx, ry) => T(s, rx, ry, 0.034);
  // BNCs
  [['video_in', 0.4, 'IN'], ['video_out1', 0.7, 'OUT 1'], ['video_out2', 1.0, 'OUT 2'], ['ref_in', 1.3, 'REF IN']].forEach(([n, rx, l]) => { lab(l, rx, 0.2); conectores[n] = { tipo: 'bnc', rx, ry: 0.36 }; });
  [['y_in', 1.75, 'Y'], ['ry_in', 1.95, 'R-Y'], ['by_in', 2.15, 'B-Y'], ['y_out', 2.45, 'Y'], ['ry_out', 2.65, 'R-Y'], ['by_out', 2.85, 'B-Y']].forEach(([n, rx, l]) => { lab(l, rx, 0.2); conectores[n] = { tipo: 'bnc', rx, ry: 0.36 }; });
  T('IN', 1.95, 0.48, 0.03); T('OUT', 2.65, 0.48, 0.03);
  // XLRs
  [['a_in1', 0.45, 'IN CH-1', 'f'], ['a_in2', 0.85, 'IN CH-2', 'f'], ['a_out1', 1.35, 'OUT CH-1', 'm'], ['a_out2', 1.75, 'OUT CH-2', 'm']].forEach(([n, rx, l, s]) => { lab(l, rx, 0.72); conectores[n] = { tipo: 'xlr' + s, rx, ry: 0.9 }; });
  [['tc_in', 2.45, 'IN', 'f'], ['tc_out', 2.95, 'OUT', 'm']].forEach(([n, rx, l, s]) => { lab(l, rx, 0.72); conectores[n] = { tipo: 'xlr' + s, rx, ry: 0.9 }; });
  // remoto, S-vídeo, energia
  lab('S-VIDEO IN', 3.45, 0.2); conectores.svideo = { tipo: 'din', rx: 3.45, ry: 0.36 };
  lab('REMOTE 9P', 0.75, 1.25); conectores.remote = { tipo: 'dsub', rx: 0.75, ry: 1.42 };
  lab('AC IN', 3.75, 1.25); conectores.ac = { tipo: 'iec', rx: 3.75, ry: 1.45 };
  T('~ 120V  60Hz', 3.75, 1.66, 0.028);
  // etiqueta de modelo
  x.fillStyle = '#c9c9c4';
  rrect('fill', x, 1.5 * k, 1.28 * k, 1.1 * k, 0.32 * k, 0.015 * k);
  T('SONY', 2.05, 1.34, 0.045, { cor: '#222', peso: 700 });
  T('VIDEOCASSETTE RECORDER', 2.05, 1.41, 0.03, { cor: '#222' });
  T('MODEL NO.  PVW-2800', 2.05, 1.47, 0.032, { cor: '#222', peso: 700 });
  T('BETACAM SP', 2.05, 1.54, 0.03, { cor: '#222' });
  // grade do ventilador
  x.fillStyle = '#0d0d0d';
  for (let a = 0; a < 6; a++) {
    x.beginPath(); x.arc(3.05 * k, 1.42 * k, (0.06 + a * 0.045) * k, 0, 7); x.lineWidth = 0.015 * k; x.strokeStyle = '#0d0d0d'; x.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const painel = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.1, normalMap: mt.pintura.normalMap, normalScale: new THREE.Vector2(0.2, 0.2) }));
  painel.rotation.y = Math.PI;
  painel.position.set(0, H / 2, -D);
  g.add(painel);

  // modelos 3D dos conectores (apontam para −Z)
  for (const [n, c] of Object.entries(conectores)) {
    const m = conector(c.tipo);
    m.position.copy(P(c.rx, c.ry));
    m.rotation.y = Math.PI;
    g.add(m);
    c.pos = P(c.rx, c.ry);
    c.mesh = m;
  }
  return { grupo: g, conectores, P, padrao() {} };
}

/** Conectores de painel (montados olhando para +Z local; a traseira gira 180°). */
export function conector(tipo) {
  const mt = mats();
  const g = new THREE.Group();
  if (tipo === 'bnc') {
    const porca = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.015, 6), mt.niquel);
    porca.rotation.x = Math.PI / 2; porca.position.z = 0.0075;
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 32, 1, true), mt.niquel);
    corpo.rotation.x = Math.PI / 2; corpo.position.z = 0.05;
    const isol = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.005, 24), new THREE.MeshStandardMaterial({ color: '#efeee8', roughness: 0.4 }));
    isol.rotation.x = Math.PI / 2; isol.position.z = 0.07;
    const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.01, 12), mt.ouro);
    pino.rotation.x = Math.PI / 2; pino.position.z = 0.075;
    g.add(porca, corpo, isol, pino);
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.014, 10), mt.niquel);
      b.rotation.z = Math.PI / 2; b.position.set(s * 0.036, 0, 0.07);
      g.add(b);
    }
  } else if (tipo.startsWith('xlr')) {
    const flange = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.22, 0.012, 2, 0.02), mt.niquel);
    flange.position.z = 0.006;
    const casca = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 40, 1, true), mt.niquel);
    casca.rotation.x = Math.PI / 2; casca.position.z = 0.025;
    const isol = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.01, 40), new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.6 }));
    isol.rotation.x = Math.PI / 2; isol.position.z = tipo === 'xlrf' ? 0.036 : 0.014;
    g.add(flange, casca, isol);
    const furos = [[-0.026, 0.012], [0.026, 0.012], [0, -0.028]];
    for (const [a, b] of furos) {
      if (tipo === 'xlrf') {
        const f = new THREE.Mesh(new THREE.CircleGeometry(0.009, 16), new THREE.MeshBasicMaterial({ color: '#000' }));
        f.position.set(a, b, 0.0415);
        g.add(f);
      } else {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 12), mt.ouro);
        p.rotation.x = Math.PI / 2; p.position.set(a, b, 0.03);
        g.add(p);
      }
    }
    for (const [a, b] of [[-0.075, 0.085], [0.075, -0.085]]) {
      const pa = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16), mt.cromo);
      pa.rotation.x = Math.PI / 2; pa.position.set(a, b, 0.014);
      g.add(pa);
    }
    if (tipo === 'xlrf') {
      const trava = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.03, 0.012, 2, 0.004), mt.niquel);
      trava.position.set(0, 0.09, 0.016);
      g.add(trava);
      g.userData.trava = trava;
    }
  } else if (tipo === 'dsub') {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.11, 0.03, 2, 0.02), mt.niquel);
    c.position.z = 0.015;
    const i = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.06, 0.02, 2, 0.015), new THREE.MeshStandardMaterial({ color: '#111' }));
    i.position.z = 0.03;
    g.add(c, i);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), mt.cromo);
      p.rotation.x = Math.PI / 2; p.position.set(s * 0.17, 0, 0.02);
      g.add(p);
    }
  } else if (tipo === 'iec') {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.22, 0.03, 2, 0.02), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 }));
    c.position.z = 0.015;
    g.add(c);
    for (const a of [-0.07, 0, 0.07]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.03), mt.niquel);
      p.position.set(a, a === 0 ? 0.03 : -0.01, 0.02);
      g.add(p);
    }
  } else if (tipo === 'din') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 32), mt.niquel);
    c.rotation.x = Math.PI / 2; c.position.z = 0.015;
    const i = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 32), new THREE.MeshStandardMaterial({ color: '#111' }));
    i.rotation.x = Math.PI / 2; i.position.z = 0.031;
    g.add(c, i);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
