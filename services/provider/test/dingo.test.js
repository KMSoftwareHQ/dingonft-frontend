const assert = require('node:assert/strict');
const test = require('node:test');

const { fromSatoshi, toSatoshi } = require('../dingo');

test('converts decimal DINGO values to satoshis exactly', () => {
  assert.equal(toSatoshi('0'), '0');
  assert.equal(toSatoshi('1'), '100000000');
  assert.equal(toSatoshi('0.00000001'), '1');
  assert.equal(toSatoshi('1000000000000.12345678'), '100000000000012345678');
  assert.equal(toSatoshi('-1.5'), '-150000000');
});

test('rejects values that cannot be represented exactly', () => {
  assert.throws(() => toSatoshi('1.000000001'), /at most 8 decimal places/);
  assert.throws(() => toSatoshi('1e3'), /at most 8 decimal places/);
  assert.throws(() => toSatoshi(1), /Expected string input/);
});

test('converts satoshis to canonical decimal DINGO values', () => {
  assert.equal(fromSatoshi('0'), '0');
  assert.equal(fromSatoshi('1'), '0.00000001');
  assert.equal(fromSatoshi('100000000'), '1');
  assert.equal(fromSatoshi('150000000'), '1.5');
  assert.equal(fromSatoshi('-150000000'), '-1.5');
});
