// Texturas procedurais: plástico texturizado, serrilhado de botões, metal escovado, chiado de TV, barras de cor.
import * as THREE from 'three';
import { canvas, rng } from './util.js';

const cache = {};

/** Mapa de altura (Float32) -> canvas de normal map (tileável). */
function alturaParaNormal(alt, n, forca) {
  const c = canvas(n, n), x = c.getContext('2d');
  const img = x.createImageData(n, n);
  const at = (i, j) => alt[((j + n) % n) * n + ((i + n) % n)];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const dx = (at(i + 1, j) - at(i - 1, j)) * forca;
      const dy = (at(i, j + 1) - at(i, j - 1)) * forca;
      const l = Math.hypot(dx, dy, 1);
      const k = (j * n + i) * 4;
      img.data[k] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[k + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      img.data[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

function texDe(c, rep = 1, srgb = false) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Plástico com textura pontilhada (como a carcaça das fitas e do painel). Retorna {normal, rugosidade}. */
export function pontilhado(seed = 1, n = 512, densidade = 5200, raio = [1.2, 3.2]) {
  const k = `pont${seed}_${n}_${densidade}`;
  if (cache[k]) return cache[k];
  const r = rng(seed);
  const c = canvas(n, n), x = c.getContext('2d');
  x.fillStyle = '#808080';
  x.fillRect(0, 0, n, n);
  for (let i = 0; i < densidade; i++) {
    const px = r() * n, py = r() * n, rr = raio[0] + r() * (raio[1] - raio[0]);
    const v = r() < 0.5 ? 255 : 0;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      const X = px + ox, Y = py + oy;
      if (X < -rr || Y < -rr || X > n + rr || Y > n + rr) continue;
      const g = x.createRadialGradient(X, Y, 0, X, Y, rr);
      g.addColorStop(0, `rgba(${v},${v},${v},0.28)`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      x.fillStyle = g;
      x.fillRect(X - rr, Y - rr, rr * 2, rr * 2);
    }
  }
  const d = x.getImageData(0, 0, n, n).data;
  const alt = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) alt[i] = d[i * 4] / 255;
  const nc = alturaParaNormal(alt, n, 2.2);
  // rugosidade: variação leve em torno de 0.5 (o canal G é o usado)
  const rc = canvas(n, n), rx = rc.getContext('2d');
  const ri = rx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = 150 + (alt[i] - 0.5) * 120;
    ri.data[i * 4] = ri.data[i * 4 + 1] = ri.data[i * 4 + 2] = v;
    ri.data[i * 4 + 3] = 255;
  }
  rx.putImageData(ri, 0, 0);
  cache[k] = { normalC: nc, rugC: rc };
  return cache[k];
}
export function texPontilhado(seed, rep) {
  const p = pontilhado(seed);
  return { normal: texDe(p.normalC, rep), rug: texDe(p.rugC, rep) };
}

/** Serrilhado vertical (lateral de botões giratórios / disco do jog). */
export function texSerrilhado(linhas = 90) {
  const n = 512, c = canvas(n, 64), x = c.getContext('2d');
  const alt = new Float32Array(n * 64);
  for (let i = 0; i < n; i++) {
    const v = 0.5 + 0.5 * Math.cos((i / n) * linhas * Math.PI * 2);
    for (let j = 0; j < 64; j++) alt[j * n + i] = v;
  }
  // normal só no eixo X
  const img = x.createImageData(n, 64);
  for (let j = 0; j < 64; j++) for (let i = 0; i < n; i++) {
    const dx = (alt[j * n + ((i + 1) % n)] - alt[j * n + ((i - 1 + n) % n)]) * 3;
    const l = Math.hypot(dx, 1), k = (j * n + i) * 4;
    img.data[k] = ((-dx / l) * 0.5 + 0.5) * 255;
    img.data[k + 1] = 128;
    img.data[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
    img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Metal escovado (riscos horizontais finos) -> {normal, rug}. */
export function texEscovado(seed = 3, rep = 1) {
  const n = 512, r = rng(seed);
  const alt = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    let v = r();
    for (let i = 0; i < n; i++) {
      v = v * 0.97 + r() * 0.03;
      alt[j * n + i] = v + (r() - 0.5) * 0.05;
    }
  }
  const nc = alturaParaNormal(alt, n, 1.2);
  const rc = canvas(n, n), rx = rc.getContext('2d'), ri = rx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = 90 + alt[i] * 70;
    ri.data[i * 4] = ri.data[i * 4 + 1] = ri.data[i * 4 + 2] = v;
    ri.data[i * 4 + 3] = 255;
  }
  rx.putImageData(ri, 0, 0);
  return { normal: texDe(nc, rep), rug: texDe(rc, rep) };
}

/** Sulcos concêntricos (lateral do rolo de fita enrolada). */
export function texRoloFita() {
  const n = 512, c = canvas(n, n), x = c.getContext('2d');
  const r = rng(77);
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, '#2a2018');
  g.addColorStop(1, '#3a2c20');
  x.fillStyle = g;
  x.fillRect(0, 0, n, n);
  for (let i = 0; i < 260; i++) {
    const rr = 20 + r() * (n / 2 - 20);
    x.strokeStyle = `rgba(${r() < 0.5 ? '255,230,200' : '0,0,0'},${0.03 + r() * 0.06})`;
    x.lineWidth = 0.6 + r() * 1.2;
    x.beginPath();
    x.arc(n / 2, n / 2, rr, 0, Math.PI * 2);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Chiado de TV (vários quadros). */
export function canvasChiado(seed, w = 320, h = 240) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), r = rng(seed);
  for (let i = 0; i < w * h; i++) {
    const v = r() * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** Barras de cor SMPTE (sinal de teste) */
export function canvasBarras(w = 640, h = 480, legenda = '') {
  const c = canvas(w, h), x = c.getContext('2d');
  const cores = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  cores.forEach((k, i) => { x.fillStyle = k; x.fillRect((i * w) / 7, 0, w / 7 + 1, h * 0.67); });
  const inv = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
  inv.forEach((k, i) => { x.fillStyle = k; x.fillRect((i * w) / 7, h * 0.67, w / 7 + 1, h * 0.08); });
  const base = ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d', '#131313'];
  const ws = [1.25, 1.25, 1.25, 1.25, 0.33, 0.33, 0.34, 1];
  let px = 0;
  base.forEach((k, i) => { const ww = (ws[i] / 7) * w; x.fillStyle = k; x.fillRect(px, h * 0.75, ww + 1, h * 0.25); px += ww; });
  if (legenda) {
    x.fillStyle = 'rgba(0,0,0,0.75)';
    x.fillRect(w * 0.3, h * 0.42, w * 0.4, h * 0.13);
    x.fillStyle = '#fff';
    x.font = `700 ${Math.round(h * 0.07)}px "Share Tech Mono"`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(legenda, w / 2, h * 0.485);
  }
  return c;
}

/** Sombra de contato (mancha radial suave) para colocar sob objetos. */
export function texSombra() {
  if (cache.sombra) return cache.sombra;
  const n = 256, c = canvas(n, n), x = c.getContext('2d');
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.85)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, n, n);
  cache.sombra = new THREE.CanvasTexture(c);
  return cache.sombra;
}
export function sombraContato(w, d, opac = 0.7) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texSombra(), transparent: true, opacity: opac, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}
