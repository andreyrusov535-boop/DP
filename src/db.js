const dbService = require('./database/databaseService');

// Legacy compatibility layer
let initialized = false;

async function initDb() {
  if (!initialized) {
    await dbService.initialize();
    await dbService.migrate(); // Auto-migrate for backward compatibility
    initialized = true;
  }
  return dbService.getDatabase();
}

function getDb() {
  if (!initialized) {
    throw new Error('Database has not been initialized. Call initDb() first.');
  }
  return dbService.getDatabase();
}

async function closeDb() {
  if (initialized) {
    await dbService.close();
    initialized = false;
  }
}

// Expose the new database service for direct use
module.exports = {
  initDb,
  getDb,
  closeDb,
  dbService // New comprehensive service
};
