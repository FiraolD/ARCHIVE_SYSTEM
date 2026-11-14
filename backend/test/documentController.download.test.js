'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { randomUUID } = require('node:crypto');

const databasePath = require.resolve('../src/config/database');
const controllerPath = require.resolve('../src/controllers/documentController');
const originalDatabaseModule = require.cache[databasePath];
const originalUploadDir = process.env.UPLOAD_DIR;

function installController(document) {
  const statements = [];
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: {
      async query(sql) {
        statements.push(sql);
        if (sql.includes('FROM documents')) {
          return { rows: document ? [document] : [] };
        }
        return { rows: [] };
      },
      async withTransaction() {
        throw new Error('Unexpected transaction');
      },
    },
  };
  delete require.cache[controllerPath];
  return { controller: require(controllerPath), statements };
}

function restoreModules() {
  delete require.cache[controllerPath];
  if (originalDatabaseModule) require.cache[databasePath] = originalDatabaseModule;
  else delete require.cache[databasePath];
  if (originalUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = originalUploadDir;
}

function createResponse() {
  const response = new PassThrough();
  const headers = new Map();
  response.statusCode = 200;
  response.jsonBody = null;
  response.setHeader = function setHeader(name, value) {
    headers.set(name.toLowerCase(), value);
    return this;
  };
  response.getHeader = (name) => headers.get(name.toLowerCase());
  response.status = function status(code) {
    this.statusCode = code;
    return this;
  };
  response.json = function json(body) {
    this.jsonBody = body;
    this.end(JSON.stringify(body));
    return this;
  };
  return response;
}

async function createStorage(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archive-download-'));
  const directory = path.join(root, 'documents');
  await fs.mkdir(directory);
  process.env.UPLOAD_DIR = root;
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
    restoreModules();
  });
  return directory;
}

test('document file download streams by ID without exposing the stored path', async (t) => {
  const directory = await createStorage(t);
  const storedPath = path.join(directory, 'stored-file.pdf');
  await fs.writeFile(storedPath, '%PDF-1.7 private document');
  const { controller, statements } = installController({
    archive_reference_number: 'AI/TST/001/26',
    file_path: storedPath,
  });
  const response = createResponse();
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    response.once('finish', resolve);
    response.once('error', reject);
  });

  await controller.downloadDocumentFile({
    params: { id: randomUUID() },
    user: { id: randomUUID(), name: 'Test User' },
  }, response);
  await finished;

  assert.equal(Buffer.concat(chunks).toString(), '%PDF-1.7 private document');
  assert.equal(response.getHeader('Content-Type'), 'application/octet-stream');
  assert.equal(response.getHeader('Content-Disposition'), 'attachment; filename="AI_TST_001_26.pdf"');
  assert.equal(response.getHeader('X-Content-Type-Options'), 'nosniff');
  assert.equal(statements.some((sql) => sql.includes('INSERT INTO audit_logs')), true);
});

test('document download returns not found for missing files and paths outside document storage', async (t) => {
  const directory = await createStorage(t);
  const outsidePath = path.join(path.dirname(directory), 'outside.pdf');
  await fs.writeFile(outsidePath, '%PDF-1.7 outside file');
  t.after(() => fs.rm(outsidePath, { force: true }));

  const { controller } = installController({
    archive_reference_number: 'AI/TST/002/26',
    file_path: outsidePath,
  });
  const response = createResponse();
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  await controller.downloadDocumentFile({ params: { id: randomUUID() } }, response);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.jsonBody, { error: 'Document file not found' });
});

test('document download returns not found when the record has no attached file', async (t) => {
  await createStorage(t);
  const { controller } = installController(null);
  const response = createResponse();

  await controller.downloadDocumentFile({ params: { id: randomUUID() } }, response);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.jsonBody, { error: 'Document file not found' });
});

test('document detail responses do not disclose the filesystem path', async (t) => {
  await createStorage(t);
  const { controller } = installController({
    id: randomUUID(),
    archive_reference_number: 'AI/TST/003/26',
    file_path: 'D:\\private\\archive\\stored-file.pdf',
  });
  const response = {
    body: null,
    json(body) { this.body = body; return this; },
    status(code) { this.statusCode = code; return this; },
  };

  await controller.getDocumentById({ params: { id: randomUUID() } }, response);

  assert.equal(Object.hasOwn(response.body, 'file_path'), false);
});
