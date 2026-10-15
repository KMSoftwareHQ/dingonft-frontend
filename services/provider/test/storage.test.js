const assert = require('node:assert/strict');
const test = require('node:test');

const storage = require('../storage');

const prefix = process.env.STORAGE_BUCKET_PREFIX || 'dingo-nftc-0';

// Records every command instead of talking to S3.
const stubClient = () => {
  const sent = [];
  storage.createClient({ send: async (command) => sent.push(command.input) });
  return sent;
};

test('uploads to public buckets are public-read', async () => {
  const sent = stubClient();
  await storage.uploadMeta('addr', { name: 'n' });
  await storage.uploadPreview('addr', Buffer.from('png'));
  await storage.uploadState('addr', { price: '1' });
  await storage.uploadProfile('owner', { name: 'n' });
  await storage.uploadCollection('handle', { title: 't' });

  assert.deepEqual(
    sent.map(({ Bucket, Key, ACL }) => ({ Bucket, Key, ACL })),
    [
      { Bucket: `${prefix}-meta`, Key: 'addr', ACL: 'public-read' },
      { Bucket: `${prefix}-preview`, Key: 'addr.png', ACL: 'public-read' },
      { Bucket: `${prefix}-state`, Key: 'addr', ACL: 'public-read' },
      { Bucket: `${prefix}-profile`, Key: 'owner', ACL: 'public-read' },
      { Bucket: `${prefix}-collection`, Key: 'handle', ACL: 'public-read' },
    ]
  );
  // Every bucket listed as public gets an upload above.
  assert.deepEqual(sent.map((input) => input.Bucket).sort(), [...storage.PUBLIC_BUCKETS].sort());
});

test('mutable objects are not cached', async () => {
  const sent = stubClient();
  await storage.uploadState('addr', {});
  await storage.uploadProfile('owner', {});
  await storage.uploadCollection('handle', {});
  assert.ok(sent.every((input) => input.CacheControl === 'max-age=0'));
});

test('content stays private', async () => {
  const sent = stubClient();
  await storage.uploadContent('addr', Buffer.from('hello'));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].Bucket, `${prefix}-content`);
  assert.equal(sent[0].ACL, undefined);
  assert.ok(!storage.PUBLIC_BUCKETS.includes(`${prefix}-content`));
});
