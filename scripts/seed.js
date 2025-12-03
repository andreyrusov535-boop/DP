#!/usr/bin/env node

/**
 * Database seeding script
 * Usage: npm run seed
 * Options:
 *   --refresh  Drop and recreate all seed data
 */

const dbService = require('../src/database/databaseService');

async function seedDatabase() {
  const args = process.argv.slice(2);
  const refresh = args.includes('--refresh');
  
  try {
    console.log('Seeding database...');
    
    // Initialize database connection
    await dbService.initialize();
    
    if (refresh) {
      console.log('Refreshing seed data...');
      // Run seed migration in refresh mode by rolling back then migrating
      const { MigrationRunner } = require('../src/database/migrationRunner');
      const runner = new MigrationRunner(dbService.migrationRunner.dbPath);
      
      // Rollback seed data only
      await runner.initialize();
      const seedMigration = {
        version: 2,
        name: '002-seed-data.js',
        down: require('../database/migrations/002-seed-data').down
      };
      await runner.rollbackMigration(seedMigration);
      await runner.close();
    }
    
    // Run migrations (will only run pending ones)
    await dbService.migrate();
    
    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dbService.close();
  }
}

seedDatabase();
