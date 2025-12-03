#!/usr/bin/env node

/**
 * Database smoke test script
 * Usage: npm run smoke-test
 * Verifies database schema and seed data integrity
 */

const runSmokeTest = require('../tests/database-smoke-test');

async function main() {
  try {
    console.log('🔍 Starting database smoke test...\n');
    
    const success = await runSmokeTest();
    
    if (success) {
      console.log('\n🎉 All smoke tests passed! Database is ready for use.');
      process.exit(0);
    } else {
      console.log('\n💥 Smoke tests failed. Please check the database configuration.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Smoke test execution failed:', error);
    process.exit(1);
  }
}

main();