const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const setupDatabasePath = path.join(__dirname, '..', 'src', 'scripts', 'setupDatabase.js');
const setupDatabase = fs.readFileSync(setupDatabasePath, 'utf8');

test('file_requests schema includes requester_name used by request creation', () => {
  assert.match(
    setupDatabase,
    /CREATE TABLE IF NOT EXISTS file_requests[\s\S]*?requester_name VARCHAR\(150\)/,
    'new databases must create file_requests.requester_name'
  );
});

test('existing databases receive the requester_name compatibility migration', () => {
  assert.match(
    setupDatabase,
    /table: 'file_requests', column: 'requester_name', type: 'VARCHAR\(150\)'/,
    'existing databases must add file_requests.requester_name idempotently'
  );
});

test('request_status enum includes a distinct return verification state', () => {
  assert.match(
    setupDatabase,
    /name: 'request_status', values: \['Pending', 'Approved', 'Return Pending', 'Returned', 'Rejected', 'Overdue'\]/,
    'new and existing databases must support Return Pending requests'
  );
});

test('legacy unverified returns are migrated into the explicit verification state', () => {
  assert.match(
    setupDatabase,
    /UPDATE file_requests fr[\\s\\S]*?SET status = 'Return Pending'[\\s\\S]*?fr\.status = 'Returned'[\\s\\S]*?d\.status = 'Returned'/,
    'legacy requests with a Returned document must remain pending verification after upgrade'
  );
});
