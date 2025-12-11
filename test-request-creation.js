const fetch = require('node-fetch');

async function testRequestCreation() {
    console.log('🔍 Testing request creation flow...\n');
    
    try {
        // Step 1: Test the nomenclature API
        console.log('1. Testing nomenclature API...');
        const nomenclatureResponse = await fetch('http://localhost:3000/api/nomenclature/types');
        const nomenclatureData = await nomenclatureResponse.json();
        
        if (nomenclatureResponse.ok) {
            console.log('✅ Nomenclature API works');
            console.log(`   Found ${nomenclatureData.types?.length || 0} request types`);
            if (nomenclatureData.types?.length > 0) {
                console.log('   Available types:');
                nomenclatureData.types.forEach(type => {
                    console.log(`   - ID: ${type.id}, Name: ${type.name}, Code: ${type.code}`);
                });
            }
        } else {
            console.log('❌ Nomenclature API failed:', nomenclatureData);
            return;
        }

        // Step 2: Test request creation with valid type ID
        console.log('\n2. Testing request creation...');
        
        if (nomenclatureData.types?.length === 0) {
            console.log('❌ No request types available in database');
            return;
        }

        const firstType = nomenclatureData.types[0];
        console.log(`   Using request type: ${firstType.name} (ID: ${firstType.id})`);
        
        const testData = {
            citizenFio: 'Test User',
            description: 'This is a test request description',
            address: '123 Test Street, Test City',
            contactEmail: 'test.user@example.com',
            requestTypeId: firstType.id
        };
        
        console.log('   Sending request data:', JSON.stringify(testData, null, 2));

        const createResponse = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const createData = await createResponse.json();
        
        if (createResponse.ok) {
            console.log('✅ Request creation successful!');
            console.log('   Created request ID:', createData.id);
            console.log('   Status:', createData.status);
        } else {
            console.log('❌ Request creation failed');
            console.log('   Status:', createResponse.status);
            console.log('   Error:', JSON.stringify(createData, null, 2));
        }

        // Step 3: Test empty requestTypeId to show the original error
        console.log('\n3. Testing with missing requestTypeId (should fail)...');
        
        const emptyData = {
            citizenFio: 'Test User',
            description: 'This should fail',
            address: '123 Test Street',
            contactEmail: 'test@example.com'
            // No requestTypeId
        };

        const emptyResponse = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emptyData)
        });

        const emptyDataResponse = await emptyResponse.json();
        console.log('   Status:', emptyResponse.status);
        console.log('   Response:', JSON.stringify(emptyDataResponse, null, 2));

        console.log('\n🎉 Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure the server is running:');
        console.log('   node src/server.js');
    }
}

testRequestCreation();