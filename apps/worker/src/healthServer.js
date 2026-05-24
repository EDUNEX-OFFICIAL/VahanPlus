import http from 'node:http';

/** @type {http.Server | null} */
let server = null;
let ready = false;
/** @type {number | null} */
let lastJobAt = null;

export function markWorkerReady() {
  ready = true;
}

export function markJobActivity() {
  lastJobAt = Date.now();
}

export function startHealthServer() {
  const port = Number(process.env.HEALTH_PORT || 8080);
  server = http.createServer((req, res) => {
    if (req.url !== '/healthz' && req.url !== '/health') {
      res.writeHead(404);
      res.end();
      return;
    }
    const ok = ready;
    res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: ok ? 'ok' : 'not_ready',
        service: 'worker',
        lastJobAt,
      }),
    );
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`Worker health on :${port}/healthz`);
  });
}

export function stopHealthServer() {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}
