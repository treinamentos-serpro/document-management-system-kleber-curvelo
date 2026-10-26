const { randomUUID } = require('node:crypto');
const path = require('node:path');
const repository = require('../repositories/documents.repository');
const ApplicationError = require('../errors');
const { validateOwner, validateDocumentId } = require('./documents.validation');
const { toPublicDocument } = require('./documents.mapper');

async function upload(file, owner) {
  try {
    const validatedOwner = validateOwner(owner);
    if (!file) {
      throw new ApplicationError('FILE_REQUIRED', 'Envie um arquivo no campo file.');
    }

    const originalName = path.posix.basename(file.originalname.replace(/\\/g, '/'))
      .replace(/[\x00-\x1f\x7f]/g, '') || 'documento';
    const document = repository.save({
      id: randomUUID(),
      originalName,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: validatedOwner,
      contentType: file.mimetype || 'application/octet-stream',
      storedFilename: file.filename,
    });
    return toPublicDocument(document);
  } catch (error) {
    if (file) {
      try {
        await repository.removeFile(file.filename);
      } catch (cleanupError) {
        console.error('Falha ao remover arquivo após erro de upload.', cleanupError);
      }
    }
    throw error;
  }
}

function list(owner) {
  return repository.findByOwner(validateOwner(owner)).map(toPublicDocument);
}

function getDownload(id, owner) {
  const validatedOwner = validateOwner(owner);
  validateDocumentId(id);

  const document = repository.findById(id);
  if (!document || document.owner !== validatedOwner) {
    throw new ApplicationError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }
  return {
    path: repository.getFilePath(document.storedFilename),
    originalName: document.originalName,
    contentType: document.contentType,
  };
}

module.exports = { validateOwner, upload, list, getDownload };
