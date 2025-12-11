const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

async function debugValidation() {
    console.log('🔍 Debugging request creation validation...\n');
    
    const db = new sqlite3.Database('./data/requests.sqlite');
    
    // Check database has request types
    db.all("SELECT id, type, code, name FROM nomenclature WHERE type = 'request_type' ORDER BY id", (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return;
        }
        
        console.log('📊 Database Request Types:');
        rows.forEach(row => {
            console.log(`   ID: ${row.id}, Code: ${row.code}, Name: ${row.name}`);
        });
        
        if (rows.length === 0) {
            console.log('❌ No request types in database - this explains the validation error!');
            db.close();
            return;
        }
        
        const testTypeId = rows[0].id;
        console.log(`\n🧪 Testing with requestTypeId: ${testTypeId}\n`);
        
        // Test the actual validation
        const testData = {
            citizenFio: 'Test User',
            description: 'Test description',
            address: '123 Test St',
            contactEmail: 'test@example.com',
            requestTypeId: testTypeId
        };
        
        console.log('📤 Sending request:', JSON.stringify(testData, null, 2));
        
        fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        })
        .then(async response => {
            const data = await response.json();
            console.log('\n📥 Response:');
            console.log('Status:', response.status);
            console.log('Data:', JSON.stringify(data, null, 2));
            
            if (response.ok) {
                console.log('\n✅ SUCCESS: Request creation works!');
                console.log(`   Created request ID: ${data.id}`);
            } else {
                console.log('\n❌ FAILED: Request creation still fails');
                console.log('   This indicates a different validation issue');
            }
        })
        .catch(error => {
            console.log('\n❌ Network Error:', error.message);
            console.log('   Make sure server is running on port 3000');
        })
        .finally(() => {
            db.close();
        });
    });
}

debugValidation();