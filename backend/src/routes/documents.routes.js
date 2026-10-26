const { Router } = require('express');
const multer = require('multer');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const controller = require('../controllers/documents.controller');
const { storageDir, maxFileSizeBytes } = require('../config');
const ApplicationError = require('../errors');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDir, { recursive: true }, (error) => callback(error, storageDir));
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  },
});

const receiveFile = multer({
  storage,
  // O parser rejeita ao atingir o limite; um byte adicional torna o máximo inclusivo.
  limits: { fileSize: maxFileSizeBytes + 1, files: 1 },
}).single('file');

function uploadFile(req, res, next) {
  receiveFile(req, res, (error) => {
    if (error && /^(Multipart: Boundary not found|Malformed content type|Malformed part header|Unexpected end of (form|file))$/.test(error.message)) {
      return next(new ApplicationError('INVALID_UPLOAD', 'Upload multipart inválido.'));
    }
    next(error);
  });
}

const router = Router();

router.post('/upload', controller.validateUser, uploadFile, controller.upload);
router.get('/documents', controller.validateUser, controller.list);
router.get('/documents/:id/download', controller.validateUser, controller.download);

module.exports = router;
