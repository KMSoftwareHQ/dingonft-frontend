const assert = require('node:assert/strict');
const test = require('node:test');

const cryptoUtils = require('../cryptoUtils');

const privateKey = Buffer.from(
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  'hex'
);
const message = cryptoUtils.sha256(Buffer.from('dingonft compatibility'));

test('preserves Dingocoin key and address compatibility', () => {
  assert.equal(
    cryptoUtils.privateKeyToPublicKey(privateKey).toString('hex'),
    '036d6caac248af96f6afa7f904f550253a0f3ef3f5aa2fe6838a95b216691468e2'
  );
  assert.equal(
    cryptoUtils.privateKeyToAddress(privateKey),
    'DAhgxoRfxRGfSNajyoYY27MdW9M2bAfSfn'
  );

  const wif = cryptoUtils.toWif(privateKey);
  assert.equal(cryptoUtils.isWif(wif), true);
  assert.deepEqual(cryptoUtils.fromWif(wif), privateKey);
});

test('preserves compact signatures and compressed public-key recovery', () => {
  const signature = cryptoUtils.sign(message, privateKey);
  assert.equal(
    signature.toString('hex'),
    'db687e256defdab28ad05e8cc3207d295321d23245300e0fcd23d90fe438dc0f4feb17266e0ba4c63bb67bc3c47efbf0ef50c2b0d3e1dee284f7de3032c85920'
  );
  assert.equal(
    cryptoUtils.verify(
      message,
      signature,
      cryptoUtils.privateKeyToPublicKey(privateKey)
    ),
    true
  );
  assert.deepEqual(
    cryptoUtils.recover(message, signature).map((key) => key.toString('hex')),
    [
      '02220bd1353a342d6cb091745fd9ec7247d3cf4ae2e3f8723c4576dd0c280cdf9f',
      '036d6caac248af96f6afa7f904f550253a0f3ef3f5aa2fe6838a95b216691468e2',
    ]
  );
});
