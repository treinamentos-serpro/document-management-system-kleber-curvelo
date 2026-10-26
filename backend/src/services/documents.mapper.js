function toPublicDocument(document) {
  const { storedFilename, ...metadata } = document;
  return metadata;
}

module.exports = { toPublicDocument };
