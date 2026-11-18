// Funções de apoio: easing, aleatório determinístico, tempo e canvas.
export const W = 1920;
export const H = 1080;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);
export const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x) => x * x * x;
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);
export const easeInOutQuart = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2);
export const easeOutBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
export const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
/** sobe em [a,a+d] e desce em [b-d2,b]  (0..1) */
export const janela = (t, a, b, d = 0.4, d2 = d) => Math.min(smooth(prog(t, a, a + d)), 1 - smooth(prog(t, b - d2, b)));

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
export const hash = (n) => rng(Math.floor(n) * 9301 + 49297)();
/** ruído 1D suave (para câmera na mão, ponteiros etc.) */
export function ruido(t, seed = 1) {
  const i = Math.floor(t), f = t - i;
  const a = hash(i * 13 + seed * 977) * 2 - 1, b = hash((i + 1) * 13 + seed * 977) * 2 - 1;
  return lerp(a, b, smooth(f));
}
export const fbm = (t, seed = 1) => ruido(t, seed) * 0.6 + ruido(t * 2.3, seed + 7) * 0.3 + ruido(t * 5.1, seed + 13) * 0.1;

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
/** retângulo arredondado no canvas 2D */
export function rrect(x, ctx, X, Y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(X + r, Y);
  ctx.arcTo(X + w, Y, X + w, Y + h, r);
  ctx.arcTo(X + w, Y + h, X, Y + h, r);
  ctx.arcTo(X, Y + h, X, Y, r);
  ctx.arcTo(X, Y, X + w, Y, r);
  ctx.closePath();
  if (x === 'fill') ctx.fill(); else if (x === 'stroke') ctx.stroke();
}
