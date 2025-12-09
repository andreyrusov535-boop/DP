const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const config = require('../config');
const MigrationRunner = require('./migrationRunner');
const fs = require('fs');
const path = require('path');

class DatabaseService {
  constructor() {
    this.db = null;
    this.migrationRunner = new MigrationRunner(config.DB_PATH);
    this.preparedStatements = new Map();
  }

  async initialize() {
    if (this.db) {
      return this.db;
    }

    try {
      console.log('Initializing database connection...');
      
      const dbDir = path.dirname(config.DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = await open({
        filename: config.DB_PATH,
        driver: sqlite3.Database
      });

      // Enable foreign keys and optimize performance
      await this.db.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 1000;
        PRAGMA temp_store = memory;
        PRAGMA mmap_size = 268435456; -- 256MB
      `);

      console.log('Database connection established.');
      return this.db;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      // Finalize all prepared statements
      for (const [name, statement] of this.preparedStatements) {
        try {
          await statement.finalize();
        } catch (error) {
          console.warn(`Failed to finalize statement ${name}:`, error.message);
        }
      }
      this.preparedStatements.clear();

      await this.db.close();
      this.db = null;
      console.log('Database connection closed.');
    }
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async migrate() {
    return this.migrationRunner.migrate();
  }

  async rollback(steps = 1) {
    return this.migrationRunner.rollback(steps);
  }

  async status() {
    return this.migrationRunner.status();
  }

  /**
   * Get or create a prepared statement for reuse
   * @param {string} name - Statement name for caching
   * @param {string} sql - SQL statement
   * @returns {Promise<Statement>} Prepared statement
   */
  async getPreparedStatement(name, sql) {
    if (this.preparedStatements.has(name)) {
      return this.preparedStatements.get(name);
    }
    
    if (!sql) {
      throw new Error(`SQL required for prepared statement ${name}`);
    }

    const db = this.getDatabase();
    const statement = await db.prepare(sql);
    this.preparedStatements.set(name, statement);
    return statement;
  }

  /**
   * Execute a prepared statement with parameters
   * @param {string} name - Statement name
   * @param {Array} params - Parameters for the statement
   * @returns {Promise<Object>} Query result
   */
  async executeStatement(name, args = []) {
    let sql;
    let params = args;
    if (args.length > 0 && typeof args[0] === 'string') {
      sql = args[0];
      params = args.slice(1);
    }
    const statement = await this.getPreparedStatement(name, sql);
    return statement.run(params);
  }

  /**
   * Execute a prepared statement and return the first row
   * @param {string} name - Statement name
   * @param {Array} params - Parameters for the statement (first element can be SQL)
   * @returns {Promise<Object|null>} First row or null
   */
  async getOne(name, args = []) {
    let sql;
    let params = args;
    if (args.length > 0 && typeof args[0] === 'string') {
      sql = args[0];
      params = args.slice(1);
    }
    const statement = await this.getPreparedStatement(name, sql);
    return statement.get(params);
  }

  /**
   * Execute a prepared statement and return all rows
   * @param {string} name - Statement name
   * @param {Array} params - Parameters for the statement (first element can be SQL)
   * @returns {Promise<Array>} All rows
   */
  async getAll(name, args = []) {
    let sql;
    let params = args;
    if (args.length > 0 && typeof args[0] === 'string') {
      sql = args[0];
      params = args.slice(1);
    }
    const statement = await this.getPreparedStatement(name, sql);
    return statement.all(params);
  }

  /**
   * Execute raw SQL with parameters (for complex queries)
   * @param {string} sql - SQL statement
   * @param {Array} params - Parameters
   * @returns {Promise<Object>} Query result
   */
  async execute(sql, params = []) {
    const db = this.getDatabase();
    return db.run(sql, params);
  }

  /**
   * Execute raw SQL and return the first row
   * @param {string} sql - SQL statement
   * @param {Array} params - Parameters
   * @returns {Promise<Object|null>} First row or null
   */
  async get(sql, params = []) {
    const db = this.getDatabase();
    return db.get(sql, params);
  }

  /**
   * Execute raw SQL and return all rows
   * @param {string} sql - SQL statement
   * @param {Array} params - Parameters
   * @returns {Promise<Array>} All rows
   */
  async all(sql, params = []) {
    const db = this.getDatabase();
    return db.all(sql, params);
  }

  /**
   * Begin a transaction
   */
  async beginTransaction() {
    const db = this.getDatabase();
    await db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commit() {
    const db = this.getDatabase();
    await db.exec('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback() {
    const db = this.getDatabase();
    await db.exec('ROLLBACK');
  }

  /**
   * Execute multiple operations in a transaction
   * @param {Function} operations - Function that receives database instance
   * @returns {Promise<any>} Result of operations
   */
  async transaction(operations) {
    await this.beginTransaction();
    try {
      const result = await operations(this.getDatabase());
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Validate SQL parameters to prevent injection
   * @param {Array} params - Parameters to validate
   * @throws {Error} If invalid parameters found
   */
  validateParams(params) {
    if (!Array.isArray(params)) {
      throw new Error('Parameters must be an array');
    }

    for (const param of params) {
      if (typeof param === 'string' && param.includes(';')) {
        throw new Error('Invalid parameter detected: potential SQL injection');
      }
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database stats
   */
  async getStats() {
    const db = this.getDatabase();
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const stats = { tables: [], totalRecords: 0 };

    for (const table of tables) {
      const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
      const recordCount = count.count;
      stats.tables.push({
        name: table.name,
        records: recordCount
      });
      stats.totalRecords += recordCount;
    }

    return stats;
  }

  /**
   * Perform database health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Ensure database is initialized
      if (!this.db) {
        await this.initialize();
      }
      
      const db = this.getDatabase();
      await db.get('SELECT 1');
      
      const stats = await this.getStats();
      const config = require('../config');
      const migrationRunner = new MigrationRunner(config.DB_PATH);
      await migrationRunner.initialize();
      const pendingMigrations = await migrationRunner.getPendingMigrations();
      await migrationRunner.close();
      
      return {
        status: 'healthy',
        connected: true,
        totalTables: stats.tables.length,
        totalRecords: stats.totalRecords,
        pendingMigrations: pendingMigrations.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
const dbService = new DatabaseService();

module.exports = dbService;
