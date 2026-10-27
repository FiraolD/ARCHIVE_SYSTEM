const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePagination } = require('../src/utils/pagination');

test('uses defaults when pagination values are absent', () => {
  assert.deepEqual(normalizePagination(), { page: 1, limit: 20, offset: 0 });
});

test('calculates offset for a valid page and limit', () => {
  assert.deepEqual(normalizePagination({ page: '3', limit: '25' }), {
    page: 3,
    limit: 25,
    offset: 50,
  });
});

test('falls back for invalid, fractional, zero, and negative values', () => {
  assert.deepEqual(normalizePagination({ page: '-2', limit: '2.5' }), {
    page: 1,
    limit: 20,
    offset: 0,
  });
  assert.deepEqual(normalizePagination({ page: '0', limit: '0' }), {
    page: 1,
    limit: 20,
    offset: 0,
  });
  assert.deepEqual(normalizePagination({ page: 'abc', limit: 'NaN' }), {
    page: 1,
    limit: 20,
    offset: 0,
  });
});

test('caps the page size at 200', () => {
  assert.deepEqual(normalizePagination({ page: 2, limit: 5000 }), {
    page: 2,
    limit: 200,
    offset: 200,
  });
});

test('avoids unsafe integer offsets', () => {
  assert.deepEqual(normalizePagination({ page: Number.MAX_SAFE_INTEGER, limit: 200 }), {
    page: 1,
    limit: 200,
    offset: 0,
  });
});
