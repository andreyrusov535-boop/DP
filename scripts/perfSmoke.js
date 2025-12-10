#!/usr/bin/env node

/**
 * Performance Smoke Test Script
 * 
 * Tests critical API endpoints for performance and SLA compliance
 * Usage: npm run test:perf
 */

const http = require('http');
const PORT = process.env.PORT || 3000;

const BASE_URL = `http://localhost:${PORT}`;

// SLA targets
const SLA_TARGETS = {
  health: { avg: 100, max: 500 },
  requests_list: { avg: 2000, max: 10000 },
  requests_create: { avg: 2000, max: 5000 },
  requests_single: { avg: 2000, max: 5000 },
  reports_overview: { avg: 3000, max: 10000 },
  nomenclature: { avg: 500, max: 2000 }
};

// Track results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Make HTTP request and measure response time
 */
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          responseTime,
          data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000); // 15 second timeout
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Test a single endpoint
 */
async function testEndpoint(name, method, path, headers = {}, body = null) {
  console.log(`\nTesting: ${name}`);
  console.log(`  ${method} ${path}`);

  const options = {
    hostname: 'localhost',
    port: PORT,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    timeout: 15000
  };

  try {
    const response = await makeRequest(options, body);
    const target = SLA_TARGETS[name.toLowerCase().replace(/\s+/g, '_')];

    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Response Time: ${response.responseTime}ms`);

    const slaPass = !target || (
      response.responseTime <= target.max &&
      response.statusCode >= 200 &&
      response.statusCode < 300
    );

    if (slaPass) {
      console.log(`  ✓ PASS (SLA: ≤${target?.max}ms)`);
      results.passed++;
      results.tests.push({
        name,
        status: 'PASS',
        responseTime: response.responseTime,
        target: target?.max,
        statusCode: response.statusCode
      });
    } else {
      console.log(`  ✗ FAIL (SLA: ≤${target?.max}ms)`);
      results.failed++;
      results.tests.push({
        name,
        status: 'FAIL',
        responseTime: response.responseTime,
        target: target?.max,
        statusCode: response.statusCode
      });
    }

    return response;
  } catch (error) {
    console.log(`  ✗ ERROR: ${error.message}`);
    results.failed++;
    results.tests.push({
      name,
      status: 'ERROR',
      error: error.message
    });
    return null;
  }
}

/**
 * Run all performance tests
 */
async function runTests() {
  console.log('========================================');
  console.log('Request Management System - Performance Smoke Test');
  console.log('========================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Test 1: Health Check
  await testEndpoint('Health', 'GET', '/health');

  // Test 2: Public Nomenclature
  await testEndpoint('Nomenclature', 'GET', '/api/nomenclature');

  // Test 3: List Requests (public endpoint)
  await testEndpoint('Requests List', 'GET', '/api/requests?page=1&limit=20');

  // Test 4: Create Request
  const createResponse = await testEndpoint('Requests Create', 'POST', '/api/requests', {
    'Content-Type': 'application/json'
  }, {
    citizenFio: 'Test Citizen',
    description: 'Performance Test Request',
    status: 'new',
    priority: 'medium'
  });

  // Extract ID for next test
  let requestId = 1;
  if (createResponse && createResponse.statusCode === 201) {
     try {
       const data = JSON.parse(createResponse.data);
       requestId = data.id;
     } catch (e) { 
       console.error('Failed to parse create response', e); 
     }
  }

  // Test 5: Get Single Request
  await testEndpoint('Requests Single', 'GET', `/api/requests/${requestId}`);

  // Test 6: Request Types
  await testEndpoint('Nomenclature', 'GET', '/api/nomenclature/types');

  // Print Summary
  console.log('\n========================================');
  console.log('Performance Test Summary');
  console.log('========================================');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);

  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests
      .filter(t => t.status !== 'PASS')
      .forEach(test => {
        console.log(`  - ${test.name}: ${test.status}`);
        if (test.responseTime) {
          console.log(`    Response Time: ${test.responseTime}ms (Target: ${test.target}ms)`);
        }
        if (test.error) {
          console.log(`    Error: ${test.error}`);
        }
      });
  }

  console.log('\nResponse Times:');
  const avgTime = results.tests
    .filter(t => t.responseTime)
    .reduce((sum, t) => sum + t.responseTime, 0) / results.tests.filter(t => t.responseTime).length;
  const maxTime = Math.max(...results.tests.filter(t => t.responseTime).map(t => t.responseTime));

  console.log(`  Average: ${avgTime.toFixed(2)}ms`);
  console.log(`  Maximum: ${maxTime}ms`);

  console.log('\nDetails by Endpoint:');
  results.tests.forEach(test => {
    const status = test.status === 'PASS' ? '✓' : '✗';
    const time = test.responseTime ? ` (${test.responseTime}ms)` : '';
    const target = test.target ? ` [Target: ${test.target}ms]` : '';
    console.log(`  ${status} ${test.name}${time}${target}`);
  });

  console.log('========================================\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * Initialize test (wait for server to be ready)
 */
async function initialize() {
  let attempts = 0;
  const maxAttempts = 30;

  console.log('Waiting for server to be ready...');

  while (attempts < maxAttempts) {
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET',
        timeout: 1000
      });

      if (response.statusCode === 200) {
        console.log('Server is ready!\n');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.error('Server failed to start within timeout');
  process.exit(1);
}

// Main execution
(async () => {
  try {
    // Initialize and wait for server
    await initialize();

    // Run performance tests
    await runTests();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
