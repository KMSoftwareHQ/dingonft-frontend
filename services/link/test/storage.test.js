// Runs the storage lookups against a fake object store and checks that a key
// taken from a request path can't reach another bucket or add a query string.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const receivedPaths = [];
let storageServer;
let storage;

before(async () => {
  storageServer = http.createServer((req, res) => {
    receivedPaths.push(req.url);
    res.statusCode = 404;
    res.end();
  });
  await new Promise((resolve) => storageServer.listen(0, '127.0.0.1', resolve));
  process.env.STORAGE_BASE = `http://127.0.0.1:${storageServer.address().port}`;
  process.env.STORAGE_BUCKET_PREFIX = 'test';
  storage = require('../storage');
});

after(() => storageServer?.close());

test('normal keys are looked up unchanged', async () => {
  receivedPaths.length = 0;
  await storage.getMeta('DAbc123');
  await storage.getProfile('DOwner456');
  await storage.getCollection('my_collection');
  assert.deepEqual(receivedPaths, ['/test-meta/DAbc123', '/test-profile/DOwner456', '/test-collection/my_collection']);
  assert.equal(storage.getPreviewLink('DAbc123'), `${process.env.STORAGE_BASE}/test-preview/DAbc123.png`);
});

test('keys cannot leave their bucket or add a query string', async () => {
  receivedPaths.length = 0;
  await storage.getMeta('../../other-bucket/secret');
  await storage.getProfile('../x');
  await storage.getCollection('x?list-type=2');
  assert.deepEqual(receivedPaths, [
    '/test-meta/..%2F..%2Fother-bucket%2Fsecret',
    '/test-profile/..%2Fx',
    '/test-collection/x%3Flist-type%3D2',
  ]);
  assert.equal(storage.getPreviewLink('../x'), `${process.env.STORAGE_BASE}/test-preview/..%2Fx.png`);
});
