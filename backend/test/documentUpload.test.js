'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const {
  createDocumentUpload,
  getMaximumFileSize,
  getUploadDirectory,
  isSupportedUploadMetadata,
  matchesFileSignature,
} = require('../src/middleware/documentUpload');

const validSignatures = [
  ['.pdf', Buffer.from('%PDF-1.7')],
  ['.jpg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
  ['.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ['.zip', Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  ['.doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
  ['.xlsx', Buffer.from([0x50, 0x4b, 0x05, 0x06])],
  ['.mp3', Buffer.from('ID3')],
  ['.wav', Buffer.from('RIFF0000WAVE')],
  ['.ogg', Buffer.from('OggS')],
  ['.flac', Buffer.from('fLaC')],
  ['.m4a', Buffer.from('0000ftypM4A ')],
  ['.mp4', Buffer.from('0000ftypisom')],
  ['.mov', Buffer.from('0000ftypqt  ')],
  ['.webm', Buffer.from([0x1a, 0x45, 0xdf, 0xa3])],
  ['.avi', Buffer.from('RIFF0000AVI ')],
  ['.mpeg', Buffer.from([0x00, 0x00, 0x01, 0xba])],
];

test('upload metadata accepts configured extension and MIME combinations only', () => {
  assert.equal(isSupportedUploadMetadata({
    originalname: 'claim.PDF',
    mimetype: 'application/pdf',
  }), true);
  assert.equal(isSupportedUploadMetadata({
    originalname: 'policy.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }), true);
  assert.equal(isSupportedUploadMetadata({
    originalname: 'claim.exe',
    mimetype: 'application/pdf',
  }), false);
  assert.equal(isSupportedUploadMetadata({
    originalname: 'claim.pdf',
    mimetype: 'image/png',
  }), false);
});

test('file-signature checks recognize supported formats and reject mismatches', () => {
  for (const [extension, signature] of validSignatures) {
    assert.equal(matchesFileSignature(extension, signature), true, extension);
    assert.equal(matchesFileSignature(extension, Buffer.from('not a matching file')), false, extension);
  }
});

test('upload size uses a positive byte limit and rejects invalid configuration', () => {
  assert.equal(getMaximumFileSize({ MAX_FILE_SIZE: '2048' }), 2048);
  assert.throws(() => getMaximumFileSize({ MAX_FILE_SIZE: '0' }), /positive integer/);
  assert.throws(() => getMaximumFileSize({ MAX_FILE_SIZE: 'invalid' }), /positive integer/);
});

test('document storage defaults outside the statically served uploads directory', () => {
  const uploadDirectory = getUploadDirectory({});
  const relative = path.relative(path.resolve(__dirname, '../uploads'), uploadDirectory);
  assert.ok(relative.startsWith('..'));
  assert.throws(
    () => getUploadDirectory({ UPLOAD_DIR: path.resolve(__dirname, '../uploads') }),
    /outside the publicly served uploads directory/
  );
});

async function startUploadServer(t, uploadDirectory, maximumFileSize = 1024) {
  const app = express();
  app.post(
    '/upload',
    createDocumentUpload({ uploadDirectory, maximumFileSize }),
    (req, res) => res.status(201).json({ filename: req.file.filename })
  );
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  return `http://127.0.0.1:${server.address().port}/upload`;
}

async function postUpload(url, fileName, mimeType, contents) {
  const form = new FormData();
  form.append('file', new Blob([contents], { type: mimeType }), fileName);
  return fetch(url, { method: 'POST', body: form });
}

test('upload stores accepted files with generated names and rejects invalid signatures and oversize files', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'archive-upload-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const url = await startUploadServer(t, directory, 16);

  const accepted = await postUpload(url, 'customer-claim.pdf', 'application/pdf', '%PDF-1.7 test');
  assert.equal(accepted.status, 201);
  const { filename } = await accepted.json();
  assert.match(filename, /^[0-9a-f-]{36}\.pdf$/i);
  assert.notEqual(filename, 'customer-claim.pdf');
  assert.equal(await fs.readFile(path.join(directory, filename), 'utf8'), '%PDF-1.7 test');

  const invalidSignature = await postUpload(url, 'fake.pdf', 'application/pdf', 'not a pdf');
  assert.equal(invalidSignature.status, 400);
  assert.match((await invalidSignature.json()).error, /content does not match/);

  const unsupported = await postUpload(url, 'payload.exe', 'application/pdf', '%PDF-1.7');
  assert.equal(unsupported.status, 400);

  const oversized = await postUpload(url, 'large.pdf', 'application/pdf', `%PDF-${'x'.repeat(32)}`);
  assert.equal(oversized.status, 413);

  const files = await fs.readdir(directory);
  assert.deepEqual(files, [filename]);
});
