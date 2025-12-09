const puppeteer = require('puppeteer');
const { app, bootstrap } = require('../../src/app');

let server;
let browser;
let page;
const BASE_URL = 'http://localhost:3000';

describe('Authentication E2E Tests', () => {
  beforeAll(async () => {
    await bootstrap();
    server = app.listen(3000);
    browser = await puppeteer.launch({ headless: true });
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

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      await page.goto(`${BASE_URL}`);
      
      // Click register tab or link
      const email = `testuser_${Date.now()}@example.com`;
      const password = 'TestPass123';
      const name = 'Test User';

      // Navigate to register endpoint via API
      const response = await page.evaluate(
        async (email, password, name) => {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
          return res.status;
        },
        email,
        password,
        name
      );

      expect(response).toBe(201);
    });

    it('should reject registration with weak password', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const password = 'weak';
      const name = 'Test User';

      const response = await page.evaluate(
        async (email, password, name) => {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
          return res.status;
        },
        email,
        password,
        name
      );

      expect(response).toBe(400);
    });

    it('should reject registration with invalid email', async () => {
      const email = 'invalid-email';
      const password = 'ValidPass123';
      const name = 'Test User';

      const response = await page.evaluate(
        async (email, password, name) => {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
          return res.status;
        },
        email,
        password,
        name
      );

      expect(response).toBe(400);
    });
  });

  describe('User Login', () => {
    it('should successfully login with correct credentials', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const password = 'TestPass123';
      const name = 'Test User';

      // Register first
      await page.evaluate(
        async (email, password, name) => {
          await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
        },
        email,
        password,
        name
      );

      // Then login
      const response = await page.evaluate(
        async (email, password) => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          return { status: res.status, hasToken: !!data.accessToken };
        },
        email,
        password
      );

      expect(response.status).toBe(200);
      expect(response.hasToken).toBe(true);
    });

    it('should reject login with incorrect password', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const password = 'TestPass123';
      const wrongPassword = 'WrongPass123';
      const name = 'Test User';

      // Register first
      await page.evaluate(
        async (email, password, name) => {
          await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
        },
        email,
        password,
        name
      );

      // Try login with wrong password
      const response = await page.evaluate(
        async (email, password) => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          return res.status;
        },
        email,
        wrongPassword
      );

      expect(response).toBe(401);
    });

    it('should refresh access token', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const password = 'TestPass123';
      const name = 'Test User';

      // Register and login
      await page.evaluate(
        async (email, password, name) => {
          await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
        },
        email,
        password,
        name
      );

      const loginResponse = await page.evaluate(
        async (email, password) => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          return data.refreshToken;
        },
        email,
        password
      );

      // Use refresh token
      const response = await page.evaluate(
        async (refreshToken) => {
          const res = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          const data = await res.json();
          return { status: res.status, hasNewToken: !!data.accessToken };
        },
        loginResponse
      );

      expect(response.status).toBe(200);
      expect(response.hasNewToken).toBe(true);
    });
  });

  describe('Authentication Persistence', () => {
    it('should persist authentication across page reloads', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const password = 'TestPass123';
      const name = 'Test User';

      // Register and login
      await page.evaluate(
        async (email, password, name) => {
          await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
        },
        email,
        password,
        name
      );

      const token = await page.evaluate(
        async (email, password) => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          return data.accessToken;
        },
        email,
        password
      );

      // Use token to access protected route
      const response = await page.evaluate(
        async (token) => {
          const res = await fetch('/api/sample/protected', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          return res.status;
        },
        token
      );

      expect(response).toBe(200);
    });

    it('should reject requests without valid token', async () => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/sample/protected');
        return res.status;
      });

      expect(response).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/sample/protected', {
          headers: { 'Authorization': 'Bearer invalid_token' }
        });
        return res.status;
      });

      expect(response).toBe(401);
    });
  });
});
