const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWhere } = require('../src/utils/documentFilters');

test('returns an empty clause for no filters', () => {
  assert.deepEqual(buildWhere({}), { sql: '', params: [] });
});

test('uses parameterized conditions for text and exact-match filters', () => {
  const result = buildWhere({
    search: "x%' OR 1=1 --",
    type: 'claim',
    status: 'active',
    branch_id: '12',
  });

  assert.match(result.sql, /d\.title ILIKE \$1/);
  assert.match(result.sql, /d\.type = \$2/);
  assert.match(result.sql, /d\.status = \$3/);
  assert.match(result.sql, /d\.branch_id = \$4/);
  assert.deepEqual(result.params, ["%x%' OR 1=1 --%", 'claim', 'active', '12']);
  assert.equal(result.sql.includes("OR 1=1 --"), false);
});

test('adds range and legacy filters with expected parameter order', () => {
  const result = buildWhere({
    date_of_accident_from: '2026-01-01',
    date_of_accident_to: '2026-12-31',
    sum_insured_min: '1000',
    sum_insured_max: '9000',
    legacy: 'true',
  });

  assert.deepEqual(result.params, ['2026-01-01', '2026-12-31', 1000, 9000]);
  assert.match(result.sql, /d\.date_of_accident >= \$1/);
  assert.match(result.sql, /d\.date_of_accident <= \$2/);
  assert.match(result.sql, /d\.sum_insured >= \$3/);
  assert.match(result.sql, /d\.sum_insured <= \$4/);
  assert.match(result.sql, /legacy_source.*IS NOT NULL/);
});

test('excludes selected filters when building facets', () => {
  const result = buildWhere({ type: 'claim', status: 'active', branch_id: '4' }, ['type', 'branch']);

  assert.equal(result.sql, 'WHERE d.status = $1');
  assert.deepEqual(result.params, ['active']);
});

test('supports both legacy true and false filters', () => {
  assert.match(buildWhere({ legacy: 'true' }).sql, /legacy_source.*IS NOT NULL/);
  assert.match(buildWhere({ legacy: 'false' }).sql, /legacy_source.*IS NULL/);
});
