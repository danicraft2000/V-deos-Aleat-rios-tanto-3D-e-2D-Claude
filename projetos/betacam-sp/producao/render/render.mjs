// Renderiza o vídeo quadro a quadro no Chromium (headless) e monta com FFmpeg.
// Cada seção vira um arquivo em build/secoes/ (dá para refazer só uma); no fim tudo é concatenado.
//
// Uso:
//   node render.mjs                         -> todas as seções que faltam + build/video_sem_audio.mp4
//   node render.mjs --secoes s04,s05        -> só essas seções (refaz mesmo se já existirem)
//   node render.mjs --stills 12.5,80,140    -> quadros soltos em build/stills/ (tempo absoluto)
//   node render.mjs --stills s04:3.2        -> quadro solto pelo tempo local da seção
//   node render.mjs --eventos               -> só exporta build/eventos.json (efeitos sonoros)
//   node render.mjs --workers 3 --passo 2   (passo 2 = metade dos quadros, para prévia rápida)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROJETO = path.resolve(AQUI, '..', '..'); // projetos/betacam-sp
const BUILD = path.resolve(AQUI, '..', 'build');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));

const server = await servir(PROJETO);
const URL = `http://127.0.0.1:${server.address().port}/producao/render/index.html`;
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args: ARGS });
const extras = [];

// cada worker extra usa um navegador próprio (processo de GPU separado = renderiza em paralelo de verdade)
async function novaPagina(separado = false) {
  let b = browser;
  if (separado) { b = await chromium.launch({ args: ARGS }); extras.push(b); }
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('ERRO NA PÁGINA:', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); else if (args.log) console.log('log:', m.text()); });
  await page.goto(URL);
  const info = await page.evaluate(() => window.__init());
  return { page, info };
}
const toBuf = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
const inicio = Date.now();

const { page: p0, info } = await novaPagina();
fs.mkdirSync(BUILD, { recursive: true });
const eventos = await p0.evaluate(() => window.__eventos());
fs.writeFileSync(path.join(BUILD, 'eventos.json'), JSON.stringify(eventos, null, 1));

if (args.eventos) {
  console.log(`eventos: ${eventos.length}`);
} else if (args.stills) {
  fs.mkdirSync(path.join(BUILD, 'stills'), { recursive: true });
  for (const item of String(args.stills).split(',')) {
    let t;
    if (item.includes(':')) {
      const [sid, lt] = item.split(':');
      const s = info.secoes.find((x) => x.id.startsWith(sid));
      t = s.ini + Number(lt);
    } else t = Number(item);
    const t0 = Date.now();
    const d = await p0.evaluate((tt) => window.__frame(tt, 0.92), t);
    const f = path.join(BUILD, 'stills', `${item.replace(':', '_')}.jpg`);
    fs.writeFileSync(f, toBuf(d));
    console.log('still', f, `${Date.now() - t0} ms`);
  }
} else {
  const fps = info.fps;
  const passo = Number(args.passo ?? 1);
  const dir = path.join(BUILD, 'secoes');
  fs.mkdirSync(dir, { recursive: true });
  const filtro = args.secoes ? String(args.secoes).split(',') : null;
  // quadros de cada seção (contíguos: o fim de uma é o começo da outra)
  const jobs = [];
  info.secoes.forEach((s, i) => {
    const f0 = Math.round(s.ini * fps), f1 = i + 1 < info.secoes.length ? Math.round(info.secoes[i + 1].ini * fps) : Math.round(s.fim * fps);
    const saida = path.join(dir, `${s.id}.mp4`);
    const quer = filtro ? filtro.some((p) => s.id.startsWith(p)) : !fs.existsSync(saida);
    if (quer) jobs.push({ id: s.id, f0, f1, saida });
  });
  // divide seções longas em pedaços para equilibrar os workers
  const pedacos = [];
  for (const j of jobs) {
    const n = Math.max(1, Math.round((j.f1 - j.f0) / 240));
    const tam = Math.ceil((j.f1 - j.f0) / n);
    for (let k = 0; k < n; k++) {
      const a = j.f0 + k * tam, b = Math.min(j.f1, a + tam);
      if (a < b) pedacos.push({ ...j, a, b, parte: path.join(dir, `${j.id}.p${String(k).padStart(2, '0')}.mp4`), k, n });
    }
  }
  const total = pedacos.reduce((s, p) => s + Math.ceil((p.b - p.a) / passo), 0);
  console.log(`seções: ${jobs.map((j) => j.id).join(', ') || '(nenhuma)'} · ${total} quadros`);
  let feitos = 0;
  const nw = Number(args.workers ?? 3);
  let prox = 0;
  const worker = async (w) => {
    const { page } = w === 0 ? { page: p0 } : await novaPagina(true);
    while (prox < pedacos.length) {
      const pc = pedacos[prox++];
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps / passo), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), pc.parte], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = pc.a; f < pc.b; f += passo) {
        const d = await page.evaluate((tt) => window.__frame(tt, 0.94), f / fps);
        if (!ff.stdin.write(toBuf(d))) await new Promise((r) => ff.stdin.once('drain', r));
        feitos++;
        if (feitos % 50 === 0) {
          const s = (Date.now() - inicio) / 1000;
          console.log(`${feitos}/${total} quadros · ${s.toFixed(0)} s · ${(s / feitos).toFixed(2)} s/quadro · faltam ~${((s / feitos) * (total - feitos) / 60).toFixed(1)} min`);
        }
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
    }
  };
  await Promise.all(Array.from({ length: nw }, (_, w) => worker(w)));
  // junta os pedaços de cada seção
  for (const j of jobs) {
    const partes = pedacos.filter((p) => p.id === j.id).sort((a, b) => a.k - b.k);
    const lista = path.join(dir, `${j.id}.lista.txt`);
    fs.writeFileSync(lista, partes.map((p) => `file '${p.parte}'`).join('\n'));
    await new Promise((r, x) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', j.saida], { stdio: 'inherit' })
      .on('close', (c) => (c === 0 ? r() : x(new Error('concat falhou')))));
    for (const p of partes) fs.unlinkSync(p.parte);
    fs.unlinkSync(lista);
  }
  // vídeo completo (se todas as seções existem)
  const todas = info.secoes.map((s) => path.join(dir, `${s.id}.mp4`));
  if (todas.every((f) => fs.existsSync(f))) {
    const lista = path.join(dir, 'lista.txt');
    fs.writeFileSync(lista, todas.map((f) => `file '${f}'`).join('\n'));
    const destino = path.join(BUILD, 'video_sem_audio.mp4');
    await new Promise((r, x) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', destino], { stdio: 'inherit' })
      .on('close', (c) => (c === 0 ? r() : x(new Error('concat falhou')))));
    console.log(`pronto: ${destino}`);
  }
  console.log(`tempo: ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
}
for (const b of extras) await b.close();
await browser.close();
server.close();
