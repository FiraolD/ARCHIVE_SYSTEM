const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const controllerPath = require.resolve('../src/controllers/reportsController');
const originalDatabaseModule = require.cache[databasePath];

function installDatabaseStub() {
  const calls = [];
  const database = {
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (sql.includes('AS total_documents')) {
        return { rows: [{
          total_documents: '20', claim_files: '8', policy_documents: '5',
          circulars: '3', correspondence: '2', billing: '2',
          active_documents: '12', checked_out_documents: '3',
          settled_claims: '2', returned_documents: '3',
        }] };
      }
      if (sql.includes('total_storage_bytes')) return { rows: [{ total_storage_bytes: '1073741824' }] };
      if (sql.includes('average_return_days')) {
        return { rows: [{
          total_requests: '10', pending_requests: '2', approved_requests: '3',
          return_pending_requests: '1', returned_requests: '2', rejected_requests: '1',
          overdue_requests: '1', average_return_days: '4.5',
        }] };
      }
      if (sql.includes('AS total_users')) {
        return { rows: [{ total_users: '6', admins: '1', file_clerks: '1', agents: '3', viewers: '1' }] };
      }
      if (sql.includes('AS total_branches')) return { rows: [{ total_branches: '4' }] };
      if (sql.includes('AS total_departments')) return { rows: [{ total_departments: '5' }] };
      if (sql.includes('month_start')) {
        return { rows: [{ month: 'Jan', year: 2026, document_count: '5', claim_count: '2', policy_count: '1' }] };
      }
      if (sql.includes('AS name, COUNT(*)')) {
        return { rows: [{ name: 'Claims', count: '7' }] };
      }
      if (sql.includes('UNION ALL')) {
        return { rows: [{ id: 'item-1', description: 'Recent file', category: 'Policy', occurred_at: '2026-01-03T00:00:00.000Z' }] };
      }
      throw new Error(`Unexpected report query: ${sql}`);
    },
  };
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: database,
  };
  delete require.cache[controllerPath];
  return { calls, controller: require('../src/controllers/reportsController') };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('report stats apply and return a requested date range', async (t) => {
  const stub = installDatabaseStub();
  t.after(() => {
    if (originalDatabaseModule) require.cache[databasePath] = originalDatabaseModule;
    else delete require.cache[databasePath];
    delete require.cache[controllerPath];
  });
  const response = responseRecorder();

  await stub.controller.getReportStats({
    query: { startDate: '2026-01-01', endDate: '2026-01-31' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.range, {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    period: '6months',
  });
  assert.equal(response.body.summary.totalDocuments, 20);
  assert.equal(response.body.summary.totalRequests, 10);
  assert.equal(response.body.summary.requestFulfillmentRate, 50);
  assert.equal(response.body.summary.averageReturnDays, 4.5);
  assert.equal(response.body.breakdowns.departments[0].name, 'Claims');
  assert.equal(response.body.recentActivity[0].description, 'Recent file');

  const rangedQueries = stub.calls.filter(({ sql }) => /created_at >= \$1::date/.test(sql));
  assert.ok(rangedQueries.length >= 5);
  assert.ok(rangedQueries.every(({ params }) => (
    params[0] === '2026-01-01' && params[1] === '2026-01-31'
  )));
});

test('report stats reject invalid and reversed custom ranges before querying', async (t) => {
  const stub = installDatabaseStub();
  t.after(() => {
    if (originalDatabaseModule) require.cache[databasePath] = originalDatabaseModule;
    else delete require.cache[databasePath];
    delete require.cache[controllerPath];
  });

  for (const query of [
    { startDate: '2026-02-31', endDate: '2026-03-01' },
    { startDate: '2026-03-02', endDate: '2026-03-01' },
  ]) {
    const response = responseRecorder();
    await stub.controller.getReportStats({ query }, response);
    assert.equal(response.statusCode, 400);
  }
  assert.equal(stub.calls.length, 0);
});
