import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = normalize(join(__filename, '..'));
const root = normalize(join(__dirname, '..'));

const port = process.env.PORT ? Number(process.env.PORT) : 4173;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function safePath(urlPath) {
  const clean = (urlPath || '').split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(clean);
  const rel = decoded === '/' ? '/index.html' : decoded;
  const abs = normalize(join(root, rel));
  if (!abs.startsWith(root)) return null;
  return abs;
}

const server = http.createServer(async (req, res) => {
  try {
    const abs = safePath(req.url);
    if (!abs) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const ext = extname(abs).toLowerCase();
    const buf = await readFile(abs);
    res.writeHead(200, {
      'content-type': contentTypes[ext] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`parking-lot-app test server on http://127.0.0.1:${port}`);
});

