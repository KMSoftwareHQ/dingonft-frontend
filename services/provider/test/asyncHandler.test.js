const assert = require('node:assert/strict');
const test = require('node:test');

const asyncHandler = require('../asyncHandler');

const fakeResponse = () => {
  const res = { headersSent: false };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    res.headersSent = true;
    return res;
  };
  return res;
};

test('returns a generic 500 without the stack trace', async (t) => {
  t.mock.method(console, 'log', () => {});
  const res = fakeResponse();
  await asyncHandler(async () => {
    throw new Error('secret detail at /app/database.js:42');
  })({}, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Internal server error' });
  assert.ok(!JSON.stringify(res.body).includes('secret detail'));
});

test('does not write a second response if one was already sent', async (t) => {
  t.mock.method(console, 'log', () => {});
  const res = fakeResponse();
  await asyncHandler(async (_req, r) => {
    r.status(200).json({ ok: true });
    throw new Error('after send');
  })({}, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
});
