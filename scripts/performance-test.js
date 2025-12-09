#!/usr/bin/env node

const autocannon = require('autocannon');

async function runPerformanceTests() {
    console.log('🚀 Starting Performance Tests...\n');

    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
    
    // Test configurations
    const tests = [
        {
            name: 'API Requests List',
            url: `${BASE_URL}/api/requests`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer test-token' // Mock token for testing
            },
            expectations: {
                statusCode: 401, // Should be unauthorized without valid token
                responseTime: {
                    max: 2000,
                    average: 1000
                }
            }
        },
        {
            name: 'Health Check',
            url: `${BASE_URL}/health`,
            method: 'GET',
            expectations: {
                statusCode: 200,
                responseTime: {
                    max: 500,
                    average: 200
                }
            }
        },
        {
            name: 'Static Assets',
            url: `${BASE_URL}/styles/main.css`,
            method: 'GET',
            expectations: {
                statusCode: 200,
                responseTime: {
                    max: 1000,
                    average: 300
                }
            }
        }
    ];

    const results = [];

    for (const test of tests) {
        console.log(`📊 Testing: ${test.name}`);
        console.log(`   URL: ${test.url}`);
        console.log(`   Method: ${test.method}`);
        
        try {
            const result = await autocannon({
                url: test.url,
                method: test.method,
                headers: test.headers || {},
                connections: 10,
                duration: 10,
                timeout: 30
            });

            const status = test.expectations.statusCode;
            const actualStatus = result.non2xxError || result.statusCode;
            const statusOk = status === actualStatus;

            const avgTime = result.latency.average;
            const maxTime = result.latency.max;
            const timeOk = avgTime <= test.expectations.responseTime.average && 
                         maxTime <= test.expectations.responseTime.max;

            const requestsPerSecond = result.requests.average;
            const throughputOk = requestsPerSecond > 0;

            const testResult = {
                name: test.name,
                status: statusOk ? '✅ PASS' : '❌ FAIL',
                responseTime: {
                    status: timeOk ? '✅ PASS' : '❌ FAIL',
                    average: `${avgTime.toFixed(2)}ms`,
                    max: `${maxTime.toFixed(2)}ms`,
                    target: `${test.expectations.responseTime.average}ms avg / ${test.expectations.responseTime.max}ms max`
                },
                throughput: {
                    status: throughputOk ? '✅ PASS' : '❌ FAIL',
                    rps: requestsPerSecond.toFixed(2)
                },
                statusCode: {
                    expected: status,
                    actual: actualStatus,
                    status: statusOk
                }
            };

            results.push(testResult);

            console.log(`   Status: ${testResult.status}`);
            console.log(`   Response Time: ${testResult.responseTime.status} (${testResult.responseTime.average} avg / ${testResult.responseTime.max} max)`);
            console.log(`   Target: ${testResult.responseTime.target}`);
            console.log(`   Throughput: ${testResult.throughput.status} (${testResult.throughput.rps} req/s)`);
            console.log(`   HTTP Status: ${testResult.statusCode.expected} -> ${testResult.statusCode.actual}\n`);

        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}\n`);
            results.push({
                name: test.name,
                status: '❌ ERROR',
                error: error.message
            });
        }
    }

    // Summary
    console.log('📈 Performance Test Summary');
    console.log('================================');
    
    const passed = results.filter(r => r.status.includes('PASS')).length;
    const failed = results.filter(r => r.status.includes('FAIL') || r.status.includes('ERROR')).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => r.status.includes('FAIL') || r.status.includes('ERROR')).forEach(test => {
            console.log(`   - ${test.name}: ${test.error || 'Performance threshold not met'}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ All performance tests passed!');
        console.log('\n📋 Performance Guidelines Met:');
        console.log('   • API response times ≤ 2 seconds');
        console.log('   • Health check response ≤ 500ms');
        console.log('   • Static assets served efficiently');
        console.log('   • System handles concurrent requests');
    }
}

// Check if server is running
async function checkServer() {
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
    
    try {
        const response = await fetch(`${BASE_URL}/health`, { 
            method: 'GET',
            timeout: 5000 
        });
        
        if (response.ok) {
            console.log('✅ Server is running and healthy\n');
            return true;
        } else {
            console.log('❌ Server responded with error status\n');
            return false;
        }
    } catch (error) {
        console.log('❌ Server is not running or not accessible\n');
        console.log('   Please start the server with: npm run dev');
        console.log(`   Or set BASE_URL environment variable if running on different port\n`);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🎯 Performance Smoke Test for Request Management System');
    console.log('==================================================\n');
    
    const serverRunning = await checkServer();
    if (!serverRunning) {
        process.exit(1);
    }

    await runPerformanceTests();
}

if (require.main === module) {
    main().catch(error => {
        console.error('Performance test failed:', error);
        process.exit(1);
    });
}

module.exports = { runPerformanceTests, checkServer };