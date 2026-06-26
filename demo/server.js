// Lightweight, zero-dependency Node server for the Raspberry Pi kiosk demo.
//
// Serves the static page in ./public and a tiny /health endpoint the page polls
// to tell whether the server is reachable. Uses only Node built-ins, so `npm install` 
// has nothing to fetch and this runs on a fresh Pi OS install out of the box.
//
// kiosk.sh is pointed at http://localhost:3000 by default to display it.

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

// URL the health check pings to confirm the internet is actually reachable.
const HEALTH_URL = process.env.HEALTH_URL || 'https://www.google.com/generate_204';
const HEALTH_TIMEOUT = Number(process.env.HEALTH_TIMEOUT || 4000);

// Resolve to true only if it can actually reach the wider internet, so the
// kiosk can show its offline screen when the connection drops
function checkInternet() {
  return new Promise((resolve) => {
    const req = https.get(HEALTH_URL, { timeout: HEALTH_TIMEOUT }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// Check the kiosk page polls to detect server/network loss. Reaching
// this handler proves the local server is up, so the result depends on whether
// the internet itself is reachable. Returns 503 when it isn't, which flips the
// page's offline overlay on via `res.ok`.
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    checkInternet().then((online) => {
      res.writeHead(online ? 200 : 503, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(JSON.stringify({ ok: online, time: new Date().toISOString() }));
    });
    return;
  }

  // Resolve the request to a file inside PUBLIC_DIR
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, relPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  sendFile(res, filePath);
});

// Listen on the port
server.listen(PORT, HOST, () => {
  console.log(`Kiosk demo server running at http://localhost:${PORT}`);
});
