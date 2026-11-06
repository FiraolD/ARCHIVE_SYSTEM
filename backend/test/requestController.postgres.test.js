const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

const connectionString = process.env.TEST_DATABASE_URL;
const REQUEST_ID = '10000000-0000-4000-8000-000000000001';
const DOCUMENT_ID = '20000000-0000-4000-8000-000000000001';
const USER_ID = '30000000-0000-4000-8000-000000000001';
const ADMIN_ID = '40000000-0000-4000-8000-000000000001';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('request controller return workflow works against PostgreSQL', {
  skip: !connectionString && 'Set TEST_DATABASE_URL to run PostgreSQL integration tests',
}, async (t) => {
  const adminPool = new Pool({ connectionString, max: 3 });
  const schema = `request_controller_it_${randomUUID().replace(/-/g, '')}`;
  const appPool = new Pool({
    connectionString,
    max: 3,
    options: `-c search_path=${schema}`,
  });
  const databasePath = require.resolve('../src/config/database');
  const controllerPath = require.resolve('../src/controllers/requestController');
  const originalDatabaseModule = require.cache[databasePath];
  let controller;

  try {
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    await adminPool.query(`
      CREATE TYPE "${schema}".request_status AS ENUM
        ('Pending', 'Approved', 'Return Pending', 'Returned', 'Rejected', 'Overdue');
      CREATE TYPE "${schema}".file_status AS ENUM
        ('Active', 'Checked-out', 'Settled Claims', 'Returned');
      CREATE TYPE "${schema}".notification_type AS ENUM ('info', 'warning', 'error', 'success');

      CREATE TABLE "${schema}".documents (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        archive_reference_number VARCHAR(50) NOT NULL,
        status "${schema}".file_status NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE "${schema}".file_requests (
        id UUID PRIMARY KEY,
        document_id UUID NOT NULL REFERENCES "${schema}".documents(id),
        requested_by UUID NOT NULL,
        request_date DATE NOT NULL,
        expected_return_date DATE NOT NULL,
        actual_return_date DATE,
        status "${schema}".request_status NOT NULL,
        request_reference VARCHAR(50) NOT NULL,
        rejection_reason TEXT,
        approved_by UUID,
        approved_at TIMESTAMP,
        processed_by UUID,
        processed_at TIMESTAMP
      );
      CREATE TABLE "${schema}".notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type "${schema}".notification_type NOT NULL,
        user_id UUID,
        related_id UUID,
        admin_only BOOLEAN DEFAULT FALSE
      );
      CREATE TABLE "${schema}".audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        user_name VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        details TEXT,
        ip_address INET,
        user_agent TEXT
      );
    `);

    const databaseStub = {
      query: (sql, params) => appPool.query(sql, params),
      withTransaction: async (callback) => {
        const client = await appPool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback(client);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      pool: appPool,
    };
    require.cache[databasePath] = {
      id: databasePath,
      filename: databasePath,
      loaded: true,
      exports: databaseStub,
    };
    delete require.cache[controllerPath];
    controller = require('../src/controllers/requestController');

    async function reset(requestStatus, documentStatus) {
      await appPool.query('DELETE FROM audit_logs');
      await appPool.query('DELETE FROM notifications');
      await appPool.query('DELETE FROM file_requests');
      await appPool.query('DELETE FROM documents');
      await appPool.query(
        'INSERT INTO documents (id, title, archive_reference_number, status) VALUES ($1, $2, $3, $4)',
        [DOCUMENT_ID, 'Integration Test File', 'ARCH-IT-001', documentStatus],
      );
      await appPool.query(
        `INSERT INTO file_requests
          (id, document_id, requested_by, request_date, expected_return_date, status, request_reference)
         VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + 7, $4, $5)`,
        [REQUEST_ID, DOCUMENT_ID, USER_ID, requestStatus, 'REQ-IT-001'],
      );
    }

    await t.test('requester return is persisted as pending and audited atomically', async () => {
      await reset('Approved', 'Checked-out');
      const res = responseRecorder();
      await controller.returnDocumentByRequester({
        params: { id: REQUEST_ID },
        user: { id: USER_ID, name: 'Integration Requester' },
        ip: '127.0.0.1',
        get: () => 'integration-test',
      }, res);

      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      const request = await appPool.query('SELECT status FROM file_requests WHERE id = $1', [REQUEST_ID]);
      const document = await appPool.query('SELECT status FROM documents WHERE id = $1', [DOCUMENT_ID]);
      const notifications = await appPool.query('SELECT count(*)::int AS count FROM notifications');
      const audits = await appPool.query('SELECT count(*)::int AS count FROM audit_logs');
      assert.equal(request.rows[0].status, 'Return Pending');
      assert.equal(document.rows[0].status, 'Returned');
      assert.equal(notifications.rows[0].count, 1);
      assert.equal(audits.rows[0].count, 1);
    });

    await t.test('admin verification reactivates the document and completes the request', async () => {
      await reset('Return Pending', 'Returned');
      const res = responseRecorder();
      await controller.returnDocument({
        params: { id: REQUEST_ID },
        user: { id: ADMIN_ID, name: 'Integration Admin' },
        ip: '127.0.0.1',
        get: () => 'integration-test',
      }, res);

      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      const request = await appPool.query('SELECT status FROM file_requests WHERE id = $1', [REQUEST_ID]);
      const document = await appPool.query('SELECT status FROM documents WHERE id = $1', [DOCUMENT_ID]);
      assert.equal(request.rows[0].status, 'Returned');
      assert.equal(document.rows[0].status, 'Active');
      assert.equal((await appPool.query('SELECT count(*)::int AS count FROM notifications')).rows[0].count, 1);
      assert.equal((await appPool.query('SELECT count(*)::int AS count FROM audit_logs')).rows[0].count, 1);
    });

    await t.test('audit failure rolls back both workflow state changes and notification', async () => {
      await reset('Approved', 'Checked-out');
      await appPool.query(`
        CREATE FUNCTION fail_integration_audit_insert() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'intentional audit failure for rollback test';
        END;
        $$ LANGUAGE plpgsql
      `);
      await appPool.query(`
        CREATE TRIGGER fail_integration_audit_insert
        BEFORE INSERT ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION fail_integration_audit_insert()
      `);

      try {
        const res = responseRecorder();
        await controller.returnDocumentByRequester({
          params: { id: REQUEST_ID },
          user: { id: USER_ID, name: 'Integration Requester' },
          ip: '127.0.0.1',
          get: () => 'integration-test',
        }, res);

        assert.equal(res.statusCode, 500);
        assert.equal((await appPool.query('SELECT status FROM file_requests WHERE id = $1', [REQUEST_ID])).rows[0].status, 'Approved');
        assert.equal((await appPool.query('SELECT status FROM documents WHERE id = $1', [DOCUMENT_ID])).rows[0].status, 'Checked-out');
        assert.equal((await appPool.query('SELECT count(*)::int AS count FROM notifications')).rows[0].count, 0);
        assert.equal((await appPool.query('SELECT count(*)::int AS count FROM audit_logs')).rows[0].count, 0);
      } finally {
        await appPool.query('DROP TRIGGER IF EXISTS fail_integration_audit_insert ON audit_logs');
        await appPool.query('DROP FUNCTION IF EXISTS fail_integration_audit_insert()');
      }
    });

    await t.test('admin rejection persists the reason and writes notification and audit rows', async () => {
      await reset('Pending', 'Active');
      const res = responseRecorder();
      await controller.rejectRequest({
        params: { id: REQUEST_ID },
        body: { reason: 'Required documentation is incomplete' },
        user: { id: ADMIN_ID, name: 'Integration Admin' },
        ip: '127.0.0.1',
        get: () => 'integration-test',
      }, res);

      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      const request = await appPool.query(
        'SELECT status, rejection_reason FROM file_requests WHERE id = $1',
        [REQUEST_ID],
      );
      const document = await appPool.query('SELECT status FROM documents WHERE id = $1', [DOCUMENT_ID]);
      assert.equal(request.rows[0].status, 'Rejected');
      assert.equal(request.rows[0].rejection_reason, 'Required documentation is incomplete');
      assert.equal(document.rows[0].status, 'Active');
      assert.equal((await appPool.query('SELECT count(*)::int AS count FROM notifications')).rows[0].count, 1);
      assert.equal((await appPool.query('SELECT count(*)::int AS count FROM audit_logs')).rows[0].count, 1);
    });

    await t.test('concurrent approval and rejection allow only one terminal decision', async () => {
      await reset('Pending', 'Active');
      const approveRes = responseRecorder();
      const rejectRes = responseRecorder();

      await Promise.all([
        controller.approveRequest({
          params: { id: REQUEST_ID },
          body: {},
          user: { id: ADMIN_ID, name: 'Integration Admin' },
          ip: '127.0.0.1',
          get: () => 'integration-test',
        }, approveRes),
        controller.rejectRequest({
          params: { id: REQUEST_ID },
          body: { reason: 'Concurrent decision test' },
          user: { id: ADMIN_ID, name: 'Integration Admin' },
          ip: '127.0.0.1',
          get: () => 'integration-test',
        }, rejectRes),
      ]);

      const outcomes = [approveRes.statusCode, rejectRes.statusCode].sort((a, b) => a - b);
      assert.deepEqual(outcomes, [200, 409]);
      const request = await appPool.query(
        'SELECT status, rejection_reason FROM file_requests WHERE id = $1',
        [REQUEST_ID],
      );
      const document = await appPool.query('SELECT status FROM documents WHERE id = $1', [DOCUMENT_ID]);
      const notificationCount = (await appPool.query('SELECT count(*)::int AS count FROM notifications')).rows[0].count;
      const auditCount = (await appPool.query('SELECT count(*)::int AS count FROM audit_logs')).rows[0].count;

      assert.ok(['Approved', 'Rejected'].includes(request.rows[0].status));
      assert.equal(notificationCount, 1);
      assert.equal(auditCount, 1);
      if (request.rows[0].status === 'Approved') {
        assert.equal(document.rows[0].status, 'Checked-out');
        assert.equal(approveRes.statusCode, 200);
        assert.equal(rejectRes.statusCode, 409);
      } else {
        assert.equal(document.rows[0].status, 'Active');
        assert.equal(rejectRes.statusCode, 200);
        assert.equal(approveRes.statusCode, 409);
      }
    });

  } finally {
    if (originalDatabaseModule) require.cache[databasePath] = originalDatabaseModule;
    else delete require.cache[databasePath];
    delete require.cache[controllerPath];
    try { await appPool.end(); } finally {
      try { await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await adminPool.end(); }
    }
  }
});
