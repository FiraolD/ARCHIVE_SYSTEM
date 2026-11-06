const test = require('node:test');
const assert = require('node:assert/strict');
const role = require('../src/middleware/role');

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

test('role middleware rejects missing authenticated user', () => {
  const req = {};
  const res = responseRecorder();
  let nextCalled = false;

  role('Admin')(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Authentication required' });
  assert.equal(nextCalled, false);
});

test('role middleware rejects a role not in the allowlist', () => {
  const req = { user: { role: 'Agent' } };
  const res = responseRecorder();
  let nextCalled = false;

  role('Admin', 'Manager')(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    error: 'Insufficient permissions',
    required: ['Admin', 'Manager'],
    actual: 'Agent',
  });
  assert.equal(nextCalled, false);
});

test('role middleware allows any explicitly permitted role', () => {
  for (const allowedRole of ['Admin', 'Manager']) {
    const req = { user: { role: allowedRole } };
    const res = responseRecorder();
    let nextCalled = false;

    role('Admin', 'Manager')(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true, `expected ${allowedRole} to pass`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, undefined);
  }
});

test('role middleware rejects an empty allowlist at configuration time', () => {
  assert.throws(() => role(), {
    message: 'role() requires at least one role',
  });
});
