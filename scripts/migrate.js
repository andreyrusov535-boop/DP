#!/usr/bin/env node

/**
 * Database migration script
 * Usage: npm run migrate
 */

const { initDb } = require('../src/db');

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await initDb();
    console.log('Database migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
