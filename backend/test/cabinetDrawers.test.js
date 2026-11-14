const test = require('node:test');
const assert = require('node:assert/strict');
const { createDrawerNumbers, DEFAULT_DRAWER_COUNT } = require('../src/utils/cabinetDrawers');

test('file boxes default to twelve sequential drawers', () => {
  assert.equal(DEFAULT_DRAWER_COUNT, 12);
  assert.deepEqual(createDrawerNumbers(), Array.from({ length: 12 }, (_, index) => String(index + 1)));
});

test('file boxes can be created with fewer sequential drawers', () => {
  assert.deepEqual(createDrawerNumbers(4), ['1', '2', '3', '4']);
});

test('drawer count rejects values outside the supported range', () => {
  for (const invalidCount of [0, 13, 2.5, '4']) {
    assert.throws(() => createDrawerNumbers(invalidCount), RangeError);
  }
});
