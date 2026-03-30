import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = normalize(join(__filename, '..'));
const root = normalize(join(__dirname, '..'));

const port = process.env.PORT ? Number(process.env.PORT) : 4174;

const supabaseCdn =
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
const supabaseStub = '<script src="/e2e/supabase-stub.js"></script>';

const e2eConfigBody =
  "var SUPABASE_URL='https://e2e.invalid';\nvar SUPABASE_ANON_KEY='e2e-anon-key';\n";

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function safePath(urlPath) {
  const clean = (urlPath || '').split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(clean);
  const relUrl = decoded === '/' ? '/index.html' : decoded;
  const relFile = relUrl.replace(/^\/+/, '');
  const abs = normalize(join(root, relFile));
  if (!abs.startsWith(root)) return null;
  return { abs, relUrl };
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = safePath(req.url);
    if (!parsed) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const { abs, relUrl } = parsed;

    if (relUrl === '/config.js') {
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(e2eConfigBody);
      return;
    }

    if (relUrl === '/index.html' || relUrl === '/') {
      const indexPath = join(root, 'index.html');
      let html = await readFile(indexPath, 'utf8');
      if (!html.includes(supabaseCdn)) {
        res.writeHead(500);
        res.end('index.html missing expected Supabase CDN script tag');
        return;
      }
      html = html.replace(supabaseCdn, supabaseStub);
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(html);
      return;
    }

    const ext = extname(abs).toLowerCase();
    const buf = await readFile(abs);
    res.writeHead(200, {
      'content-type': contentTypes[ext] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(buf);
  } catch (_e) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`accounting-app test server on http://127.0.0.1:${port}`);
});
