// Runs the real link server against a fake frontend, a fake API and a canary
// server, and checks that no request path can make it contact the canary.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { upstreamUrl } = require('../upstream-url');

const startServer = (name, receivedPaths) =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      receivedPaths.push(req.url);
      res.setHeader('content-type', 'text/plain');
      res.end(`${name}:${req.url}`);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const freePort = () =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

// Sends the request line exactly as written, so paths like "//host/x" and
// absolute-form targets reach the server without client-side normalisation.
const rawGet = (port, requestTarget) =>
  new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(`GET ${requestTarget} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
    });
    let response = '';
    socket.on('data', (chunk) => { response += chunk; });
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });

const frontendPaths = [];
const frontendV2Paths = [];
const apiPaths = [];
const canaryPaths = [];
let frontend;
let frontendV2;
let api;
let canary;
let link;
let linkPort;

before(async () => {
  frontend = await startServer('frontend', frontendPaths);
  frontendV2 = await startServer('frontend-v2', frontendV2Paths);
  api = await startServer('api', apiPaths);
  canary = await startServer('canary', canaryPaths);
  linkPort = await freePort();
  link = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'production',
      PORT: String(linkPort),
      FRONTEND_URL: `http://127.0.0.1:${frontend.address().port}`,
      FRONTEND_V2_URL: `http://127.0.0.1:${frontendV2.address().port}`,
      // A base path, so the test also covers requests that try to leave it.
      API_PROXY_URL: `http://127.0.0.1:${api.address().port}/v1`,
      FETCH_TIMEOUT_MS: '2000',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    link.stdout.on('data', (chunk) => { if (String(chunk).includes('Started')) resolve(); });
    link.on('exit', (code) => reject(new Error(`link exited with code ${code}`)));
  });
});

after(() => {
  link?.kill();
  frontend?.close();
  frontendV2?.close();
  api?.close();
  canary?.close();
});

test('normal file and API requests still reach their upstreams unchanged', async () => {
  const fileResponse = await rawGet(linkPort, '/assets/index-abc.js?v=1');
  assert.match(fileResponse, /frontend:\/assets\/index-abc\.js\?v=1/);
  const v2FileResponse = await rawGet(linkPort, '/v2/assets/index-def.js?v=2');
  assert.match(v2FileResponse, /frontend-v2:\/v2\/assets\/index-def\.js\?v=2/);
  const apiResponse = await rawGet(linkPort, '/api/nft/get?address=abc');
  assert.match(apiResponse, /api:\/v1\/nft\/get\?address=abc/);
});

test('no request path makes the edge contact another host', async () => {
  const canaryHost = `127.0.0.1:${canary.address().port}`;
  const attacks = [
    `//${canaryHost}/x.js`,
    `/\\${canaryHost}/x.js`,
    `http://${canaryHost}/x.js`,
    `/v2//${canaryHost}/x.js`,
    `/v2/\\${canaryHost}/x.js`,
    `/api/http://${canaryHost}/`,
    `/api//${canaryHost}/`,
    `/api/\\\\${canaryHost}/`,
    `/api/http:${canaryHost}/`,
    `http://${canaryHost}/api/x`,
  ];
  for (const requestTarget of attacks) {
    const receivedBefore = frontendPaths.length + frontendV2Paths.length + apiPaths.length;
    await rawGet(linkPort, requestTarget);
    // The request was proxied, just to the intended upstream.
    assert.equal(frontendPaths.length + frontendV2Paths.length + apiPaths.length, receivedBefore + 1, requestTarget);
  }
  assert.deepEqual(canaryPaths, []);
  // Each attack stayed on the intended upstream as an ordinary path.
  assert.ok(frontendPaths.some((receivedPath) => receivedPath === `/${canaryHost}/x.js`));
  assert.ok(frontendV2Paths.some((receivedPath) => receivedPath === `/v2//${canaryHost}/x.js`));
  assert.ok(apiPaths.some((receivedPath) => receivedPath === `/v1/http://${canaryHost}/`));
});

test('a path that climbs out of the upstream base path gets 400', async () => {
  const response = await rawGet(linkPort, '/api/../admin');
  assert.match(response, /^HTTP\/1\.1 400 /);
});

test('upstreamUrl keeps the upstream origin and base path', () => {
  assert.throws(() => upstreamUrl('http://provider:3000/v1', '/../admin'), { status: 400 });
  assert.throws(() => upstreamUrl('http://provider:3000/v1', '/%2e%2e/admin'), { status: 400 });
  assert.equal(upstreamUrl('http://provider:3000/v1', '/a/../b').href, 'http://provider:3000/v1/b');
  assert.equal(upstreamUrl('http://provider:3000', '/nft/get?a=1').href, 'http://provider:3000/nft/get?a=1');
  assert.equal(upstreamUrl('http://provider:3000/base/', '//evil/x').href, 'http://provider:3000/base/evil/x');
  assert.equal(upstreamUrl('http://frontend:8080', 'http://evil:9229/json').href, 'http://frontend:8080/http://evil:9229/json');
  assert.equal(upstreamUrl('http://frontend:8080', '/').href, 'http://frontend:8080/');
});
