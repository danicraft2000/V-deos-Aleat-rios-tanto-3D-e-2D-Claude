// Renderiza o vídeo quadro a quadro no Chromium (headless) e monta com FFmpeg.
//
// Uso:
//   node render.mjs                     -> vídeo completo (build/video_sem_audio.mp4)
//   node render.mjs --stills 2.9,20.5   -> quadros soltos em build/stills/ para conferir
//   node render.mjs --de 20 --ate 28    -> só um trecho
//   node render.mjs --workers 4 --fps 30
// Progresso: imprime "QUADROS feitos/total" a cada 150 quadros.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROJETO = path.resolve(AQUI, '..', '..'); // projetos/plano-do-premio
const BUILD = path.resolve(AQUI, '..', 'build');
const LARG = 1920, ALT = 1080;

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));

const server = await servir(PROJETO);
const URL = `http://127.0.0.1:${server.address().port}/producao/render/index.html`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });

async function novaPagina() {
  const page = await browser.newPage({ viewport: { width: LARG, height: ALT } });
  page.on('pageerror', (e) => console.error('ERRO NA PÁGINA:', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(URL);
  const info = await page.evaluate(() => window.__init());
  return { page, info };
}
const toBuf = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

if (args.stills) {
  const { page } = await novaPagina();
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
  fs.mkdirSync(path.join(BUILD, 'partes'), { recursive: true });
  const inicio = Date.now();
  let feitos = 0;
  const jobs = [];
  for (let w = 0; w < nw; w++) {
    const a = f0 + w * parte, b = Math.min(f1, a + parte);
    if (a >= b) continue;
    const saida = path.join(BUILD, 'partes', `parte_${String(w).padStart(2, '0')}.mp4`);
    jobs.push((async () => {
      const { page } = await novaPagina();
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(fps), saida], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        const d = await page.evaluate((tt) => window.__frame(tt, 0.95), f / fps);
        if (!ff.stdin.write(toBuf(d))) await new Promise((r) => ff.stdin.once('drain', r));
        feitos++;
        if (feitos % 150 === 0 || feitos === total) {
          const s = (Date.now() - inicio) / 1000;
          console.log(`QUADROS ${feitos}/${total} (${((100 * feitos) / total).toFixed(1)}%) · ${s.toFixed(0)} s · faltam ~${((s / feitos) * (total - feitos)).toFixed(0)} s`);
        }
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      await page.close();
      return saida;
    })());
  }
  const partes = await Promise.all(jobs);
  const lista = path.join(BUILD, 'partes', 'lista.txt');
  fs.writeFileSync(lista, partes.map((p) => `file '${p}'`).join('\n'));
  const destino = path.join(BUILD, args.saida ?? 'video_sem_audio.mp4');
  await new Promise((r, j) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', destino], { stdio: 'inherit' })
    .on('close', (c) => (c === 0 ? r() : j(new Error('concat falhou')))));
  console.log(`PRONTO: ${destino} (${total} quadros em ${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
}
await browser.close();
server.close();
