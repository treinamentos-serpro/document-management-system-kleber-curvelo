const multer = require('multer');
const service = require('../services/documents.service');
const ApplicationError = require('../errors');

function validateUser(req, res, next) {
  try {
    service.validateOwner(req.get('X-User-Id'));
    next();
  } catch (error) {
    next(error);
  }
}

async function upload(req, res) {
  const document = await service.upload(req.file, req.get('X-User-Id'));
  res.status(201).json({ document });
}

function list(req, res) {
  res.json({ documents: service.list(req.get('X-User-Id')) });
}

function download(req, res, next) {
  const document = service.getDownload(req.params.id, req.get('X-User-Id'));
  res.set('Content-Type', document.contentType);
  res.download(document.path, document.originalName, (error) => {
    if (!error) return;
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      next(new ApplicationError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
    } else {
      next(error);
    }
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Não foi possível concluir a operação.';

  if (error instanceof multer.MulterError) {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = status === 413 ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD';
    message = status === 413
      ? 'O arquivo excede o tamanho máximo permitido.'
      : 'Envie exatamente um arquivo no campo file.';
  } else if (error instanceof ApplicationError) {
    status = error.code === 'DOCUMENT_NOT_FOUND' ? 404 : 400;
    code = error.code;
    message = error.message;
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_UPLOAD';
    message = 'Corpo da requisição inválido.';
  }

  if (status === 500 || error.storageErrors?.length) {
    console.error('Falha na operação de documentos.', error);
  }
  res.removeHeader('Content-Disposition');
  res.status(status).type('json').json({ error: { code, message } });
}

module.exports = { validateUser, upload, list, download, handleError };
