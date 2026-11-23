const path = require('node:path');
const http = require('node:http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders.push(path.resolve(__dirname, '../packages'));
config.watchFolders.push(path.resolve(__dirname, '../frontend/src'));
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const metro = enhance ? enhance(middleware, server) : middleware;
  return (req, res, next) => {
    const pull = req.url === '/api/sync/pull' && req.method === 'GET';
    const push = req.method === 'POST' && (req.url === '/api/sync/push' || req.url === '/api/quiz/sessions' ||
      /^\/api\/flashcards\/[\w%-]+\/review$/.test(req.url));
    if (!pull && !push) return metro(req, res, next);
    if ((req.headers.origin && !['http://', 'https://'].some(
      scheme => req.headers.origin === scheme + req.headers.host
    )) || (push && !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? ''))) {
      res.writeHead(403).end();
      return;
    }
    const upstream = http.request({
      hostname: '127.0.0.1', port: process.env.KANJI_BACKEND_PORT || 3000, path: req.url,
      method: req.method, headers: push ? { 'content-type': 'application/json' } : {},
    }, response => {
      res.writeHead(response.statusCode, { 'content-type': 'application/json', 'cache-control': 'no-store' });
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
