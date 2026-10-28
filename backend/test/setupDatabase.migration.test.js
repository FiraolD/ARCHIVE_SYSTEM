'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { setupDatabase } = require('../src/scripts/setupDatabase');

const connectionString = process.env.TEST_DATABASE_URL;

test('database setup is repeatable and preserves existing schema and records', {
  skip: !connectionString && 'Set TEST_DATABASE_URL to run PostgreSQL migration tests',
}, async (t) => {
  const adminPool = new Pool({ connectionString, max: 2 });
  const schema = `setup_migration_it_${randomUUID().replace(/-/g, '')}`;
  const seedEnv = {
    SEED_ADMIN_PASSWORD: 'admin-integration-password-2026',
    SEED_AGENT_PASSWORD: 'agent-integration-password-2026',
  };
  const logger = { log() {}, error() {} };

  async function runSetup(env) {
    const dbPool = new Pool({
      connectionString,
      max: 2,
      options: `-c search_path=${schema}`,
    });
    await setupDatabase({ dbPool, env, logger });
  }

  try {
    await adminPool.query(`CREATE SCHEMA "${schema}"`);

    await runSetup(seedEnv);

    const initial = await adminPool.query(
      `SELECT
        (SELECT count(*)::int FROM "${schema}".users) AS users,
        (SELECT count(*)::int FROM "${schema}".branches) AS branches,
        (SELECT count(*)::int FROM "${schema}".departments) AS departments,
        (SELECT count(*)::int FROM "${schema}".products) AS products`,
    );
    assert.equal(initial.rows[0].users, 2);
    assert.ok(initial.rows[0].branches > 0);
    assert.ok(initial.rows[0].departments > 0);
    assert.ok(initial.rows[0].products > 0);

    const preservedUser = await adminPool.query(
      `INSERT INTO "${schema}".users (name, email, password_hash, role)
       VALUES ('Migration Test User', 'migration-preserved@example.test', 'not-a-login-credential', 'Viewer')
       RETURNING id`,
    );
    await adminPool.query(
      `INSERT INTO "${schema}".branches (name, code) VALUES ('Custom Test Branch', 'ITX')`,
    );

    // Existing seed accounts must not require seed passwords on later runs.
    await runSetup({});

    const after = await adminPool.query(
      `SELECT
        (SELECT count(*)::int FROM "${schema}".users) AS users,
        (SELECT count(*)::int FROM "${schema}".branches) AS branches,
        (SELECT count(*)::int FROM "${schema}".departments) AS departments,
        (SELECT count(*)::int FROM "${schema}".products) AS products,
        (SELECT count(*)::int FROM "${schema}".users WHERE id = $1) AS preserved_user,
        (SELECT count(*)::int FROM "${schema}".branches WHERE code = 'ITX') AS preserved_branch,
        (SELECT count(*)::int FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = $2 AND t.typname IN
            ('user_role', 'file_type', 'file_status', 'request_status', 'notification_type')) AS enum_count`,
      [preservedUser.rows[0].id, schema],
    );

    assert.deepEqual(
      {
        users: after.rows[0].users,
        branches: after.rows[0].branches,
        departments: after.rows[0].departments,
        products: after.rows[0].products,
      },
      {
        users: initial.rows[0].users + 1,
        branches: initial.rows[0].branches + 1,
        departments: initial.rows[0].departments,
        products: initial.rows[0].products,
      },
    );
    assert.equal(after.rows[0].preserved_user, 1);
    assert.equal(after.rows[0].preserved_branch, 1);
    assert.equal(after.rows[0].enum_count, 5);
  } finally {
    await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminPool.end();
  }
});
