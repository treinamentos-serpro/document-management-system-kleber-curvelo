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

function validateDocumentId(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApplicationError('INVALID_DOCUMENT_ID', 'Identificador de documento inválido.');
  }
}

module.exports = { validateOwner, validateDocumentId };
