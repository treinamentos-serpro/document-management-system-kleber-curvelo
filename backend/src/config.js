const path = require('node:path');

const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES || 10485760);

if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo seguro.');
}

module.exports = {
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR)
    : path.resolve(__dirname, '../storage'),
  maxFileSizeBytes,
};
