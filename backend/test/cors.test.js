const test = require('node:test');
const assert = require('node:assert/strict');

const originalFrontendUrl = process.env.FRONTEND_URL;
process.env.FRONTEND_URL = 'http://lan.example:3009, http://archive.example:3009';
const { isAllowedOrigin } = require('../src/config/cors');
if (originalFrontendUrl === undefined) {
  delete process.env.FRONTEND_URL;
} else {
  process.env.FRONTEND_URL = originalFrontendUrl;
}

function checkOrigin(origin) {
  return new Promise((resolve, reject) => {
    isAllowedOrigin(origin, (error, allowed) => {
      if (error) reject(error);
      else resolve(allowed);
    });
  });
}

test('CORS allows local and comma-separated frontend origins', async () => {
  assert.equal(await checkOrigin('http://localhost:3009'), true);
  assert.equal(await checkOrigin('http://lan.example:3009'), true);
  assert.equal(await checkOrigin('http://archive.example:3009'), true);
  assert.equal(await checkOrigin(undefined), true);
});

test('CORS rejects origins outside the configured allowlist', async () => {
  await assert.rejects(checkOrigin('https://untrusted.example'));
});
