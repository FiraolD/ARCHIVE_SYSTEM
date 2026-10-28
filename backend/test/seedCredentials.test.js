'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getRequiredSeedPassword,
  MIN_SEED_PASSWORD_LENGTH,
} = require('../src/utils/seedCredentials');

test('seed credential validation fails when the variable is missing', () => {
  assert.throws(
    () => getRequiredSeedPassword('SEED_ADMIN_PASSWORD', {}),
    /SEED_ADMIN_PASSWORD.*at least 16 characters/
  );
});

test('seed credential validation rejects short values', () => {
  assert.throws(
    () => getRequiredSeedPassword('SEED_AGENT_PASSWORD', {
      SEED_AGENT_PASSWORD: 'short',
    }),
    /SEED_AGENT_PASSWORD.*at least 16 characters/
  );
});

test('seed credential validation accepts an explicitly configured value of sufficient length', () => {
  const configuredValue = 'x'.repeat(MIN_SEED_PASSWORD_LENGTH);
  assert.equal(
    getRequiredSeedPassword('SEED_ADMIN_PASSWORD', {
      SEED_ADMIN_PASSWORD: configuredValue,
    }),
    configuredValue
  );
});
