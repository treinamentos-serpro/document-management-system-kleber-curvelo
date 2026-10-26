const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDir } = require('../config');

const documents = new Map();

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

function findById(id) {
  return documents.get(id);
}

function getFilePath(storedFilename) {
  return path.join(storageDir, storedFilename);
}

async function removeFile(storedFilename) {
  try {
    await fs.unlink(getFilePath(storedFilename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = { save, findByOwner, findById, getFilePath, removeFile };
