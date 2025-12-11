const fetch = require('node-fetch');

async function simpleTest() {
    try {
        console.log('Testing request creation...');
        
        // First check if server is running
        const healthCheck = await fetch('http://localhost:3000/api/nomenclature/types');
        if (!healthCheck.ok) {
            console.log('Server not responding');
            return;
        }
        
        const types = await healthCheck.json();
        console.log(`Found ${types.types?.length || 0} request types`);
        
        if (types.types?.length > 0) {
            const testData = {
                citizenFio: 'Test User',
                description: 'Test request',
                address: '123 Test St',
                contactEmail: 'test@example.com',
                requestTypeId: types.types[0].id
            };
            
            console.log('Testing request creation with data:', testData);
            
            const response = await fetch('http://localhost:3000/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            
            const result = await response.json();
            console.log('Response status:', response.status);
            console.log('Response:', result);
            
            if (response.ok) {
                console.log('✅ SUCCESS: Request created with ID:', result.id);
            } else {
                console.log('❌ FAILED: Still getting validation error');
            }
        }
    } catch (error) {
        console.log('Error:', error.message);
    }
}

simpleTest();