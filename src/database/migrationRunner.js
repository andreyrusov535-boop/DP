const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

class MigrationRunner {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.migrationsPath = path.join(__dirname, '../../database/migrations');
  }

  async initialize() {
    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await this.db.exec('PRAGMA foreign_keys = ON;');
    
    // Create migrations tracking table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }

  async getExecutedMigrations() {
    const rows = await this.db.all('SELECT version FROM schema_migrations ORDER BY version');
    return new Set(rows.map(row => row.version));
  }

  async getPendingMigrations() {
    const executed = await this.getExecutedMigrations();
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();

    const pending = [];
    for (const file of migrationFiles) {
      const version = parseInt(file.split('-')[0], 10);
      if (!executed.has(version)) {
        const migration = require(path.join(this.migrationsPath, file));
        pending.push({
          version,
          name: file,
          up: migration.up,
          down: migration.down
        });
      }
    }
    return pending;
  }

  async runMigration(migration) {
    try {
      console.log(`Running migration: ${migration.name}`);
      await this.db.exec('BEGIN TRANSACTION');
      
      await migration.up(this.db);
      
      await this.db.run(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      );
      
      await this.db.exec('COMMIT');
      console.log(`Migration completed: ${migration.name}`);
    } catch (error) {
      await this.db.exec('ROLLBACK');
      console.error(`Migration failed: ${migration.name}`, error);
      throw error;
    }
  }

  async rollbackMigration(migration) {
    try {
      console.log(`Rolling back migration: ${migration.name}`);
      await this.db.exec('BEGIN TRANSACTION');
      
      if (migration.down) {
        await migration.down(this.db);
      }
      
      await this.db.run(
        'DELETE FROM schema_migrations WHERE version = ?',
        [migration.version]
      );
      
      await this.db.exec('COMMIT');
      console.log(`Rollback completed: ${migration.name}`);
    } catch (error) {
      await this.db.exec('ROLLBACK');
      console.error(`Rollback failed: ${migration.name}`, error);
      throw error;
    }
  }

  async migrate() {
    await this.initialize();
    try {
      const pending = await this.getPendingMigrations();
      
      if (pending.length === 0) {
        console.log('No pending migrations.');
        return;
      }

      console.log(`Found ${pending.length} pending migration(s)`);
      
      for (const migration of pending) {
        await this.runMigration(migration);
      }
      
      console.log('All migrations completed successfully.');
    } finally {
      await this.close();
    }
  }

  async rollback(steps = 1) {
    await this.initialize();
    try {
      const executed = await this.db.all(
        'SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT ?',
        [steps]
      );

      if (executed.length === 0) {
        console.log('No migrations to rollback.');
        return;
      }

      for (const row of executed) {
        const migrationFile = fs.readdirSync(this.migrationsPath)
          .find(file => file.startsWith(`${row.version.toString().padStart(3, '0')}-`));
        
        if (migrationFile) {
          const migration = require(path.join(this.migrationsPath, migrationFile));
          await this.rollbackMigration({
            version: row.version,
            name: row.name,
            down: migration.down
          });
        }
      }
    } finally {
      await this.close();
    }
  }

  async status() {
    await this.initialize();
    try {
      const executed = await this.getExecutedMigrations();
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.js'))
        .sort();

      console.log('\nMigration Status:');
      console.log('==================');
      
      for (const file of migrationFiles) {
        const version = parseInt(file.split('-')[0], 10);
        const status = executed.has(version) ? '✓' : '✗';
        console.log(`${status} ${file}`);
      }
      
      console.log(`\nExecuted: ${executed.size}/${migrationFiles.length} migrations`);
    } finally {
      await this.close();
    }
  }
}

module.exports = MigrationRunner;