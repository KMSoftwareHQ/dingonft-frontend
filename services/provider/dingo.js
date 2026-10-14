"use strict";

const fs = require('fs');
const os = require("os");

const DINGO_COOKIE_PATH = (process.env.DINGO_COOKIE_PATH || '/home/dingo/.dingocoin/.cookie').replace('~', os.homedir);
const DINGO_HOST = process.env.DINGO_RPC_HOST || 'localhost';
const DINGO_PORT = parseInt(process.env.DINGO_RPC_PORT || '34646');

module.exports = {
  toSatoshi,
  fromSatoshi,
  getBlockHash,
  getBlock,
  getRawTransaction,
  decodeRawTransaction,
  getBlockchainInfo,
  decodeRawTransaction,
  sendRawTransaction,
  getRawMempool,
  getTransaction,
  signRawTransaction
};

function toSatoshi(x) {
  if (x === null || x === undefined || typeof(x) !== 'string' || x === '') {
    throw new Error('Expected string input');
  }
  const match = x.match(/^([+-]?)(\d+)(?:\.(\d{1,8}))?$/);
  if (!match) {
    throw new Error('Expected a decimal string with at most 8 decimal places');
  }
  const [, sign, whole, fraction = ''] = match;
  const satoshis =
    BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, '0'));
  return (sign === '-' ? -satoshis : satoshis).toString();
}

function fromSatoshi(x) {
  if (x === null || x === undefined || typeof(x) !== 'string' || x === '') {
    throw new Error('Expected string input');
  }
  const value = BigInt(x);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100_000_000n;
  const fraction = (absolute % 100_000_000n)
    .toString()
    .padStart(8, '0')
    .replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

function getCookie() {
  const data = fs.readFileSync(DINGO_COOKIE_PATH, 'utf-8').split(':');
  return {user: data[0], password: data[1]};
}

async function callRpc(method, params) {
  const cookie = getCookie();
  const authorization = Buffer.from(`${cookie.user}:${cookie.password}`).toString('base64');
  const response = await fetch(
    `http://${DINGO_HOST}:${DINGO_PORT}`,
    {
      method: 'POST',
      headers: {
        authorization: `Basic ${authorization}`,
        'content-type': 'text/plain',
      },
      body: JSON.stringify({ jsonrpc: '1.0', method, params }),
    }
  );
  const body = await response.text();
  const result = JSON.parse(body
    .replace(/"(amount|value)":\s*(\-?)(\d+)\.((\d*?[1-9])0*),/g, '"$1":"$2$3\.$5",')
    .replace(/"(amount|value)":\s*(\-?)(\d+)\.0+,/g, '"$1":"$2$3",'));
  if (result.error) {
    throw result.error;
  }
  if (!response.ok) {
    throw new Error(`Dingocoin RPC returned HTTP ${response.status}`);
  }
  return result.result;
}

function getBlockHash(height) {
  return callRpc('getblockhash', [height]);
}

function getBlock(hash) {
  return callRpc('getblock', [hash]);
}

function getRawTransaction(hash) {
  return callRpc('getrawtransaction', [hash]);
}

function decodeRawTransaction(hex) {
  return callRpc('decoderawtransaction', [hex]);
}

function getBlockchainInfo() {
  return callRpc('getblockchaininfo', []);
}

function decodeRawTransaction(hex) {
  return callRpc('decoderawtransaction', [hex]);
}

function sendRawTransaction(hex) {
  return callRpc('sendrawtransaction', [hex]);
}

function getRawMempool() {
  return callRpc('getrawmempool', []);
}

function getTransaction(hash) {
  return callRpc('gettransaction', [hash]);
}

function signRawTransaction(hex, prevTxs, privKeys, sigHashType='ALL') {
  return callRpc('signrawtransaction', [hex, prevTxs, privKeys, sigHashType]);
}
