#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

console.log('🔍 Request Creation Validation Debug\n');

async function runDiagnostics() {
    const db = new sqlite3.Database('./data/requests.sqlite');
    
    try {
        // Check 1: Database has request types
        console.log('1️⃣  Checking database for request types...');
        const types = await new Promise((resolve, reject) => {
            db.all("SELECT id, type, code, name FROM nomenclature WHERE type = 'request_type' ORDER BY id", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`   Found ${types.length} request types:`);
        types.forEach(type => {
            console.log(`   ✅ ID: ${type.id}, Code: ${type.code}, Name: ${type.name}`);
        });
        
        if (types.length === 0) {
            console.log('   ❌ PROBLEM: No request types in database!');
            console.log('      This means the dropdown will be empty and requestTypeId will be undefined.');
            return;
        }
        
        // Check 2: Test API availability
        console.log('\n2️⃣  Testing API endpoint...');
        try {
            const apiResponse = await fetch('http://localhost:3000/api/nomenclature/types');
            const apiData = await apiResponse.json();
            
            if (apiResponse.ok && apiData.types) {
                console.log(`   ✅ API working - returns ${apiData.types.length} types`);
            } else {
                console.log(`   ❌ API issue: Status ${apiResponse.status}`);
                console.log('      Response:', apiData);
                return;
            }
        } catch (error) {
            console.log('   ❌ API not reachable:', error.message);
            console.log('      Make sure server is running: node src/server.js');
            return;
        }
        
        // Check 3: Test request creation with valid data
        console.log('\n3️⃣  Testing request creation...');
        const testData = {
            citizenFio: 'Test User',
            description: 'This is a test request for validation',
            address: '123 Test Street, Test City',
            contactEmail: 'test@example.com',
            requestTypeId: types[0].id
        };
        
        console.log('   Test data:', JSON.stringify(testData, null, 2));
        
        const createResponse = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const createData = await createResponse.json();
        
        if (createResponse.ok) {
            console.log('   ✅ Request creation SUCCESS!');
            console.log(`   Created request ID: ${createData.id}`);
            console.log('   Status:', createData.status);
        } else {
            console.log('   ❌ Request creation FAILED');
            console.log('   Status:', createResponse.status);
            console.log('   Error details:', JSON.stringify(createData, null, 2));
        }
        
        // Check 4: Test with empty requestTypeId (simulates frontend bug)
        console.log('\n4️⃣  Testing with empty requestTypeId (original bug)...');
        const emptyData = {
            citizenFio: 'Test User',
            description: 'This should fail',
            address: '123 Test Street',
            contactEmail: 'test@example.com'
            // NO requestTypeId
        };
        
        const emptyResponse = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emptyData)
        });
        
        const emptyDataResponse = await emptyResponse.json();
        
        if (!emptyResponse.ok) {
            console.log('   ✅ Expected failure with empty requestTypeId');
            console.log('   Status:', emptyResponse.status);
            console.log('   This confirms the original bug would occur');
        } else {
            console.log('   ⚠️  Unexpected: Empty requestTypeId succeeded');
        }
        
        console.log('\n🎯 DIAGNOSIS SUMMARY:');
        console.log('=' * 50);
        
        if (createResponse.ok) {
            console.log('✅ FIXED: Request creation now works with valid requestTypeId');
            console.log('💡 The frontend dropdown population fix should resolve the issue');
        } else {
            console.log('❌ STILL BROKEN: Additional validation issues found');
            console.log('   Check the error details above');
        }
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
    } finally {
        db.close();
    }
}

runDiagnostics();