#!/usr/bin/env node

/**
 * Database migration script
 * Usage: npm run migrate
 * Options:
 *   --rollback N  Rollback N migrations (default: 1)
 *   --status      Show migration status
 */

const dbService = require('../src/database/databaseService');

async function runMigrations() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--status')) {
      console.log('Checking migration status...');
      await dbService.status();
      process.exit(0);
    }

    const rollbackIndex = args.indexOf('--rollback');
    if (rollbackIndex !== -1) {
      const steps = parseInt(args[rollbackIndex + 1]) || 1;
      console.log(`Rolling back ${steps} migration(s)...`);
      await dbService.rollback(steps);
      console.log('Rollback completed successfully.');
      process.exit(0);
    }

    console.log('Running database migrations...');
    await dbService.migrate();
    console.log('Database migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
