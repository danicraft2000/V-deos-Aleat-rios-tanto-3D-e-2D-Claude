// Funções de apoio: easing, aleatório determinístico, tempo. Quadro 16:9 (1920x1080).
export const W = 1920;
export const H = 1080;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x) => x * x * x;
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
export const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInExpo = (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10));
export const easeOutElastic = (x) =>
  x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

// aleatório determinístico (mesmo resultado em qualquer worker)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const wobble = (t, f = 1, a = 1) => Math.sin(t * Math.PI * 2 * f) * a;

// tremida de câmera (decai a partir de t0)
export function shake(t, t0, dur = 0.35, amp = 18) {
  const p = (t - t0) / dur;
  if (p < 0 || p > 1) return [0, 0];
  const k = amp * (1 - p) * (1 - p);
  return [Math.sin(t * 91) * k, Math.cos(t * 77) * k];
}
// soma de tremidas
export function shakes(t, lista) {
  let x = 0, y = 0;
  for (const [t0, dur, amp] of lista) { const [a, b] = shake(t, t0, dur, amp); x += a; y += b; }
  return [x, y];
}
// "janela" de visibilidade com entrada e saída suaves
export function janela(t, a, b, fi = 0.25, fo = 0.25) {
  return clamp(Math.min((t - a) / fi, (b - t) / fo));
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
