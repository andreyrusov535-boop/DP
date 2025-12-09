const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { app, bootstrap } = require('../../src/app');

let server;
let browser;
let page;
const BASE_URL = 'http://localhost:3000';
let operatorToken;
let operatorId;

describe('Request Management E2E Tests', () => {
  beforeAll(async () => {
    await bootstrap();
    server = app.listen(3000);
    browser = await puppeteer.launch({ headless: true });

    // Create operator user for testing
    const operatorEmail = `operator_${Date.now()}@example.com`;
    const operatorPassword = 'OperatorPass123';
    const operatorName = 'Test Operator';

    // Register operator
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: operatorEmail,
        password: operatorPassword,
        name: operatorName,
        role: 'operator'
      })
    });

    // Login to get token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: operatorEmail,
        password: operatorPassword
      })
    });

    const loginData = await loginRes.json();
    operatorToken = loginData.accessToken;
    operatorId = loginData.user.userId;
  });

  afterAll(async () => {
    if (page) await page.close();
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  });

  beforeEach(async () => {
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(10000);
    page.setDefaultTimeout(5000);
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  describe('Create Request', () => {
    it('should create a request with required fields', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              citizenFio: 'John Doe',
              description: 'Test request'
            })
          });
          const data = await res.json();
          return { status: res.status, hasId: !!data.id };
        },
        operatorToken
      );

      expect(response.status).toBe(201);
      expect(response.hasId).toBe(true);
    });

    it('should create a request with optional fields', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              citizenFio: 'Jane Doe',
              description: 'Detailed request',
              contactEmail: 'jane@example.com',
              contactPhone: '1234567890',
              priority: 'high',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
          });
          const data = await res.json();
          return {
            status: res.status,
            hasPriority: data.priority === 'high',
            hasEmail: data.contactEmail === 'jane@example.com'
          };
        },
        operatorToken
      );

      expect(response.status).toBe(201);
      expect(response.hasPriority).toBe(true);
      expect(response.hasEmail).toBe(true);
    });

    it('should reject request without required fields', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              citizenFio: 'John Doe'
              // Missing description
            })
          });
          return res.status;
        },
        operatorToken
      );

      expect(response).toBe(400);
    });

    it('should sanitize HTML in description', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              citizenFio: 'John Doe',
              description: 'Test <script>alert("XSS")</script> request'
            })
          });
          const data = await res.json();
          return {
            status: res.status,
            hasNoScript: !data.description.includes('<script>')
          };
        },
        operatorToken
      );

      expect(response.status).toBe(201);
      expect(response.hasNoScript).toBe(true);
    });
  });

  describe('List & Filter Requests', () => {
    let requestId;

    beforeAll(async () => {
      // Create a test request
      const res = await fetch(`${BASE_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${operatorToken}`
        },
        body: JSON.stringify({
          citizenFio: 'Filter Test User',
          description: 'Request for filtering tests',
          priority: 'high',
          status: 'new'
        })
      });
      const data = await res.json();
      requestId = data.id;
    });

    it('should list requests with pagination', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests?page=1&limit=20', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          return {
            status: res.status,
            hasData: Array.isArray(data.data),
            hasMeta: !!data.meta
          };
        },
        operatorToken
      );

      expect(response.status).toBe(200);
      expect(response.hasData).toBe(true);
      expect(response.hasMeta).toBe(true);
    });

    it('should filter requests by status', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests?status=new', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          return {
            status: res.status,
            allNewStatus: data.data.every(r => r.status === 'new')
          };
        },
        operatorToken
      );

      expect(response.status).toBe(200);
      expect(response.allNewStatus).toBe(true);
    });

    it('should filter requests by priority', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests?priority=high', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          return {
            status: res.status,
            allHighPriority: data.data.every(r => r.priority === 'high' || r.priority === undefined)
          };
        },
        operatorToken
      );

      expect(response.status).toBe(200);
    });

    it('should search requests with full-text search', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests?search=Filter%20Test', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          return {
            status: res.status,
            foundRequest: data.data.some(r => r.citizenFio.includes('Filter Test'))
          };
        },
        operatorToken
      );

      expect(response.status).toBe(200);
      expect(response.foundRequest).toBe(true);
    });
  });

  describe('Update Request', () => {
    let requestId;

    beforeAll(async () => {
      const res = await fetch(`${BASE_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${operatorToken}`
        },
        body: JSON.stringify({
          citizenFio: 'Update Test User',
          description: 'Request for update tests'
        })
      });
      const data = await res.json();
      requestId = data.id;
    });

    it('should update request details', async () => {
      const response = await page.evaluate(
        async (token, requestId) => {
          const res = await fetch(`/api/requests/${requestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              priority: 'urgent',
              status: 'in_progress'
            })
          });
          const data = await res.json();
          return {
            status: res.status,
            priority: data.priority,
            requestStatus: data.status
          };
        },
        operatorToken,
        requestId
      );

      expect(response.status).toBe(200);
      expect(response.priority).toBe('urgent');
      expect(response.requestStatus).toBe('in_progress');
    });

    it('should change request status', async () => {
      const response = await page.evaluate(
        async (token, requestId) => {
          const res = await fetch(`/api/requests/${requestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              status: 'paused'
            })
          });
          const data = await res.json();
          return { status: res.status, newStatus: data.status };
        },
        operatorToken,
        requestId
      );

      expect(response.status).toBe(200);
      expect(response.newStatus).toBe('paused');
    });

    it('should remove request from control', async () => {
      const response = await page.evaluate(
        async (token, requestId) => {
          const res = await fetch(`/api/requests/${requestId}/remove-from-control`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              note: 'No longer needed'
            })
          });
          const data = await res.json();
          return { status: res.status, newStatus: data.status };
        },
        operatorToken,
        requestId
      );

      expect(response.status).toBe(200);
      expect(response.newStatus).toBe('removed');
    });
  });

  describe('Request with Attachments', () => {
    it('should create request with files via multipart', async () => {
      // Create a temporary test file
      const testFilePath = '/tmp/test-file.txt';
      fs.writeFileSync(testFilePath, 'This is a test file');

      const response = await page.evaluate(
        async (token) => {
          const formData = new FormData();
          formData.append('citizenFio', 'Attachment Test User');
          formData.append('description', 'Request with attachments');

          const res = await fetch('/api/requests', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          const data = await res.json();
          return {
            status: res.status,
            hasId: !!data.id,
            hasAttachments: Array.isArray(data.attachments)
          };
        },
        operatorToken
      );

      expect(response.status).toBe(201);
      expect(response.hasId).toBe(true);
      expect(response.hasAttachments).toBe(true);

      // Cleanup
      fs.unlinkSync(testFilePath);
    });
  });

  describe('Get Single Request', () => {
    let requestId;

    beforeAll(async () => {
      const res = await fetch(`${BASE_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${operatorToken}`
        },
        body: JSON.stringify({
          citizenFio: 'Single Request Test',
          description: 'Test request for retrieval'
        })
      });
      const data = await res.json();
      requestId = data.id;
    });

    it('should retrieve single request by ID', async () => {
      const response = await page.evaluate(
        async (token, requestId) => {
          const res = await fetch(`/api/requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          return {
            status: res.status,
            id: data.id,
            citizenFio: data.citizenFio
          };
        },
        operatorToken,
        requestId
      );

      expect(response.status).toBe(200);
      expect(response.id).toBe(requestId);
      expect(response.citizenFio).toBe('Single Request Test');
    });

    it('should return 404 for non-existent request', async () => {
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/requests/99999', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          return res.status;
        },
        operatorToken
      );

      expect(response).toBe(404);
    });
  });

  describe('Authorization Tests', () => {
    let citizenToken;
    let requestId;

    beforeAll(async () => {
      // Create citizen user
      const citizenEmail = `citizen_${Date.now()}@example.com`;
      const citizenPassword = 'CitizenPass123';

      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: citizenEmail,
          password: citizenPassword,
          name: 'Test Citizen',
          role: 'citizen'
        })
      });

      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: citizenEmail,
          password: citizenPassword
        })
      });

      const data = await loginRes.json();
      citizenToken = data.accessToken;

      // Create a request as operator
      const reqRes = await fetch(`${BASE_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${operatorToken}`
        },
        body: JSON.stringify({
          citizenFio: 'Authorization Test User',
          description: 'Test request'
        })
      });
      const reqData = await reqRes.json();
      requestId = reqData.id;
    });

    it('should allow operators to edit requests', async () => {
      const response = await page.evaluate(
        async (token, requestId) => {
          const res = await fetch(`/api/requests/${requestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              priority: 'medium'
            })
          });
          return res.status;
        },
        operatorToken,
        requestId
      );

      expect(response).toBe(200);
    });
  });
});
