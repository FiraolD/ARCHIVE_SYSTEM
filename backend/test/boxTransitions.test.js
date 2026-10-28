const test = require('node:test');
const assert = require('node:assert/strict');
const { allowedFor } = require('../src/utils/boxTransitions');

test('Draft can only be packed by Admin or Manager', () => {
  assert.deepEqual(allowedFor('Draft', 'Admin'), ['Packed']);
  assert.deepEqual(allowedFor('Draft', 'Manager'), ['Packed']);
  assert.deepEqual(allowedFor('Draft', 'Agent'), []);
});

test('Manager cannot perform Admin-only reversals or dissolution', () => {
  assert.deepEqual(allowedFor('Packed', 'Manager'), ['In Transit']);
  assert.deepEqual(allowedFor('In Transit', 'Manager'), ['Archived']);
  assert.deepEqual(allowedFor('Archived', 'Manager'), []);
});

test('Admin can perform permitted lifecycle reversals', () => {
  assert.deepEqual(allowedFor('Packed', 'Admin'), ['In Transit', 'Draft']);
  assert.deepEqual(allowedFor('In Transit', 'Admin'), ['Archived', 'Packed']);
  assert.deepEqual(allowedFor('Archived', 'Admin'), ['Dissolved', 'In Transit']);
});

test('Dissolved is terminal and unknown states have no transitions', () => {
  assert.deepEqual(allowedFor('Dissolved', 'Admin'), []);
  assert.deepEqual(allowedFor('Unknown', 'Admin'), []);
});
