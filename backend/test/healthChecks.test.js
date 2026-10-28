const test = require('node:test');
const assert = require('node:assert/strict');
const { createHealthChecks } = require('../src/utils/healthChecks');

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('liveness succeeds without querying the database', () => {
  let queryCalls = 0;
  const checks = createHealthChecks({
    query: async () => { queryCalls += 1; },
    now: () => new Date('2026-01-02T03:04:05.000Z'),
  });
  const res = responseRecorder();

  checks.liveness({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'OK');
  assert.equal(res.body.timestamp, '2026-01-02T03:04:05.000Z');
  assert.equal(queryCalls, 0);
});

test('readiness succeeds when PostgreSQL responds', async () => {
  const calls = [];
  const checks = createHealthChecks({
    query: async (...args) => { calls.push(args); },
    now: () => new Date('2026-01-02T03:04:05.000Z'),
  });
  const res = responseRecorder();

  await checks.readiness({}, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [['SELECT 1 as connected']]);
  assert.deepEqual(res.body.database, { connected: true });
});

test('readiness returns 503 and does not leak database errors', async () => {
  const checks = createHealthChecks({
    query: async () => { throw new Error('secret-host:5432 password=private'); },
    now: () => new Date('2026-01-02T03:04:05.000Z'),
  });
  const res = responseRecorder();

  await checks.readiness({}, res);

  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body.database, { connected: false });
  assert.equal(JSON.stringify(res.body).includes('private'), false);
  assert.equal(JSON.stringify(res.body).includes('secret-host'), false);
});

test('health-check factory requires a query function', () => {
  assert.throws(() => createHealthChecks({}), /requires a query function/);
});
