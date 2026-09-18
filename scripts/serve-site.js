#!/usr/bin/env node
/**
 * `site/` をローカル配信するだけの、依存ゼロの静的ファイルサーバー（Sprint 5 成果物B）。
 * `npx serve` 等の追加インストールを避け、Node標準モジュールのみで完結させる。
 *
 * 使い方:
 *   node scripts/serve-site.js                    → http://localhost:4321/ 配下で site/ を配信
 *   PORT=5000 node scripts/serve-site.js           → ポート変更
 *   node scripts/serve-site.js --base=/my-repo/    → GitHub Pages のプロジェクトページ相当の
 *                                                     サブディレクトリ配下（例: http://localhost:4321/my-repo/）
 *                                                     で配信する検証用モード
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SITE_DIR = path.join(__dirname, '..', 'site');
const PORT = Number(process.env.PORT) || 4321;

const baseArg = process.argv.find((arg) => arg.startsWith('--base='));
let BASE_PATH = baseArg ? baseArg.slice('--base='.length) : '/';
if (!BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
if (!BASE_PATH.endsWith('/')) BASE_PATH = `${BASE_PATH}/`;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function safeJoin(root, requestPath) {
  const target = path.normalize(path.join(root, requestPath));
  if (!target.startsWith(root)) return null; // パストラバーサル防止
  return target;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (BASE_PATH !== '/') {
    if (pathname === BASE_PATH.slice(0, -1) || pathname === BASE_PATH) {
      pathname = '/';
    } else if (pathname.startsWith(BASE_PATH)) {
      pathname = pathname.slice(BASE_PATH.length - 1);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Not Found (expected base path ${BASE_PATH})`);
      return;
    }
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = safeJoin(SITE_DIR, pathname);
  if (!filePath) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`site/ served at http://localhost:${PORT}${BASE_PATH}`);
});
