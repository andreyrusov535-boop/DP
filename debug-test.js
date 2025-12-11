const fetch = require('node-fetch');

async function testCreateRequest() {
  try {
    console.log('Testing POST /api/requests...');
    
    const response = await fetch('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        citizenFio: 'Test User',
        description: 'Test description',
        address: '123 Test St',
        contactEmail: 'test@example.com',
        requestTypeId: 1
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCreateRequest();