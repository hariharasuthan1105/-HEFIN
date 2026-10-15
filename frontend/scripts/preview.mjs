import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const pages = process.argv.includes('--pages');
const base = pages ? '/-HEFIN' : '';
const root = fileURLToPath(
  new URL(pages ? '../dist/pages/browser/' : '../dist/frontend/browser/', import.meta.url),
);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain',
};
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build first.');
http
  .createServer((req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (base && !pathname.startsWith(base + '/')) {
        res.writeHead(404).end();
        return;
      }
      pathname = pathname.slice(base.length);
      let file = path.resolve(root, '.' + pathname);
      if (path.relative(root, file).startsWith('..')) {
        res.writeHead(403).end();
        return;
      }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        if (path.extname(pathname)) {
          res.writeHead(404).end();
          return;
        }
        file = path.join(root, 'index.html');
      }
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(400).end();
    }
  })
  .listen(4201, '127.0.0.1', () =>
    console.log(`Production preview: http://127.0.0.1:4201${base}/`),
  );
