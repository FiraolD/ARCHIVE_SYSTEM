const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Exercise the real Express controller with a deterministic transactional client.
// PostgreSQL locking and rollback semantics are covered separately by the
// requestWorkflow.postgres.test.js suite.
const databasePath = require.resolve('../src/config/database');
const originalDatabaseModule = require.cache[databasePath];

function makeHarness({ requestStatus = 'Approved', documentStatus = 'Checked-out', ownerId = 'user-1' } = {}) {
  const state = {
    request: { id: 'request-1', status: requestStatus, requested_by: ownerId, document_id: 'document-1',
      request_reference: 'REQ-001', title: 'Test file', archive_reference_number: 'ARCH-001' },
    document: { id: 'document-1', status: documentStatus },
    queries: [],
  };

  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      state.queries.push({ sql: normalized, params });
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rows: [], rowCount: null };
      }
      if (normalized.startsWith('SELECT fr.*, d.title, d.archive_reference_number, d.status AS document_status')) {
        if (params[0] !== state.request.id) return { rows: [], rowCount: 0 };
        return { rows: [{ ...state.request, document_status: state.document.status }], rowCount: 1 };
      }
      if (normalized.startsWith('SELECT fr.*, d.id AS document_id')) {
        if (params[1] !== state.request.requested_by || params[0] !== state.request.id) return { rows: [], rowCount: 0 };
        return { rows: [{ ...state.request, doc_status: state.document.status }], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE documents SET status = 'Returned'")) {
        if (state.document.status !== params[1]) return { rows: [], rowCount: 0 };
        state.document.status = 'Returned';
        return { rows: [{ id: state.document.id }], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE documents SET status = 'Active'")) {
        if (state.document.status !== params[1]) return { rows: [], rowCount: 0 };
        state.document.status = 'Active';
        return { rows: [{ id: state.document.id }], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE file_requests SET status = 'Return Pending'")) {
        if (state.request.status !== 'Approved') return { rows: [], rowCount: 0 };
        state.request.status = 'Return Pending';
        return { rows: [{ id: state.request.id }], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE file_requests SET status = 'Returned'")) {
        if (!['Approved', 'Return Pending'].includes(state.request.status)) return { rows: [], rowCount: 0 };
        state.request.status = 'Returned';
        return { rows: [{ id: state.request.id }], rowCount: 1 };
      }
      if (normalized.startsWith('INSERT INTO notifications') || normalized.startsWith('INSERT INTO audit_logs')) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error('Unexpected controller SQL in test harness: ' + normalized);
    },
  };

  const databaseStub = {
    query: async () => ({ rows: [], rowCount: 0 }),
    withTransaction: async (callback) => {
      const before = JSON.parse(JSON.stringify({ request: state.request, document: state.document }));
      try {
        return await callback(client);
      } catch (error) {
        state.request = before.request;
        state.document = before.document;
        throw error;
      }
    },
  };
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: databaseStub };
  delete require.cache[require.resolve('../src/controllers/requestController')];
  const controller = require('../src/controllers/requestController');
  return { controller, state, restore() {
    if (originalDatabaseModule) require.cache[databasePath] = originalDatabaseModule;
    else delete require.cache[databasePath];
    delete require.cache[require.resolve('../src/controllers/requestController')];
  } };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('requester return submission remains pending until an admin verifies it', async (t) => {
  const h = makeHarness();
  t.after(h.restore);
  const res = responseRecorder();
  await h.controller.returnDocumentByRequester({
    params: { id: 'request-1' },
    user: { id: 'user-1', name: 'Test Requester' },
    ip: '127.0.0.1',
    get: () => 'test-agent',
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(h.state.request.status, 'Return Pending');
  assert.equal(h.state.document.status, 'Returned');
  assert.match(res.body.message, /Awaiting admin verification/);
});

test('admin verification makes the document available and completes the request', async (t) => {
  const h = makeHarness({ requestStatus: 'Return Pending', documentStatus: 'Returned' });
  t.after(h.restore);
  const res = responseRecorder();
  await h.controller.returnDocument({
    params: { id: 'request-1' },
    user: { id: 'admin-1', name: 'Test Admin' },
    ip: '127.0.0.1',
    get: () => 'test-agent',
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(h.state.request.status, 'Returned');
  assert.equal(h.state.document.status, 'Active');
  assert.match(res.body.message, /successfully/);
});

test('requester cannot submit a return for a document that is not checked out', async (t) => {
  const h = makeHarness({ requestStatus: 'Approved', documentStatus: 'Active' });
  t.after(h.restore);
  const res = responseRecorder();
  await h.controller.returnDocumentByRequester({
    params: { id: 'request-1' },
    user: { id: 'user-1', name: 'Test Requester' },
    ip: '127.0.0.1',
    get: () => 'test-agent',
  }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(h.state.request.status, 'Approved');
  assert.equal(h.state.document.status, 'Active');
});
