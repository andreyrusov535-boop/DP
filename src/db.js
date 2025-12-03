const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const config = require('./config');

let dbInstance;

async function initDb() {
  if (dbInstance) {
    return dbInstance;
  }

  fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });
  dbInstance = await open({
    filename: config.DB_PATH,
    driver: sqlite3.Database
  });

  await dbInstance.exec('PRAGMA foreign_keys = ON;');
  await createSchema();
  await seedNomenclature();
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error('Database has not been initialized. Call initDb() first.');
  }
  return dbInstance;
}

async function closeDb() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

async function createSchema() {
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS request_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS request_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_fio TEXT NOT NULL,
      contact_phone TEXT,
      contact_email TEXT,
      request_type_id INTEGER,
      request_topic_id INTEGER,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      executor TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      control_status TEXT NOT NULL DEFAULT 'no',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (request_type_id) REFERENCES request_types(id),
      FOREIGN KEY (request_topic_id) REFERENCES request_topics(id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS request_proceedings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_requests_citizen_fio ON requests(citizen_fio);
    CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type_id);
    CREATE INDEX IF NOT EXISTS idx_requests_topic ON requests(request_topic_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_executor ON requests(executor);
    CREATE INDEX IF NOT EXISTS idx_requests_due_date ON requests(due_date);
    CREATE INDEX IF NOT EXISTS idx_requests_control_status ON requests(control_status);
  `);
}

async function seedNomenclature() {
  const { count: typeCount } = await dbInstance.get('SELECT COUNT(*) as count FROM request_types');
  if (typeCount === 0) {
    const defaultTypes = [
      { code: 'water', name: 'Water Supply' },
      { code: 'lighting', name: 'Street Lighting' },
      { code: 'housing', name: 'Housing & Maintenance' }
    ];
    const insert = await dbInstance.prepare('INSERT INTO request_types (code, name) VALUES (?, ?)');
    try {
      for (const item of defaultTypes) {
        await insert.run(item.code, item.name);
      }
    } finally {
      await insert.finalize();
    }
  }

  const { count: topicCount } = await dbInstance.get('SELECT COUNT(*) as count FROM request_topics');
  if (topicCount === 0) {
    const defaultTopics = [
      { code: 'leak', name: 'Leak Response' },
      { code: 'outage', name: 'Service Outage' },
      { code: 'repair', name: 'Repair Request' }
    ];
    const insert = await dbInstance.prepare('INSERT INTO request_topics (code, name) VALUES (?, ?)');
    try {
      for (const item of defaultTopics) {
        await insert.run(item.code, item.name);
      }
    } finally {
      await insert.finalize();
    }
  }
}

module.exports = {
  initDb,
  getDb,
  closeDb
};
