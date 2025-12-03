/**
 * Database smoke test
 * Verifies that migrations create all required tables with seed data
 */

const dbService = require('../src/database/databaseService');

async function runSmokeTest() {
  console.log('🔍 Running database smoke test...\n');
  
  let passed = 0;
  let failed = 0;
  const tests = [];

  // Test database connection
  tests.push({
    name: 'Database connection',
    test: async () => {
      await dbService.initialize();
      const health = await dbService.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`Database unhealthy: ${JSON.stringify(health)}`);
      }
      return '✅ Database connection healthy';
    }
  });

  // Test tables exist
  const expectedTables = [
    'users', 'nomenclature', 'requests', 'files', 
    'audit_log', 'request_proceedings', 'schema_migrations'
  ];

  tests.push({
    name: 'Required tables exist',
    test: async () => {
      const db = dbService.getDatabase();
      const tables = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const tableNames = tables.map(t => t.name);
      const missing = expectedTables.filter(t => !tableNames.includes(t));
      
      if (missing.length > 0) {
        throw new Error(`Missing tables: ${missing.join(', ')}`);
      }
      
      return `✅ All ${expectedTables.length} required tables exist`;
    }
  });

  // Test indexes exist
  const expectedIndexes = [
    'idx_users_username', 'idx_users_email', 'idx_users_role',
    'idx_nomenclature_type', 'idx_nomenclature_type_active',
    'idx_requests_status', 'idx_requests_executor', 'idx_requests_due_date',
    'idx_files_request', 'idx_audit_request', 'idx_proceedings_request'
  ];

  tests.push({
    name: 'Performance indexes exist',
    test: async () => {
      const db = dbService.getDatabase();
      const indexes = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name
      `);
      
      const indexNames = indexes.map(i => i.name);
      const missing = expectedIndexes.filter(i => !indexNames.includes(i));
      
      if (missing.length > 0) {
        console.warn(`⚠️  Missing indexes: ${missing.join(', ')}`);
      }
      
      return `✅ Found ${indexNames.length} indexes (${missing.length} missing)`;
    }
  });

  // Test triggers exist
  const expectedTriggers = [
    'update_users_updated_at', 'update_nomenclature_updated_at',
    'update_requests_updated_at', 'update_request_overdue_status',
    'log_status_change', 'log_executor_assignment'
  ];

  tests.push({
    name: 'Data consistency triggers exist',
    test: async () => {
      const db = dbService.getDatabase();
      const triggers = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='trigger'
        ORDER BY name
      `);
      
      const triggerNames = triggers.map(t => t.name);
      const missing = expectedTriggers.filter(t => !triggerNames.includes(t));
      
      if (missing.length > 0) {
        throw new Error(`Missing triggers: ${missing.join(', ')}`);
      }
      
      return `✅ All ${expectedTriggers.length} triggers exist`;
    }
  });

  // Test seed data - nomenclature
  tests.push({
    name: 'Nomenclature seed data',
    test: async () => {
      const db = dbService.getDatabase();
      
      const typesCount = await db.get("SELECT COUNT(*) as count FROM nomenclature WHERE type = 'request_type' AND is_active = 1");
      const topicsCount = await db.get("SELECT COUNT(*) as count FROM nomenclature WHERE type = 'topic' AND is_active = 1");
      const prioritiesCount = await db.get("SELECT COUNT(*) as count FROM nomenclature WHERE type = 'priority' AND is_active = 1");
      const executorsCount = await db.get("SELECT COUNT(*) as count FROM nomenclature WHERE type = 'executor' AND is_active = 1");
      const receiptsResult = await db.get("SELECT COUNT(*) as count FROM nomenclature WHERE type = 'receipt_form' AND is_active = 1");
      const receiptsCount = receiptsResult.count;
      
      if (typesCount.count < 5) throw new Error(`Insufficient request types: ${typesCount.count}`);
      if (topicsCount.count < 10) throw new Error(`Insufficient topics: ${topicsCount.count}`);
      if (prioritiesCount.count < 4) throw new Error(`Insufficient priorities: ${prioritiesCount.count}`);
      if (executorsCount.count < 5) throw new Error(`Insufficient executors: ${executorsCount.count}`);
      if (receiptsCount < 3) throw new Error(`Insufficient receipt forms: ${receiptsCount}`);
      
      return `✅ Seed data: ${typesCount.count} types, ${topicsCount.count} topics, ${prioritiesCount.count} priorities, ${executorsCount.count} executors, ${receiptsCount} receipt forms`;
    }
  });

  // Test seed data - users
  tests.push({
    name: 'Default users created',
    test: async () => {
      const db = dbService.getDatabase();
      const usersCount = await db.get("SELECT COUNT(*) as count FROM users");
      const adminUser = await db.get("SELECT * FROM users WHERE username = 'admin'");
      
      if (usersCount.count < 3) throw new Error(`Insufficient users: ${usersCount.count}`);
      if (!adminUser) throw new Error('Admin user not found');
      if (adminUser.role !== 'admin') throw new Error('Admin user has wrong role');
      
      return `✅ ${usersCount.count} users created, admin user verified`;
    }
  });

  // Test foreign key constraints
  tests.push({
    name: 'Foreign key constraints',
    test: async () => {
      const db = dbService.getDatabase();
      
      // Test that foreign keys are enforced
      try {
        await db.run("INSERT INTO requests (citizen_fio, status, priority_id, created_at, updated_at) VALUES ('Test', 'new', 999, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        throw new Error('Foreign key constraint not enforced');
      } catch (error) {
        if (!error.message.includes('FOREIGN KEY')) {
          throw new Error(`Unexpected error: ${error.message}`);
        }
      }
      
      return '✅ Foreign key constraints are enforced';
    }
  });

  // Test triggers functionality
  tests.push({
    name: 'Triggers functionality',
    test: async () => {
      const db = dbService.getDatabase();
      
      // Get a valid priority ID
      const priority = await db.get("SELECT id FROM nomenclature WHERE type = 'priority' LIMIT 1");
      
      // Create a test request
      const result = await db.run(`
        INSERT INTO requests (citizen_fio, status, priority_id, created_at, updated_at)
        VALUES ('Test Citizen', 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [priority.id]);
      
      const requestId = result.lastID;
      
      // Update status to trigger audit log
      await db.run("UPDATE requests SET status = 'in_progress' WHERE id = ?", [requestId]);
      
      // Check audit log was created
      const auditLog = await db.get("SELECT * FROM audit_log WHERE request_id = ? AND action = 'status_changed'", [requestId]);
      
      if (!auditLog) {
        throw new Error('Status change trigger did not create audit log entry');
      }
      
      // Clean up
      await db.run("DELETE FROM requests WHERE id = ?", [requestId]);
      
      return '✅ Triggers are working correctly';
    }
  });

  // Test SQL injection protection
  tests.push({
    name: 'SQL injection protection',
    test: async () => {
      try {
        dbService.validateParams(['valid_param']);
        dbService.validateParams(['another_valid', 123, null]);
      } catch (error) {
        throw new Error(`Valid parameters rejected: ${error.message}`);
      }
      
      try {
        dbService.validateParams(['invalid; DROP TABLE users;']);
        throw new Error('SQL injection not detected');
      } catch (error) {
        if (!error.message.includes('injection')) {
          throw new Error(`Wrong error for SQL injection: ${error.message}`);
        }
      }
      
      return '✅ SQL injection protection working';
    }
  });

  // Test prepared statements
  tests.push({
    name: 'Prepared statements caching',
    test: async () => {
      // Test that prepared statements are cached and reused
      const stmt1 = await dbService.getPreparedStatement('test_stmt', 'SELECT 1 as test');
      const stmt2 = await dbService.getPreparedStatement('test_stmt', 'SELECT 1 as test');
      
      if (stmt1 !== stmt2) {
        throw new Error('Prepared statements not being cached');
      }
      
      const result1 = await dbService.getOne('test_stmt');
      const result2 = await dbService.getAll('test_stmt');
      
      if (!result1 || !result2 || result2.length !== 1) {
        throw new Error('Prepared statements not executing correctly');
      }
      
      return '✅ Prepared statements working and cached';
    }
  });

  // Test transaction support
  tests.push({
    name: 'Transaction support',
    test: async () => {
      const db = dbService.getDatabase();
      const priority = await db.get("SELECT id FROM nomenclature WHERE type = 'priority' LIMIT 1");
      
      let requestId;
      
      try {
        await dbService.transaction(async (db) => {
          const result = await db.run(`
            INSERT INTO requests (citizen_fio, status, priority_id, created_at, updated_at)
            VALUES ('Transaction Test', 'new', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [priority.id]);
          
          requestId = result.lastID;
          
          // This should be rolled back
          throw new Error('Intentional rollback');
        });
      } catch (error) {
        // Expected error
      }
      
      // Verify the request was not inserted
      const request = await db.get("SELECT * FROM requests WHERE id = ?", [requestId]);
      
      if (request) {
        throw new Error('Transaction rollback failed');
      }
      
      return '✅ Transaction rollback working correctly';
    }
  });

  // Run all tests
  console.log('Running tests...\n');
  
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(`${result}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Smoke test completed: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please check the database setup.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Database is properly configured.');
    return true;
  }
}

// Run smoke test if this file is executed directly
if (require.main === module) {
  runSmokeTest()
    .then(() => {
      console.log('\n🎉 Database smoke test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Smoke test failed:', error);
      process.exit(1);
    })
    .finally(() => {
      dbService.close();
    });
}

module.exports = runSmokeTest;