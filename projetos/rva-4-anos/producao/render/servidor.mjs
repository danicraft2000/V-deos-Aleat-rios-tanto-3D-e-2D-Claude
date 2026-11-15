// Servidor estático mínimo (a página precisa de http para ler os quadros sem "canvas contaminado").
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.wav': 'audio/wav' };
export function servir(raiz, porta = 0) {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const arq = path.join(raiz, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
      if (!arq.startsWith(raiz)) { res.writeHead(403); return res.end(); }
      fs.readFile(arq, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    s.listen(porta, '127.0.0.1', () => ok(s));
  });
}
