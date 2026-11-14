'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const databasePath = require.resolve('../src/config/database');
const notificationPath = require.resolve('../src/services/notificationService');
const controllerPath = require.resolve('../src/controllers/documentController');
const originalDatabaseModule = require.cache[databasePath];
const originalNotificationModule = require.cache[notificationPath];

function installController({ failDocumentInsert = false } = {}) {
  const statements = [];
  let documentInsertParams;
  const document = {
    id: randomUUID(),
    archive_reference_number: 'AI/TST/001/26',
    file_path: '/private/path/should-not-be-returned.pdf',
  };
  const database = {
    async query(sql, params) {
      statements.push(sql);
      return { rows: [] };
    },
    async withTransaction(callback) {
      const client = {
        async query(sql, params) {
          statements.push(sql);
          if (sql.includes('SELECT code FROM branches')) {
            return { rows: [{ code: 'TST' }] };
          }
          if (sql.includes('SELECT COALESCE(')) {
            return { rows: [{ max_seq: 0 }] };
          }
          if (sql.includes('INSERT INTO documents')) {
            if (failDocumentInsert) throw new Error('simulated database failure');
            documentInsertParams = params;
            return { rows: [document] };
          }
          return { rows: [] };
        },
      };
      return callback(client);
    },
  };

  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: database,
  };
  require.cache[notificationPath] = {
    id: notificationPath,
    filename: notificationPath,
    loaded: true,
    exports: { sendToUser: async () => {} },
  };
  delete require.cache[controllerPath];

  return {
    controller: require(controllerPath),
    statements,
    getDocumentInsertParams: () => documentInsertParams,
  };
}

function restoreModules() {
  delete require.cache[controllerPath];
  if (originalDatabaseModule) require.cache[databasePath] = originalDatabaseModule;
  else delete require.cache[databasePath];
  if (originalNotificationModule) require.cache[notificationPath] = originalNotificationModule;
  else delete require.cache[notificationPath];
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function createUploadedFile(t) {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'archive-ingest-'));
  const filePath = path.join(directory, 'upload.pdf');
  const contents = Buffer.from('%PDF-1.4 test fixture');
  await fs.promises.writeFile(filePath, contents);
  t.after(async () => {
    await fs.promises.rm(directory, { recursive: true, force: true });
  });
  return {
    path: filePath,
    size: contents.length,
    mimetype: 'application/pdf',
  };
}

test('ingestion writes the canonical document file columns and retains the uploaded file', async (t) => {
  const { controller, statements, getDocumentInsertParams } = installController();
  t.after(restoreModules);
  const file = await createUploadedFile(t);
  const userId = randomUUID();
  const response = responseRecorder();

  await controller.ingestDocument({
    body: { branchId: randomUUID(), type: 'Claim File' },
    file,
    user: { id: userId, name: 'Test User' },
  }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(Object.hasOwn(response.body, 'file_path'), false);
  assert.ok(await fs.promises.stat(file.path));
  const insert = statements.find((sql) => sql.includes('INSERT INTO documents'));
  assert.match(insert, /file_path, file_size, file_mime,\s*owner_id/);
  assert.doesNotMatch(insert, /file_url|created_by/);
  assert.deepEqual(getDocumentInsertParams().slice(21, 25), [
    file.path,
    file.size,
    file.mimetype,
    userId,
  ]);
});

test('ingestion removes the uploaded file when required metadata is missing', async (t) => {
  const { controller } = installController();
  t.after(restoreModules);
  const file = await createUploadedFile(t);
  const response = responseRecorder();

  await controller.ingestDocument({ body: {}, file }, response);

  assert.equal(response.statusCode, 400);
  await assert.rejects(fs.promises.access(file.path), { code: 'ENOENT' });
});

test('ingestion removes the uploaded file when the database insert fails', async (t) => {
  const { controller } = installController({ failDocumentInsert: true });
  t.after(restoreModules);
  const file = await createUploadedFile(t);
  const response = responseRecorder();

  await controller.ingestDocument({
    body: { branchId: randomUUID(), type: 'Claim File' },
    file,
    user: { id: randomUUID(), name: 'Test User' },
  }, response);

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error, 'simulated database failure');
  await assert.rejects(fs.promises.access(file.path), { code: 'ENOENT' });
});
