// Peças de apoio: plugues e cabos (BNC, XLR, energia), monitor de tubo, câmera de reportagem,
// videocassete "leve" para racks, frasco de álcool, haste de limpeza, bandeira, etiqueta de preço,
// tira de quadros (frame a frame), partículas de poeira e cone de luz.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, rng, rrect, clamp } from './util.js';
import { comEnv } from './motor.js';
import { texSerrilhado, canvasBarras, canvasChiado, sombraContato } from './texturas.js';
import { DK } from './deck.js';
import { canvasSelo } from './fita.js';

const M = {};
function mats() {
  if (M.niquel) return M;
  M.niquel = comEnv(new THREE.MeshStandardMaterial({ color: '#cfd2d6', metalness: 1, roughness: 0.25 }));
  M.borracha = comEnv(new THREE.MeshStandardMaterial({ color: '#101010', roughness: 0.55 }), 0.5);
  M.plastico = comEnv(new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.4, clearcoat: 0.3 }), 0.8);
  const k = texSerrilhado(40);
  k.repeat.set(1, 1);
  M.serrilhado = comEnv(new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.3, normalMap: k, normalScale: new THREE.Vector2(1, 1) }));
  M.ouro = comEnv(new THREE.MeshStandardMaterial({ color: '#e1b45a', metalness: 1, roughness: 0.25 }));
  return M;
}

/** Cabo: tubo ao longo de uma curva (pontos locais). */
export function cabo(pontos, cor = '#151515', raio = 0.022) {
  const curva = new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 80, raio, 10, false), comEnv(new THREE.MeshStandardMaterial({ color: cor, roughness: 0.42 }), 0.7));
  m.castShadow = true;
  return m;
}

/**
 * Plugue com cabo. tipo: 'bnc' | 'xlr' | 'iec'. O plugue aponta para −Z local (encaixa indo para −Z).
 * caboPts: pontos do cabo em coordenadas locais do plugue (começando na traseira do plugue, z>0).
 */
export function plugue(tipo, caboPts, corCabo) {
  const mt = mats();
  const g = new THREE.Group();
  const corpo = new THREE.Group();
  g.add(corpo);
  if (tipo === 'bnc') {
    const anel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.07, 32, 1, true), mt.serrilhado);
    anel.rotation.x = Math.PI / 2; anel.position.z = 0.035;
    const fundo = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.004, 32), mt.niquel);
    fundo.rotation.x = Math.PI / 2; fundo.position.z = 0.002;
    const corpoM = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.08, 24), mt.niquel);
    corpoM.rotation.x = Math.PI / 2; corpoM.position.z = 0.11;
    const bota = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.034, 0.14, 20), new THREE.MeshStandardMaterial({ color: corCabo ?? '#1b3f7a', roughness: 0.5 }));
    bota.rotation.x = Math.PI / 2; bota.position.z = 0.22;
    corpo.add(anel, fundo, corpoM, bota);
    g.userData.anel = anel;
  } else if (tipo === 'xlr') {
    const frente = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.06, 36), mt.niquel);
    frente.rotation.x = Math.PI / 2; frente.position.z = 0.03;
    const capa = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.058, 0.2, 36), mt.plastico);
    capa.rotation.x = Math.PI / 2; capa.position.z = 0.16;
    const bota = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 24), mt.borracha);
    bota.rotation.x = Math.PI / 2; bota.position.z = 0.31;
    corpo.add(frente, capa, bota);
  } else if (tipo === 'iec') {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.18, 0.2, 3, 0.03), mt.plastico);
    c.position.z = 0.1;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.14, 20), mt.borracha);
    b.rotation.x = Math.PI / 2; b.position.z = 0.26;
    corpo.add(c, b);
  }
  corpo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  if (caboPts) g.add(cabo(caboPts, corCabo ?? '#151515', tipo === 'bnc' ? 0.02 : 0.026));
  return g;
}

/** Monitor de tubo (CRT) de estúdio com tela em textura de canvas. */
export function monitor(w = 1.0, conteudo = 'barras') {
  const g = new THREE.Group();
  const h = w * 0.78;
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(w, h, w * 0.9, 3, 0.03), new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.55, metalness: 0.2 }));
  corpo.position.z = -w * 0.45;
  corpo.castShadow = true;
  const moldura = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.94), new THREE.MeshBasicMaterial({ color: '#0b0b0b' }));
  moldura.position.z = 0.002;
  const cv = canvas(640, 480);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.74), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  tela.position.set(-w * 0.04, h * 0.04, 0.006);
  const vidro = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.74), comEnv(new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false }), 2));
  vidro.position.copy(tela.position).setZ(0.01);
  g.add(corpo, moldura, tela, vidro);
  const api = { grupo: g, cv, tex, tela, conteudo, ultimo: -1 };
  api.desenhar = (t) => {
    const q = Math.floor(t * 12);
    if (q === api.ultimo) return;
    api.ultimo = q;
    desenhaTela(cv.getContext('2d'), api.conteudo, t);
    tex.needsUpdate = true;
  };
  api.desenhar(0);
  return api;
}

function desenhaTela(x, tipo, t) {
  const w = 640, h = 480;
  x.save();
  if (tipo === 'barras') x.drawImage(canvasBarras(w, h, ''), 0, 0);
  else if (tipo === 'chiado') x.drawImage(canvasChiado(Math.floor(t * 12) % 7 + 1, w, h), 0, 0);
  else if (tipo === 'falha') {
    x.drawImage(canvasBarras(w, h, ''), 0, 0);
    const r = rng(Math.floor(t * 12) + 5);
    for (let i = 0; i < 26; i++) { const y = r() * h; x.drawImage(canvasChiado(Math.floor(r() * 7) + 1, w, 12), 0, 0, w, 12, 0, y, w, 4 + r() * 18); }
  } else if (tipo === 'jornal' || tipo === 'estudio') {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0d2a5a'); g.addColorStop(1, '#061226');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // âncora estilizada
    x.fillStyle = '#1b3f7a'; x.fillRect(0, h * 0.68, w, h * 0.32);
    x.fillStyle = '#2c2c34'; x.beginPath(); x.ellipse(w * 0.5, h * 0.78, w * 0.17, h * 0.2, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#c99a78'; x.beginPath(); x.arc(w * 0.5, h * 0.42, h * 0.11, 0, 7); x.fill();
    x.fillStyle = '#2a1d16'; x.beginPath(); x.arc(w * 0.5, h * 0.38, h * 0.11, Math.PI, 0); x.fill();
    if (tipo === 'jornal') {
      x.fillStyle = '#e8b030'; x.fillRect(w * 0.06, h * 0.8, w * 0.6, h * 0.09);
      x.fillStyle = '#fff'; x.fillRect(w * 0.06, h * 0.89, w * 0.6, h * 0.06);
      x.fillStyle = '#111'; x.font = '700 30px "Rajdhani"'; x.fillText('EDIÇÃO DAS 19H', w * 0.08, h * 0.865);
      x.font = '600 20px "Rajdhani"'; x.fillText('AO VIVO', w * 0.08, h * 0.935);
    }
  } else if (tipo === 'relogio') {
    x.fillStyle = '#05070a'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e83a30'; x.lineWidth = 8;
    x.beginPath(); x.arc(w / 2, h / 2, h * 0.38, 0, 7); x.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, on = i <= (t % 60);
      x.fillStyle = on ? '#ff4a3a' : '#3a1210';
      x.beginPath(); x.arc(w / 2 + Math.sin(a) * h * 0.42, h / 2 - Math.cos(a) * h * 0.42, 5, 0, 7); x.fill();
    }
    x.fillStyle = '#ff4a3a'; x.font = '400 110px "Share Tech Mono"'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const s = Math.floor(t) % 60;
    x.fillText(`19:${String(29 + Math.floor((t + 40) / 60)).padStart(2, '0')}`, w / 2, h / 2 - 10);
    x.font = '400 50px "Share Tech Mono"'; x.fillText(String(s).padStart(2, '0'), w / 2, h / 2 + 70);
  } else if (tipo === 'claquete') {
    x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff'; x.font = '700 64px "Rajdhani"'; x.textAlign = 'center';
    x.fillText('VT 03 · TAKE 2', w / 2, h * 0.45);
    x.font = '400 54px "Share Tech Mono"'; x.fillText(`00:01:${String(12 + Math.floor(t)).padStart(2, '0')}:${String(Math.floor(t * 30) % 30).padStart(2, '0')}`, w / 2, h * 0.65);
  }
  // linhas de varredura
  x.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1);
  x.restore();
}

/** Videocassete "leve" (caixa + frente pintada) para encher racks sem pesar no render. */
export function deckLeve(frenteCanvas) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(DK.W, DK.H, 2.2), new THREE.MeshStandardMaterial({ color: '#2f2e2b', roughness: 0.55, metalness: 0.15 }));
  corpo.position.set(0, DK.H / 2, -1.1);
  const tex = new THREE.CanvasTexture(frenteCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const frente = new THREE.Mesh(new THREE.PlaneGeometry(DK.W, DK.H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.1, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.06 }));
  frente.position.set(0, DK.H / 2, 0.002);
  g.add(corpo, frente);
  return g;
}
/** pinta a frente completa do deck (para os racks) a partir de um canvas simples */
export function canvasFrenteDeck(seed = 1) {
  const k = 300, c = canvas(Math.round(DK.W * k), Math.round(DK.H * k)), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#3c3b38'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#44443f'; x.fillRect(0, DK.HS * k, c.width, DK.HI * k);
  x.fillStyle = '#e8e6e0'; x.font = `700 ${0.085 * k}px serif`; x.fillText('SONY', 0.08 * k, 0.2 * k);
  x.fillStyle = '#0d0d0d'; x.fillRect(1.3 * k, 0.15 * k, 2.84 * k, 0.56 * k);
  x.drawImage(canvasSelo(760, 150, true), 3.5 * k, 0.2 * k, 0.47 * k, 0.093 * k);
  x.fillStyle = '#efd38a'; x.fillRect(0.49 * k, 0.33 * k, 0.39 * k, 0.21 * k); x.fillRect(0.91 * k, 0.33 * k, 0.38 * k, 0.21 * k);
  x.fillStyle = '#1a1a1a'; x.fillRect(1.63 * k, 1.33 * k, 1.08 * k, 0.51 * k); x.fillRect(2.87 * k, 1.1 * k, 1.06 * k, 0.22 * k);
  x.fillStyle = '#ff3a2a'; x.font = `400 ${0.13 * k}px "Share Tech Mono"`;
  x.fillText(`00:${String(Math.floor(r() * 60)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:${String(Math.floor(r() * 30)).padStart(2, '0')}`, 2.95 * k, 1.27 * k);
  const cores = ['#d9d0b0', '#d9d0b0', '#b3201f', '#d9d0b0', '#2a6f9b'];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { x.fillStyle = j === 1 && (i === 0 || i === 4) ? '#2a6f9b' : cores[i === 2 && j === 0 ? 2 : 0]; x.fillRect((1.75 + i * 0.2) * k, (1.44 + j * 0.23) * k, 0.1 * k, 0.1 * k); }
  for (let i = 0; i < 5; i++) { x.fillStyle = '#d9d0b0'; x.fillRect((0.36 + i * 0.16) * k, 1.22 * k, 0.1 * k, 0.1 * k); }
  x.fillStyle = '#111'; x.beginPath(); x.arc(3.46 * k, 1.67 * k, 0.26 * k, 0, 7); x.fill();
  return c;
}

/** Câmera de reportagem (ENG) com gravador Betacam SP acoplado — estilizada. */
export function cameraENG() {
  const g = new THREE.Group();
  const cinza = comEnv(new THREE.MeshStandardMaterial({ color: '#3b3d40', roughness: 0.5, metalness: 0.3 }), 0.8);
  const preto = comEnv(new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.45 }), 0.7);
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.75, 2.1, 4, 0.08), cinza);
  corpo.position.set(0, 0.55, 0);
  const grav = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.8, 1.1, 4, 0.06), cinza);
  grav.position.set(0, 0.55, 0.9);
  const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.0, 40), preto);
  lente.rotation.x = Math.PI / 2;
  lente.position.set(0, 0.6, -1.45);
  const anel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.12, 40), comEnv(new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6, normalMap: texSerrilhado(60), normalScale: new THREE.Vector2(1, 1) })));
  anel.rotation.x = Math.PI / 2;
  anel.position.set(0, 0.6, -1.75);
  const vidro = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), comEnv(new THREE.MeshPhysicalMaterial({ color: '#0a1020', roughness: 0.02, metalness: 0.2, clearcoat: 1, iridescence: 0.6 }), 2));
  vidro.position.set(0, 0.6, -1.96);
  vidro.rotation.y = Math.PI;
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 12, 40, Math.PI), preto);
  alca.position.set(0, 0.95, 0.1);
  alca.rotation.y = Math.PI / 2;
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.7, 24), preto);
  visor.rotation.x = Math.PI / 2;
  visor.position.set(-0.5, 1.0, -0.55);
  const visorBraco = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.3), preto);
  visorBraco.position.set(-0.36, 1.0, -0.4);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 16), preto);
  mic.rotation.x = Math.PI / 2;
  mic.position.set(0.28, 1.05, -0.95);
  const ombro = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.15, 0.7, 2, 0.05), preto);
  ombro.position.set(0, 0.1, 0.2);
  // selo BETACAM SP na lateral
  const st = new THREE.CanvasTexture(canvasSelo(760, 150, true));
  st.colorSpace = THREE.SRGBColorSpace;
  const selo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), new THREE.MeshStandardMaterial({ map: st, metalness: 0.4, roughness: 0.4 }));
  selo.position.set(0.362, 0.75, 0.9);
  selo.rotation.y = Math.PI / 2;
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: '#400', emissive: '#ff2010', emissiveIntensity: 4 }));
  tally.position.set(0, 0.95, -0.9);
  g.add(corpo, grav, lente, anel, vidro, alca, visor, visorBraco, mic, ombro, selo, tally);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { grupo: g, tally };
}

/** Tripé simples */
export function tripe(alt = 2.2) {
  const g = new THREE.Group();
  const mt = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, alt * 1.08, 10), mt);
    p.position.set(Math.cos(a) * 0.45, alt / 2, Math.sin(a) * 0.45);
    p.lookAt(0, alt, 0);
    p.rotateX(Math.PI / 2);
    p.castShadow = true;
    g.add(p);
  }
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.2, 24), mt);
  cab.position.y = alt;
  g.add(cab);
  return g;
}

/** Frasco de álcool isopropílico */
export function frasco() {
  const g = new THREE.Group();
  const cv = canvas(512, 256), x = cv.getContext('2d');
  x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 512, 256);
  x.fillStyle = '#1d5fa8'; x.fillRect(0, 0, 512, 60);
  x.fillStyle = '#fff'; x.font = '700 40px "Rajdhani"'; x.textAlign = 'center'; x.fillText('ÁLCOOL', 256, 45);
  x.fillStyle = '#1d2a3a'; x.font = '700 50px "Rajdhani"'; x.fillText('ISOPROPÍLICO', 256, 125);
  x.font = '600 34px "Rajdhani"'; x.fillText('99,8% · LIMPEZA TÉCNICA', 256, 185);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 40, 1, true), comEnv(new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 0.6 })));
  corpo.position.y = 0.31;
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), new THREE.MeshStandardMaterial({ color: '#eee' }));
  fundo.rotation.x = Math.PI / 2;
  const ombro = new THREE.Mesh(new THREE.SphereGeometry(0.2, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), comEnv(new THREE.MeshPhysicalMaterial({ color: '#f2f2ee', roughness: 0.35, clearcoat: 0.6 })));
  ombro.position.y = 0.62;
  ombro.scale.y = 0.5;
  const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 24), comEnv(new THREE.MeshStandardMaterial({ color: '#1d5fa8', roughness: 0.4 })));
  tampa.position.y = 0.78;
  g.add(corpo, fundo, ombro, tampa);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Haste de limpeza com ponta de camurça */
export function haste() {
  const g = new THREE.Group();
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 12), new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.5 }));
  cabo.position.y = 0.45;
  const ponta = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.12, 0.03, 3, 0.012), new THREE.MeshStandardMaterial({ color: '#d8c7a6', roughness: 0.95 }));
  ponta.position.y = 0.0;
  g.add(cabo, ponta);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Bandeira do Japão (cartão) */
export function bandeiraJapao() {
  const cv = canvas(300, 200), x = cv.getContext('2d');
  x.fillStyle = '#f7f7f5'; x.fillRect(0, 0, 300, 200);
  x.fillStyle = '#bc002d'; x.beginPath(); x.arc(150, 100, 60, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.8, 0.02, 2, 0.01), [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: '#ddd', roughness: 0.6 }))));
  m.castShadow = true;
  return m;
}

/** Etiqueta de preço pendurada (texto atualizável) */
export function etiquetaPreco() {
  const g = new THREE.Group();
  const cv = canvas(600, 340);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const forma = new THREE.Shape();
  forma.moveTo(-0.6, -0.34); forma.lineTo(0.45, -0.34); forma.lineTo(0.62, 0); forma.lineTo(0.45, 0.34); forma.lineTo(-0.6, 0.34); forma.closePath();
  const furo = new THREE.Path(); furo.absarc(0.45, 0, 0.04, 0, Math.PI * 2, true); forma.holes.push(furo);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.012, bevelEnabled: false });
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.6) / 1.22, (uv.getY(i) + 0.34) / 0.68);
  const m = new THREE.Mesh(geo, [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#e9dfc8' })]);
  m.castShadow = true;
  g.add(m);
  const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.8, 6), new THREE.MeshStandardMaterial({ color: '#b8352a' }));
  fio.position.set(0.75, 0.25, 0.006);
  fio.rotation.z = 0.9;
  g.add(fio);
  let ultimo = '';
  const api = {
    grupo: g,
    set(linha1, linha2) {
      const k = linha1 + '|' + linha2;
      if (k === ultimo) return;
      ultimo = k;
      const x = cv.getContext('2d');
      x.fillStyle = '#f2e8d0'; x.fillRect(0, 0, 600, 340);
      x.strokeStyle = '#b8352a'; x.lineWidth = 6; x.strokeRect(14, 14, 572, 312);
      x.fillStyle = '#4a3a2a'; x.font = '700 40px "Rajdhani"'; x.textAlign = 'left'; x.fillText('PREÇO HOJE (USADO)', 40, 78);
      let fs = 86;
      x.font = `900 ${fs}px "Montserrat"`;
      while (x.measureText(linha1).width > 470 && fs > 30) { fs -= 2; x.font = `900 ${fs}px "Montserrat"`; }
      x.fillStyle = '#1b1b1b'; x.fillText(linha1, 36, 190);
      x.fillStyle = '#6a5a48'; x.font = '600 38px "Rajdhani"'; x.fillText(linha2, 40, 270);
      tex.needsUpdate = true;
    },
  };
  api.set('US$ 0', '');
  return api;
}

/** Tira de quadros (frame a frame): N quadros com uma bola em movimento; destaca o quadro atual. */
export function tiraQuadros(n = 7) {
  const g = new THREE.Group();
  const quadros = [];
  const w = 0.9, h = 0.68, gap = 0.12;
  const filme = new THREE.Mesh(new THREE.BoxGeometry((w + gap) * (n + 2), h + 0.34, 0.015), new THREE.MeshStandardMaterial({ color: '#0e0c0a', roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.92 }));
  g.add(filme);
  for (let i = 0; i < n; i++) {
    const cv = canvas(320, 240);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    q.position.set((i - (n - 1) / 2) * (w + gap), 0, 0.01);
    g.add(q);
    quadros.push({ q, cv, tex, ultimo: null });
  }
  // furos
  const furoMat = new THREE.MeshBasicMaterial({ color: '#ddd8cc' });
  for (let i = 0; i < (n + 2) * 3; i++) for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), furoMat);
    f.position.set(-((w + gap) * (n + 2)) / 2 + 0.17 + i * ((w + gap) / 3), s * (h / 2 + 0.1), 0.009);
    g.add(f);
  }
  const api = {
    grupo: g, quadros,
    /** f0 = número do quadro do meio; destaque = 0..1 */
    set(f0, corte = -1) {
      quadros.forEach((Q, i) => {
        const fr = f0 + i - Math.floor(n / 2);
        const k = fr + '|' + (corte === fr);
        if (Q.ultimo === k) return;
        Q.ultimo = k;
        const x = Q.cv.getContext('2d');
        const gg = x.createLinearGradient(0, 0, 0, 240);
        gg.addColorStop(0, '#6aa8d8'); gg.addColorStop(1, '#d9eefa');
        x.fillStyle = gg; x.fillRect(0, 0, 320, 240);
        x.fillStyle = '#3f7a3a'; x.fillRect(0, 190, 320, 50);
        const px = 20 + ((fr * 11) % 300 + 300) % 300, py = 190 - 22 - Math.abs(Math.sin(fr * 0.35)) * 110;
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(px, 192, 20, 6, 0, 0, 7); x.fill();
        x.fillStyle = '#e8402a'; x.beginPath(); x.arc(px, py, 22, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(px - 7, py - 8, 7, 0, 7); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, 0, 120, 34);
        x.fillStyle = '#fff'; x.font = '400 26px "Share Tech Mono"'; x.fillText(`Q ${String(((fr % 30) + 30) % 30).padStart(2, '0')}`, 10, 26);
        if (corte === fr) { x.strokeStyle = '#ff3b30'; x.lineWidth = 10; x.strokeRect(5, 5, 310, 230); }
        Q.tex.needsUpdate = true;
      });
    },
  };
  return api;
}

/** Partículas de poeira num facho de luz */
export function poeira(n = 500, caixa = [6, 4, 6], seed = 3) {
  const r = rng(seed);
  const pos = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) base.push([r() * caixa[0] - caixa[0] / 2, r() * caixa[1], r() * caixa[2] - caixa[2] / 2, r() * 10]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = canvas(64, 64), x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,220,1)'); gr.addColorStop(1, 'rgba(255,240,220,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.025, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe9c8', opacity: 0.7 }));
  return {
    grupo: pts,
    set(t) {
      base.forEach(([x0, y0, z0, f], i) => {
        pos[i * 3] = x0 + Math.sin(t * 0.21 + f) * 0.25;
        pos[i * 3 + 1] = ((y0 + t * 0.05 + f) % caixa[1]);
        pos[i * 3 + 2] = z0 + Math.cos(t * 0.17 + f * 1.3) * 0.25;
      });
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/** Cone de luz volumétrico falso */
export function coneLuz(alt = 6, raio = 2.2, cor = '#ffe8c8', opac = 0.08) {
  const c = canvas(64, 256), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, raio, alt, 48, 1, true), new THREE.MeshBasicMaterial({ color: cor, alphaMap: new THREE.CanvasTexture(c), transparent: true, opacity: opac, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.position.y = alt / 2;
  const g2 = new THREE.Group();
  g2.add(m);
  return g2;
}

/** Contorno (caixa em arame) para mostrar tamanhos */
export function contorno(w, h, d, cor = '#f0c66a') {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: 1, toneMapped: false }));
}

/** Prateleira com fitas em pé */
export function prateleira(criarFitaFn, n = 6) {
  const g = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.6 });
  const tabua = new THREE.Mesh(new THREE.BoxGeometry(n * 0.32 + 0.4, 0.06, 1.7), madeira);
  tabua.position.y = -0.03;
  tabua.receiveShadow = true;
  g.add(tabua);
  const fitas = [];
  for (let i = 0; i < n; i++) {
    const f = criarFitaFn(i);
    f.grupo.rotation.set(0, 0, Math.PI / 2);
    f.grupo.position.set((i - (n - 1) / 2) * 0.3, 1.265 / 1 + 0.0, 0);
    f.grupo.position.y = 2.53 / 2;
    g.add(f.grupo);
    fitas.push(f);
  }
  return { grupo: g, fitas };
}

export { sombraContato, clamp };
