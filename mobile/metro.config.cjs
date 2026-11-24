const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders.push(path.resolve(__dirname, '../packages'));
config.watchFolders.push(path.resolve(__dirname, '../frontend/src'));
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const metro = enhance ? enhance(middleware, server) : middleware;
  return (req, res, next) => {
    if (req.url === '/kanji-canvas.js' || req.url === '/ref-patterns.js') {
      const filePath = path.resolve(__dirname, 'public', req.url.slice(1));
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }
    const isApi = req.url && req.url.startsWith('/api/');
    if (!isApi) return metro(req, res, next);
    const isPush = req.method === 'POST';
    if ((req.headers.origin && !['http://', 'https://'].some(
      scheme => req.headers.origin === scheme + req.headers.host
    )) || (isPush && !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? ''))) {
      res.writeHead(403).end();
      return;
    }
    const upstream = http.request({
      hostname: '127.0.0.1', port: process.env.KANJI_BACKEND_PORT || 3001, path: req.url,
      method: req.method, headers: isPush ? { 'content-type': 'application/json' } : {},
    }, response => {
      res.writeHead(response.statusCode, { 'content-type': response.headers['content-type'] || 'application/json', 'cache-control': 'no-store' });
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  };
};
module.exports = config;
