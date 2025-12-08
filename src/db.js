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
  await applyMigrations();
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

async function applyMigrations() {
  // Add executor_user_id column to requests if it doesn't exist
  try {
    const columns = await dbInstance.all('PRAGMA table_info(requests)');
    const hasExecutorUserId = columns.some((col) => col.name === 'executor_user_id');

    if (!hasExecutorUserId) {
      await dbInstance.exec(
        'ALTER TABLE requests ADD COLUMN executor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;'
      );
    }
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.warn('[db] Migration for executor_user_id skipped or completed:', error.message);
    }
  }

  // Add removed_from_control_by_user_id column to requests if it doesn't exist
  try {
    const columns = await dbInstance.all('PRAGMA table_info(requests)');
    const hasRemovedFromControlByUserId = columns.some((col) => col.name === 'removed_from_control_by_user_id');

    if (!hasRemovedFromControlByUserId) {
      await dbInstance.exec(
        'ALTER TABLE requests ADD COLUMN removed_from_control_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;'
      );
    }
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.warn('[db] Migration for removed_from_control_by_user_id skipped or completed:', error.message);
    }
  }

  // Create deadline_notifications table if it doesn't exist
  try {
    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS deadline_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL,
        target_user_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
  } catch (error) {
    // Table likely already exists from createSchema
  }

  // Create indexes if they don't exist
  try {
    await dbInstance.exec(`
      CREATE INDEX IF NOT EXISTS idx_requests_executor_user_id ON requests(executor_user_id);
      CREATE INDEX IF NOT EXISTS idx_requests_removed_from_control_by_user_id ON requests(removed_from_control_by_user_id);
      CREATE INDEX IF NOT EXISTS idx_deadline_notifications_request_id ON deadline_notifications(request_id);
      CREATE INDEX IF NOT EXISTS idx_deadline_notifications_notification_type ON deadline_notifications(notification_type);
    `);
  } catch (error) {
    // Indexes might already exist from createSchema
  }
}

async function createSchema() {
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS social_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS intake_forms (
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
      address TEXT,
      territory TEXT,
      social_group_id INTEGER,
      intake_form_id INTEGER,
      contact_channel TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      executor TEXT,
      executor_user_id INTEGER,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      control_status TEXT NOT NULL DEFAULT 'no',
      removed_from_control_at TEXT,
      removed_from_control_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (request_type_id) REFERENCES request_types(id),
      FOREIGN KEY (request_topic_id) REFERENCES request_topics(id),
      FOREIGN KEY (social_group_id) REFERENCES social_groups(id),
      FOREIGN KEY (intake_form_id) REFERENCES intake_forms(id),
      FOREIGN KEY (executor_user_id) REFERENCES users(id) ON DELETE SET NULL
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
      user_id INTEGER,
      request_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      payload TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS request_proceedings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deadline_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      notification_type TEXT NOT NULL,
      target_user_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS request_search USING fts5(
      id UNINDEXED,
      citizen_fio,
      description,
      address,
      territory,
      executor
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_requests_citizen_fio ON requests(citizen_fio);
    CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type_id);
    CREATE INDEX IF NOT EXISTS idx_requests_topic ON requests(request_topic_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_executor ON requests(executor);
    CREATE INDEX IF NOT EXISTS idx_requests_due_date ON requests(due_date);
    CREATE INDEX IF NOT EXISTS idx_requests_control_status ON requests(control_status);
    CREATE INDEX IF NOT EXISTS idx_requests_social_group ON requests(social_group_id);
    CREATE INDEX IF NOT EXISTS idx_requests_intake_form ON requests(intake_form_id);
    CREATE INDEX IF NOT EXISTS idx_requests_address ON requests(address);
    CREATE INDEX IF NOT EXISTS idx_requests_territory ON requests(territory);
    CREATE INDEX IF NOT EXISTS idx_requests_executor_user_id ON requests(executor_user_id);
    CREATE INDEX IF NOT EXISTS idx_deadline_notifications_request_id ON deadline_notifications(request_id);
    CREATE INDEX IF NOT EXISTS idx_deadline_notifications_notification_type ON deadline_notifications(notification_type);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

    CREATE TRIGGER IF NOT EXISTS request_ai AFTER INSERT ON requests BEGIN
      INSERT INTO request_search(id, citizen_fio, description, address, territory, executor)
      VALUES (new.id, new.citizen_fio, new.description, new.address, new.territory, new.executor);
    END;

    CREATE TRIGGER IF NOT EXISTS request_ad AFTER DELETE ON requests BEGIN
      DELETE FROM request_search WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS request_au AFTER UPDATE ON requests BEGIN
      DELETE FROM request_search WHERE id = old.id;
      INSERT INTO request_search(id, citizen_fio, description, address, territory, executor)
      VALUES (new.id, new.citizen_fio, new.description, new.address, new.territory, new.executor);
    END;
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

  const { count: socialGroupCount } = await dbInstance.get('SELECT COUNT(*) as count FROM social_groups');
  if (socialGroupCount === 0) {
    const defaultSocialGroups = [
      { code: 'families', name: 'Families with Children' },
      { code: 'elderly', name: 'Elderly Residents' },
      { code: 'disabled', name: 'Persons with Disabilities' },
      { code: 'low_income', name: 'Low-Income Residents' }
    ];
    const insert = await dbInstance.prepare('INSERT INTO social_groups (code, name) VALUES (?, ?)');
    try {
      for (const item of defaultSocialGroups) {
        await insert.run(item.code, item.name);
      }
    } finally {
      await insert.finalize();
    }
  }

  const { count: intakeFormCount } = await dbInstance.get('SELECT COUNT(*) as count FROM intake_forms');
  if (intakeFormCount === 0) {
    const defaultIntakeForms = [
      { code: 'online', name: 'Online Form' },
      { code: 'phone', name: 'Phone Call' },
      { code: 'in_person', name: 'In-Person' },
      { code: 'email', name: 'Email' }
    ];
    const insert = await dbInstance.prepare('INSERT INTO intake_forms (code, name) VALUES (?, ?)');
    try {
      for (const item of defaultIntakeForms) {
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
