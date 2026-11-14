const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { validateProductionEnvironment } = require('../src/config/validateEnvironment');

test('production requires a sufficiently long, non-placeholder JWT secret', () => {
  assert.throws(
    () => validateProductionEnvironment({ NODE_ENV: 'production' }),
    /JWT_SECRET must be/
  );
  assert.throws(
    () => validateProductionEnvironment({
      NODE_ENV: 'production',
      JWT_SECRET: 'short',
    }),
    /JWT_SECRET must be/
  );
  assert.throws(
    () => validateProductionEnvironment({
      NODE_ENV: 'production',
      JWT_SECRET: 'replace_with_a_long_random_production_secret',
    }),
    /JWT_SECRET must be/
  );
});

test('production accepts a configured long secret', () => {
  assert.doesNotThrow(
    () => validateProductionEnvironment({
      NODE_ENV: 'production',
      JWT_SECRET: randomBytes(48).toString('hex'),
    })
  );
});

test('non-production environments are not required to configure a production secret', () => {
  assert.doesNotThrow(
    () => validateProductionEnvironment({ NODE_ENV: 'test' })
  );
});
