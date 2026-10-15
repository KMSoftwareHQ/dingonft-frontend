const assert = require('node:assert/strict');
const test = require('node:test');

process.env.DISCORD_WEBHOOK_URL = 'https://discord.invalid/webhook';
const { notify, buildPayload, formatPrice } = require('../discord');

const address = 'DQm6RjBfsjS6hzoDiA158CTLPRudkikXiq';
const buyer = 'DTmNGunrovHSyyNfgKw787BsauaZGdCTr9';
const seller = 'DDDXBzk6F46RCLNG4jg1fcbwPcM4oUkX7A';
const txid = 'ab'.repeat(32);

test('buy payload shows price, both parties, and links', () => {
  const payload = buildPayload({ kind: 'buy', address, txid, price: '150000000', seller, buyer, name: 'Alpha Dingo' });
  const [embed] = payload.embeds;

  assert.equal(embed.title, 'Sold: Alpha Dingo');
  assert.equal(embed.url, `https://nft.dingocoin.com/nft/${address}`);
  assert.deepEqual(
    embed.fields.map((f) => f.name),
    ['Price', 'Seller', 'Buyer', 'Transaction']
  );
  assert.equal(embed.fields[0].value, '1.5 DINGO');
  assert.match(embed.fields[3].value, new RegExp(`explorer\\.dingocoin\\.com/tx/${txid}`));
  assert.match(embed.thumbnail.url, new RegExp(`dingo-nftc-0-preview/${address}\\.png$`));
});

test('user-controlled names cannot ping anyone or break the title', () => {
  const payload = buildPayload({ kind: 'list', address, txid, price: '100000000', owner: seller, name: '@everyone\nfree coins' });

  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.equal(payload.embeds[0].title, 'New listing: @everyone free coins');
});

test('falls back to a short address when the NFT has no name', () => {
  const payload = buildPayload({ kind: 'reprice', address, txid, price: '1', owner: seller, name: '' });
  assert.equal(payload.embeds[0].title, 'Price updated: DQm6Rj…kXiq');
});

test('a failing webhook is logged, never thrown', async (t) => {
  const log = t.mock.method(console, 'log', () => {});
  await notify(
    { kind: 'list', address, txid, price: '1', owner: seller },
    { fetchImpl: async () => { throw new Error('network down'); } }
  );
  await notify(
    { kind: 'list', address, txid, price: '1', owner: seller },
    { fetchImpl: async () => ({ ok: false, status: 429 }) }
  );
  assert.equal(log.mock.callCount(), 2);
});

test('formats prices for display', () => {
  const sat = (dingo) => {
    const [whole, fraction = ''] = dingo.split('.');
    return (BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'))).toString();
  };
  const cases = {
    '0.5': '0.5',
    '1111': '1,111',
    '1111.5': '1,111.5',
    '99999.99': '99,999.99',
    '100000': '100k',
    '333333': '333k',
    '999999': '1M',
    '1250000': '1.3M',
    '2000000': '2M',
    '999999999': '1B',
    '2500000000': '2.5B',
  };
  for (const [dingo, expected] of Object.entries(cases)) {
    assert.equal(formatPrice(sat(dingo)), expected, dingo);
  }
});
