const assert = require('node:assert/strict');
const test = require('node:test');

// Replace pg with an in-memory fake so transaction handling can be tested
// without a Postgres server.
const log = [];
class FakeClient {
  constructor(id) {
    this.id = id;
    this.failRollback = false;
  }
  async query(text) {
    log.push(`client${this.id}: ${text}`);
    if (text === 'ROLLBACK' && this.failRollback) {
      throw new Error('connection lost');
    }
    return { rows: [] };
  }
  release(err) {
    log.push(`client${this.id}: release${err ? ' (destroy)' : ''}`);
  }
}
let nextClient = null;
class FakePool {
  constructor() {
    this.clients = 0;
  }
  on() {}
  async connect() {
    const client = new FakeClient(++this.clients);
    if (nextClient) {
      nextClient(client);
      nextClient = null;
    }
    return client;
  }
  async query(text) {
    log.push(`pool: ${text}`);
    return { rows: [] };
  }
}
require.cache[require.resolve('pg')] = {
  id: require.resolve('pg'),
  filename: require.resolve('pg'),
  loaded: true,
  exports: { Pool: FakePool },
};

const database = require('../database');

test.before(() => database.load());
test.beforeEach(() => {
  log.length = 0;
});

test('commits and routes queries inside a transaction to its client', async () => {
  const result = await database.transaction(async () => {
    await database.addTransaction({ address: 'a', owner: 'o', txid: 't', height: 1 });
    return 'done';
  });
  await database.hasTransaction('t');

  assert.equal(result, 'done');
  assert.deepEqual(log.map((l) => l.replace(/ \(address.*$/s, '')), [
    'client1: BEGIN',
    'client1: INSERT INTO transactions',
    'client1: COMMIT',
    'client1: release',
    'pool: SELECT 1 FROM transactions WHERE txid=$1 LIMIT 1',
  ]);
});

test('rolls back and releases the client when the body throws', async () => {
  await assert.rejects(
    database.transaction(async () => {
      await database.addTransaction({ address: 'a', owner: 'o', txid: 't', height: 1 });
      throw new Error('boom');
    }),
    /boom/
  );

  assert.deepEqual(log.slice(-2), ['client2: ROLLBACK', 'client2: release']);
  assert.ok(!log.includes('client2: COMMIT'));
});

test('destroys the client when rollback itself fails', async () => {
  nextClient = (client) => {
    client.failRollback = true;
  };
  await assert.rejects(
    database.transaction(async () => {
      throw new Error('boom');
    }),
    /boom/
  );

  assert.deepEqual(log.slice(-2), ['client3: ROLLBACK', 'client3: release (destroy)']);
});

test('queries after a failed transaction are not stuck in it', async () => {
  await assert.rejects(
    database.transaction(async () => {
      throw new Error('x');
    })
  );
  log.length = 0;
  await database.hasTransaction('t');

  assert.deepEqual(log, ['pool: SELECT 1 FROM transactions WHERE txid=$1 LIMIT 1']);
});

test('rejects nested transactions', async () => {
  await assert.rejects(
    database.transaction(() => database.transaction(async () => {})),
    /Nested database transactions/
  );
});
