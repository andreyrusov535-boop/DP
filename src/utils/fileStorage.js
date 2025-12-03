const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../config');

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function buildStoredFilePath(storedName) {
  return path.join(UPLOAD_DIR, storedName);
}

async function deleteFileIfExists(storedName) {
  try {
    await fs.promises.unlink(buildStoredFilePath(storedName));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  ensureUploadDir,
  buildStoredFilePath,
  deleteFileIfExists
};
