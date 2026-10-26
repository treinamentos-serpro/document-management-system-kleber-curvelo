const { randomUUID } = require('node:crypto');
const path = require('node:path');
const repository = require('../repositories/documents.repository');
const ApplicationError = require('../errors');

function validateOwner(owner) {
  if (typeof owner !== 'string' || !owner.trim() || owner.trim().length > 128) {
    throw new ApplicationError(
      'USER_ID_REQUIRED',
      'Informe X-User-Id com 1 a 128 caracteres.'
    );
  }
  return owner.trim();
}

function toPublicDocument(document) {
  const { storedFilename, ...metadata } = document;
  return metadata;
}

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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApplicationError('INVALID_DOCUMENT_ID', 'Identificador de documento inválido.');
  }

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
