import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Decode URL and handle paths safely
  const decodedUrl = decodeURIComponent(req.url);
  let safeUrl = decodedUrl.split('?')[0];
  if (safeUrl === '/') safeUrl = '/index.html';

  let filePath = path.join(DIST_DIR, safeUrl);

  // Prevent Directory Traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.statusCode = 403;
    res.end('Access Denied');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for Single Page Application routing (SPA)
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`======================================================================`);
  console.log(`          PHAN MEM KIEM KE MOI TRUONG OFFLINE PRO`);
  console.log(`======================================================================`);
  console.log(`[OK] He thong da kich hoat de chay tu phat khoi can internet!`);
  console.log(` => Link truy cap tai may chu:  http://localhost:${PORT}`);
  console.log(`======================================================================`);
});
