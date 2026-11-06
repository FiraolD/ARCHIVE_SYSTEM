'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { seedData } = require('../src/scripts/setupDatabase');

test('database seeding fails closed before creating an account without configured credentials', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT 1 FROM users')) return { rowCount: 0, rows: [] };
      throw new Error('Unexpected query after missing seed credential');
    },
  };

  await assert.rejects(
    seedData(client, {}),
    /Cannot seed Admin account: Cannot seed account: set SEED_ADMIN_PASSWORD to a unique password of at least 16 characters/
  );

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /SELECT 1 FROM users/);
  assert.equal(queries.some(({ sql }) => /INSERT INTO users/i.test(sql)), false);
});

test('existing seed accounts do not require seed passwords', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT 1 FROM users')) return { rowCount: 1, rows: [{ '?column?': 1 }] };
      if (sql.includes('SELECT COUNT(*) FROM branches')) return { rowCount: 1, rows: [{ count: '1' }] };
      if (sql.includes('SELECT COUNT(*) FROM departments')) return { rowCount: 1, rows: [{ count: '1' }] };
      if (sql.includes('SELECT COUNT(*) FROM products')) return { rowCount: 1, rows: [{ count: '1' }] };
      throw new Error('Unexpected query while existing seed data is present');
    },
  };

  await seedData(client, {});

  const accountLookups = queries.filter(({ sql }) => sql.includes('SELECT 1 FROM users'));
  assert.equal(accountLookups.length, 2);
  assert.equal(queries.some(({ sql }) => /INSERT INTO users/i.test(sql)), false);
  assert.equal(queries.some(({ sql }) => /INSERT INTO (branches|departments|products)/i.test(sql)), false);
});
