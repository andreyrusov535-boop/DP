#!/usr/bin/env node

/**
 * Database seeding script
 * Usage: npm run seed
 */

const { initDb } = require('../src/db');

async function seedDatabase() {
  try {
    console.log('Seeding database...');
    await initDb();
    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
