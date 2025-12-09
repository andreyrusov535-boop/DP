/**
 * Initial database schema migration
 * Creates all core tables with proper relationships, indexes, and constraints
 * Merged from Phase 3 and Feature Branch schemas
 */

async function up(db) {
  // Users table (Phase 3 style with aliases for compatibility)
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      status TEXT NOT NULL DEFAULT 'active',
      
      -- Feature branch compatibility columns (optional or computed)
      username TEXT, -- derived from email or separate
      full_name TEXT, -- alias for name
      department TEXT,
      position TEXT,
      is_active INTEGER DEFAULT 1, -- alias for status=active
      
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Enhanced nomenclature tables (Feature branch style)
  // Replaces request_types, request_topics, social_groups, intake_forms
  await db.exec(`
    CREATE TABLE nomenclature (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- request_type, topic, intake_form, social_group, priority, executor
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      metadata TEXT, -- JSON for extensibility
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      parent_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, code),
      FOREIGN KEY (parent_id) REFERENCES nomenclature(id) ON DELETE SET NULL
    );
  `);

  // Requests table (Merged Phase 3 + Feature)
  await db.exec(`
    CREATE TABLE requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- Contact Info (Phase 3)
      citizen_fio TEXT NOT NULL,
      contact_phone TEXT,
      contact_email TEXT,
      contact_channel TEXT, -- Phase 3
      
      -- Classification (References to Nomenclature)
      request_type_id INTEGER,
      request_topic_id INTEGER,
      intake_form_id INTEGER, -- Alias for receipt_form_id
      social_group_id INTEGER, -- Phase 3
      
      -- Description & Location
      description TEXT,
      address TEXT, -- Phase 3
      territory TEXT, -- Phase 3
      
      -- Workflow
      status TEXT NOT NULL DEFAULT 'new',
      
      -- Executor
      executor TEXT, -- Legacy text field (Phase 3)
      executor_user_id INTEGER, -- User ID (Phase 3)
      -- executor_id INTEGER, -- Feature branch (aliased to executor_user_id in logic)
      
      -- Priority
      priority TEXT NOT NULL DEFAULT 'medium', -- Phase 3 text
      priority_id INTEGER, -- Feature branch FK
      
      -- Deadlines & Control
      due_date TEXT,
      control_status TEXT NOT NULL DEFAULT 'no',
      is_overdue INTEGER NOT NULL DEFAULT 0,
      
      removed_from_control_at TEXT, -- Phase 3
      removed_from_control_by TEXT, -- Phase 3
      removed_from_control_by_user_id INTEGER, -- Phase 3
      
      resolved_at TEXT, -- Feature
      
      -- Meta
      external_id TEXT, -- Feature
      source TEXT DEFAULT 'manual', -- Feature
      created_by INTEGER, -- Feature
      
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      
      FOREIGN KEY (request_type_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
      FOREIGN KEY (request_topic_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
      FOREIGN KEY (intake_form_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
      FOREIGN KEY (social_group_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
      FOREIGN KEY (priority_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
      FOREIGN KEY (executor_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (removed_from_control_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Files table (Phase 3 + Feature)
  await db.exec(`
    CREATE TABLE files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      file_hash TEXT, -- Feature
      description TEXT, -- Feature
      category TEXT DEFAULT 'attachment', -- Feature
      uploaded_by INTEGER, -- Feature
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Audit Log (Phase 3 + Feature)
  await db.exec(`
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT, -- Phase 3
      payload TEXT, -- Phase 3
      old_values TEXT, -- Feature
      new_values TEXT, -- Feature
      description TEXT, -- Feature
      ip_address TEXT, -- Feature
      user_agent TEXT, -- Feature
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Request Proceedings (Phase 3 + Feature)
  await db.exec(`
    CREATE TABLE request_proceedings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      user_id INTEGER, -- Feature
      action TEXT NOT NULL,
      notes TEXT,
      internal_note INTEGER DEFAULT 0, -- Feature
      visibility TEXT DEFAULT 'internal', -- Feature
      metadata TEXT, -- Feature
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Deadline Notifications (Phase 3)
  await db.exec(`
    CREATE TABLE deadline_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      notification_type TEXT NOT NULL,
      target_user_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // FTS5 Search (Phase 3)
  await db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS request_search USING fts5(
      id UNINDEXED,
      citizen_fio,
      description,
      address,
      territory,
      executor
    );
  `);

  // Indexes
  await db.exec(`
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_status ON users(status);
    
    CREATE INDEX idx_nomenclature_type ON nomenclature(type);
    CREATE INDEX idx_nomenclature_type_active ON nomenclature(type, is_active);
    CREATE INDEX idx_nomenclature_parent ON nomenclature(parent_id);
    
    CREATE INDEX idx_requests_citizen_fio ON requests(citizen_fio);
    CREATE INDEX idx_requests_status ON requests(status);
    CREATE INDEX idx_requests_priority ON requests(priority_id);
    CREATE INDEX idx_requests_executor_user_id ON requests(executor_user_id);
    CREATE INDEX idx_requests_due_date ON requests(due_date);
    CREATE INDEX idx_requests_control_status ON requests(control_status);
    CREATE INDEX idx_requests_address ON requests(address);
    CREATE INDEX idx_requests_territory ON requests(territory);
    CREATE INDEX idx_requests_type_topic ON requests(request_type_id, request_topic_id);
    
    CREATE INDEX idx_files_request ON files(request_id);
    CREATE INDEX idx_audit_request ON audit_log(request_id);
    CREATE INDEX idx_proceedings_request ON request_proceedings(request_id);
    CREATE INDEX idx_deadline_notifications_request_id ON deadline_notifications(request_id);
  `);

  // Triggers (Phase 3)
  await db.exec(`
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

async function down(db) {
  // Drop all tables
  await db.exec(`
    DROP TABLE IF EXISTS request_search;
    DROP TABLE IF EXISTS deadline_notifications;
    DROP TABLE IF EXISTS request_proceedings;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS files;
    DROP TABLE IF EXISTS requests;
    DROP TABLE IF EXISTS nomenclature;
    DROP TABLE IF EXISTS users;
  `);
}

module.exports = { up, down };
