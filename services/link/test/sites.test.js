// Runs the real link server the way production serves the redesigned
// frontend: it is FRONTEND_URL at the root, the previous frontend is at /v1/,
// and old /v2/ links redirect to the root.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const startServer = (name, receivedPaths) =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      receivedPaths.push(req.url);
      res.setHeader('content-type', 'text/html');
      res.end(`<title>%%_OG_TITLE_%%</title>${name}:${req.url}`);
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

// Sends the request line exactly as written and returns the status line,
// headers (lower-cased names) and body.
const rawGet = (port, requestTarget) =>
  new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(`GET ${requestTarget} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
    });
    let response = '';
    socket.on('data', (chunk) => { response += chunk; });
    socket.on('end', () => {
      const [head, ...bodyParts] = response.split('\r\n\r\n');
      const [statusLine, ...headerLines] = head.split('\r\n');
      const headers = Object.fromEntries(headerLines.map((line) => {
        const separator = line.indexOf(':');
        return [line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim()];
      }));
      resolve({ status: Number(statusLine.split(' ')[1]), headers, body: bodyParts.join('\r\n\r\n') });
    });
    socket.on('error', reject);
  });

const mainPaths = [];
const v1Paths = [];
let mainFrontend;
let v1Frontend;
let link;
let linkPort;

before(async () => {
  mainFrontend = await startServer('main', mainPaths);
  v1Frontend = await startServer('v1', v1Paths);
  linkPort = await freePort();
  link = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'production',
      PORT: String(linkPort),
      ROOT_PATH: 'https://nft.example',
      LOGO: 'https://nft.example/og-image.jpg',
      FRONTEND_URL: `http://127.0.0.1:${mainFrontend.address().port}`,
      FRONTEND_V1_URL: `http://127.0.0.1:${v1Frontend.address().port}`,
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
  mainFrontend?.close();
  v1Frontend?.close();
});

test('the main frontend serves the root and is indexable', async () => {
  mainPaths.length = 0;
  const page = await rawGet(linkPort, '/nfts');
  assert.equal(page.status, 200);
  assert.match(page.body, /<title>Explore NFTs<\/title>main:\//);
  assert.equal(page.headers['x-robots-tag'], undefined);
  const file = await rawGet(linkPort, '/assets/index-abc.js');
  assert.match(file.body, /main:\/assets\/index-abc\.js/);
  assert.deepEqual(mainPaths, ['/', '/assets/index-abc.js']);
});

test('the previous frontend serves /v1/ with noindex', async () => {
  v1Paths.length = 0;
  const page = await rawGet(linkPort, '/v1/nfts');
  assert.equal(page.status, 200);
  assert.match(page.body, /<title>Explore NFTs<\/title>v1:\/v1\//);
  assert.equal(page.headers['x-robots-tag'], 'noindex');
  const file = await rawGet(linkPort, '/v1/assets/index-def.js');
  assert.match(file.body, /v1:\/v1\/assets\/index-def\.js/);
  assert.deepEqual(v1Paths, ['/v1/', '/v1/assets/index-def.js']);
});

test('old /v2/ links redirect to the same page at the root', async () => {
  const expectedLocations = {
    '/v2': '/',
    '/v2/': '/',
    '/v2/nft/abc?ref=tweet': '/nft/abc?ref=tweet',
    '/v2/collections/top': '/collections/top',
    'http://other.example/v2/nfts?q=1': '/nfts?q=1',
  };
  for (const [requestTarget, location] of Object.entries(expectedLocations)) {
    const response = await rawGet(linkPort, requestTarget);
    assert.equal(response.status, 302, requestTarget);
    assert.equal(response.headers.location, location, requestTarget);
  }
});

test('a /v2/ redirect never points at another site', async () => {
  for (const requestTarget of ['/v2//other.example/x', '/v2/\\other.example/x', '/v2/%5Cother.example/x', '/v2///\\/other.example']) {
    const response = await rawGet(linkPort, requestTarget);
    assert.equal(response.status, 302, requestTarget);
    const location = response.headers.location;
    assert.match(location, /^\/[^/\\]/, `${requestTarget} -> ${location}`);
    assert.equal(new URL(location, 'https://nft.example').host, 'nft.example', `${requestTarget} -> ${location}`);
  }
});
