// Renderiza o trailer quadro a quadro no Chromium (headless) e monta o vídeo com FFmpeg.
//
// Uso:
//   node render.mjs                     -> corpo do trailer (build/video_corpo.mp4), de 0 até a vinheta
//   node render.mjs --stills 6.4,20.6   -> quadros soltos em build/stills/ para conferir
//   node render.mjs --de 20 --ate 28    -> só um trecho
//   node render.mjs --workers 4 --fps 30
//   node render.mjs --thumb A,B         -> thumbnails do YouTube em build/thumbnail/ (PNG 1920x1080 + JPG 1280x720)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROJETOS = path.resolve(AQUI, '..', '..', '..'); // projetos/ (o trailer usa os logos do projeto rva-4-anos)
const BUILD = path.resolve(AQUI, '..', '..', 'build');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));

const server = await servir(PROJETOS);
const URL = `http://127.0.0.1:${server.address().port}/rva-4-anos-trailer/producao/render/index.html`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });

async function novaPagina() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('ERRO NA PÁGINA:', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(URL);
  const info = await page.evaluate(() => window.__init());
  return { page, info };
}
const toBuf = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

if (args.thumb) {
  const { page } = await novaPagina();
  const dir = path.join(BUILD, 'thumbnail');
  fs.mkdirSync(dir, { recursive: true });
  for (const op of String(args.thumb === true ? 'A' : args.thumb).split(',')) {
    const png = path.join(dir, `RVA_4_Anos_Thumbnail_${op}_1920x1080.png`);
    fs.writeFileSync(png, toBuf(await page.evaluate((o) => window.__thumb(o), op)));
    const jpg = path.join(dir, `RVA_4_Anos_Thumbnail_${op}.jpg`);
    await new Promise((r, j) => spawn('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '2', jpg], { stdio: 'inherit' })
      .on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg falhou')))));
    console.log('thumbnail', jpg, `${(fs.statSync(jpg).size / 1024).toFixed(0)} KB`);
  }
} else if (args.stills) {
  const { page, info } = await novaPagina();
  console.log('caracteres especiais:', info.caracteres);
  fs.mkdirSync(path.join(BUILD, 'stills'), { recursive: true });
  for (const t of String(args.stills).split(',').map(Number)) {
    const t0 = Date.now();
    const d = await page.evaluate((tt) => window.__frame(tt, 0.9), t);
    const f = path.join(BUILD, 'stills', `t${t.toFixed(2).padStart(6, '0')}.jpg`);
    fs.writeFileSync(f, toBuf(d));
    console.log('still', f, `${Date.now() - t0} ms`);
  }
} else {
  const { info } = await novaPagina();
  const fps = Number(args.fps ?? info.fps);
  const de = Number(args.de ?? 0), ate = Number(args.ate ?? info.duracao);
  const f0 = Math.round(de * fps), f1 = Math.round(ate * fps);
  const nw = Number(args.workers ?? 4);
  const total = f1 - f0;
  const parte = Math.ceil(total / nw);
  const dirPartes = path.join(BUILD, 'partes');
  fs.mkdirSync(dirPartes, { recursive: true });
  const inicio = Date.now();
  let feitos = 0;
  const jobs = [];
  for (let w = 0; w < nw; w++) {
    const a = f0 + w * parte, b = Math.min(f1, a + parte);
    if (a >= b) continue;
    const saida = path.join(dirPartes, `parte_${String(w).padStart(2, '0')}.mp4`);
    jobs.push((async () => {
      const { page } = await novaPagina();
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(fps), saida], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        const d = await page.evaluate((tt) => window.__frame(tt, 0.95), f / fps);
        if (!ff.stdin.write(toBuf(d))) await new Promise((r) => ff.stdin.once('drain', r));
        feitos++;
        if (feitos % 90 === 0) {
          const s = (Date.now() - inicio) / 1000;
          console.log(`${feitos}/${total} quadros · ${s.toFixed(0)} s · faltam ~${((s / feitos) * (total - feitos)).toFixed(0)} s`);
        }
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      await page.close();
      return saida;
    })());
  }
  const partes = await Promise.all(jobs);
  const lista = path.join(dirPartes, 'lista.txt');
  fs.writeFileSync(lista, partes.map((p) => `file '${p}'`).join('\n'));
  const destino = path.join(BUILD, args.saida ?? 'video_corpo.mp4');
  await new Promise((r, j) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', destino], { stdio: 'inherit' })
    .on('close', (c) => (c === 0 ? r() : j(new Error('concat falhou')))));
  console.log(`pronto: ${destino} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
}
await browser.close();
server.close();
