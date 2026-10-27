const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

const connectionString = process.env.TEST_DATABASE_URL;

test('PostgreSQL prevents double checkout and rolls back failed workflow changes', {
  skip: !connectionString && 'Set TEST_DATABASE_URL to run PostgreSQL integration tests',
}, async (t) => {
  const pool = new Pool({ connectionString, max: 5 });
  const schema = `request_it_${randomUUID().replace(/-/g, '')}`;
  const qname = (table) => `"${schema}"."${table}"`;

  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(`CREATE TABLE ${qname('documents')} (id INTEGER PRIMARY KEY, status TEXT NOT NULL)`);
    await pool.query(`CREATE TABLE ${qname('requests')} (id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL, status TEXT NOT NULL)`);
    await pool.query(`INSERT INTO ${qname('documents')} (id, status) VALUES (1, 'Active')`);
    await pool.query(`INSERT INTO ${qname('requests')} (id, document_id, status) VALUES (1, 1, 'Pending'), (2, 1, 'Pending')`);

    await t.test('only one of two concurrent approvals can check out the same document', async () => {
      const clients = await Promise.all([pool.connect(), pool.connect()]);
      let releaseFirstLock;
      let firstHasLock;
      const lockReady = new Promise((resolve) => { firstHasLock = resolve; });
      const letFirstContinue = new Promise((resolve) => { releaseFirstLock = resolve; });

      try {
        await clients[0].query('BEGIN');
        await clients[0].query(`SELECT id FROM ${qname('requests')} WHERE id = 1 FOR UPDATE`);
        firstHasLock();

        const firstWork = (async () => {
          const update = await clients[0].query(
            `UPDATE ${qname('documents')} SET status = 'Checked-out' WHERE id = 1 AND status = 'Active' RETURNING id`
          );
          assert.equal(update.rowCount, 1);
          await clients[0].query(`UPDATE ${qname('requests')} SET status = 'Approved' WHERE id = 1 AND status = 'Pending'`);
          await letFirstContinue;
          await clients[0].query('COMMIT');
        })();

        await lockReady;
        await clients[1].query('BEGIN');
        await clients[1].query(`SELECT id FROM ${qname('requests')} WHERE id = 2 FOR UPDATE`);
        const secondUpdate = await clients[1].query(
          `UPDATE ${qname('documents')} SET status = 'Checked-out' WHERE id = 1 AND status = 'Active' RETURNING id`
        );
        assert.equal(secondUpdate.rowCount, 0, 'second request must not claim an already checked-out document');
        await clients[1].query('ROLLBACK');
        releaseFirstLock();
        await firstWork;

        const document = await pool.query(`SELECT status FROM ${qname('documents')} WHERE id = 1`);
        const requests = await pool.query(`SELECT id, status FROM ${qname('requests')} ORDER BY id`);
        assert.equal(document.rows[0].status, 'Checked-out');
        assert.deepEqual(requests.rows, [{ id: 1, status: 'Approved' }, { id: 2, status: 'Pending' }]);
      } finally {
        releaseFirstLock();
        clients.forEach((client) => client.release());
      }
    });

    await t.test('failed transaction rolls back document state and related request state', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`UPDATE ${qname('documents')} SET status = 'Active' WHERE id = 1`);
        await client.query(`UPDATE ${qname('requests')} SET status = 'Returned' WHERE id = 1`);
        await client.query('ROLLBACK');

        const document = await client.query(`SELECT status FROM ${qname('documents')} WHERE id = 1`);
        const request = await client.query(`SELECT status FROM ${qname('requests')} WHERE id = 1`);
        assert.equal(document.rows[0].status, 'Checked-out');
        assert.equal(request.rows[0].status, 'Approved');
      } finally {
        client.release();
      }
    });
  } finally {
    try { await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await pool.end(); }
  }
});
