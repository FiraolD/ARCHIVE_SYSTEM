const DEFAULT_DRAWER_COUNT = 12;

function createDrawerNumbers(drawerCount = DEFAULT_DRAWER_COUNT) {
  if (!Number.isInteger(drawerCount) || drawerCount < 1 || drawerCount > DEFAULT_DRAWER_COUNT) {
    throw new RangeError(`Drawer count must be an integer between 1 and ${DEFAULT_DRAWER_COUNT}`);
  }

  return Array.from({ length: drawerCount }, (_, index) => String(index + 1));
}

module.exports = { createDrawerNumbers, DEFAULT_DRAWER_COUNT };
