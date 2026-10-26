const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const service = require('../src/services/documents.service');
const ApplicationError = require('../src/errors');

test('document service validates owners and exposes only public document metadata', async () => {
  const owner = ` ${randomUUID()} `;
  const file = {
    originalname: 'C:\\fakepath\\report.txt',
    size: 12,
    mimetype: 'text/plain',
    filename: randomUUID(),
  };

  const document = await service.upload(file, owner);

  assert.equal(document.owner, owner.trim());
  assert.equal(document.originalName, 'report.txt');
  assert.equal(Object.hasOwn(document, 'storedFilename'), false);
  assert.deepEqual(service.list(owner), [document]);

  assert.throws(
    () => service.list('  '),
    (error) => error instanceof ApplicationError && error.code === 'USER_ID_REQUIRED'
  );
  assert.throws(
    () => service.getDownload(document.id, randomUUID()),
    (error) => error instanceof ApplicationError && error.code === 'DOCUMENT_NOT_FOUND'
  );
  assert.throws(
    () => service.getDownload('invalid-id', owner),
    (error) => error instanceof ApplicationError && error.code === 'INVALID_DOCUMENT_ID'
  );
});
