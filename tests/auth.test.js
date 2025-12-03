const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, bootstrap } = require('../src/app');
const { getDb, closeDb } = require('../src/db');
const config = require('../src/config');

describe('Auth Module', () => {
  beforeAll(async () => {
    await bootstrap();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDb();
    await removeTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe',
          role: 'citizen'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.email).toBe('user@example.com');
      expect(response.body.name).toBe('John Doe');
      expect(response.body.role).toBe('citizen');
    });

    it('should register with default role "citizen"', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'SecurePass123',
          name: 'Jane Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body.role).toBe('citizen');
    });

    it('should register with admin role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123',
          name: 'Admin User',
          role: 'admin'
        });

      expect(response.status).toBe(201);
      expect(response.body.role).toBe('admin');
    });

    it('should register with operator role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'operator@example.com',
          password: 'OperPass123',
          name: 'Operator',
          role: 'operator'
        });

      expect(response.status).toBe(201);
      expect(response.body.role).toBe('operator');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'SecurePass123',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'Short1',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('at least 8 characters');
    });

    it('should fail with password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'lowercase123',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('uppercase');
    });

    it('should fail with password without lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'UPPERCASE123',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('lowercase');
    });

    it('should fail with password without number', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'NoNumbers',
          name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('number');
    });

    it('should fail with missing name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123',
          name: 'First User'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123',
          name: 'Second User'
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe',
          role: 'invalid_role'
        });

      expect(response.status).toBe(400);
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'USER@EXAMPLE.COM',
          password: 'SecurePass123',
          name: 'John Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('user@example.com');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe'
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.email).toBe('user@example.com');
      expect(response.body.name).toBe('John Doe');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'SecurePass123'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com'
        });

      expect(response.status).toBe(400);
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'USER@EXAMPLE.COM',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe'
        });

      refreshToken = registerRes.body.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/profile', () => {
    let accessToken;

    beforeEach(async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe',
          role: 'operator'
        });

      accessToken = registerRes.body.accessToken;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body.email).toBe('user@example.com');
      expect(response.body.name).toBe('John Doe');
      expect(response.body.role).toBe('operator');
      expect(response.body.status).toBe('active');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users (admin only)', () => {
    let adminToken;
    let operatorToken;

    beforeEach(async () => {
      const adminRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123',
          name: 'Admin User',
          role: 'admin'
        });

      adminToken = adminRes.body.accessToken;

      const operatorRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'operator@example.com',
          password: 'OperPass123',
          name: 'Operator',
          role: 'operator'
        });

      operatorToken = operatorRes.body.accessToken;

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'citizen@example.com',
          password: 'CitPass123',
          name: 'Citizen',
          role: 'citizen'
        });
    });

    it('should list users as admin', async () => {
      const response = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('pages');
    });

    it('should fail to list users as non-admin', async () => {
      const response = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(403);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users/?role=operator')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((user) => user.role === 'operator')).toBe(true);
    });

    it('should filter users by status', async () => {
      const response = await request(app)
        .get('/api/users/?status=active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((user) => user.status === 'active')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users/?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.meta.page).toBe(1);
    });

    it('should search users', async () => {
      const response = await request(app)
        .get('/api/users/?search=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users/');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/users/:id (admin only)', () => {
    let adminToken;
    let operatorToken;
    let operatorId;

    beforeEach(async () => {
      const adminRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123',
          name: 'Admin User',
          role: 'admin'
        });

      adminToken = adminRes.body.accessToken;

      const operatorRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'operator@example.com',
          password: 'OperPass123',
          name: 'Operator',
          role: 'operator'
        });

      operatorToken = operatorRes.body.accessToken;
      operatorId = operatorRes.body.userId;
    });

    it('should update user role as admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'supervisor'
        });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('supervisor');
    });

    it('should update user status as admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'locked'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('locked');
    });

    it('should update multiple fields', async () => {
      const response = await request(app)
        .patch(`/api/users/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'executor',
          status: 'locked'
        });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('executor');
      expect(response.body.status).toBe('locked');
    });

    it('should fail with non-admin user', async () => {
      const response = await request(app)
        .patch(`/api/users/${operatorId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          role: 'supervisor'
        });

      expect(response.status).toBe(403);
    });

    it('should fail with invalid user ID', async () => {
      const response = await request(app)
        .patch('/api/users/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'supervisor'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .patch('/api/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'supervisor'
        });

      expect(response.status).toBe(404);
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .patch(`/api/users/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'invalid_role'
        });

      expect(response.status).toBe(400);
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/users/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Protected Routes (JWT Verification)', () => {
    let accessToken;

    beforeEach(async () => {
      await resetDatabase();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe',
          role: 'operator'
        });

      accessToken = registerRes.body.accessToken;
    });

    it('should access protected route with valid JWT', async () => {
      const response = await request(app)
        .get('/api/sample/protected')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('protected route');
    });

    it('should fail accessing protected route without JWT', async () => {
      const response = await request(app)
        .get('/api/sample/protected');

      expect(response.status).toBe(401);
    });

    it('should fail accessing protected route with invalid JWT', async () => {
      const response = await request(app)
        .get('/api/sample/protected')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
    });
  });

  describe('Role-Based Access Control', () => {
    let adminToken;
    let operatorToken;

    beforeEach(async () => {
      await resetDatabase();
      const adminRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123',
          name: 'Admin User',
          role: 'admin'
        });

      adminToken = adminRes.body.accessToken;

      const operatorRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'operator@example.com',
          password: 'OperPass123',
          name: 'Operator',
          role: 'operator'
        });

      operatorToken = operatorRes.body.accessToken;
    });

    it('should allow admin to access admin-only route', async () => {
      const response = await request(app)
        .get('/api/sample/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny non-admin from accessing admin-only route', async () => {
      const response = await request(app)
        .get('/api/sample/admin-only')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow supervisor and admin on role-restricted route', async () => {
      const supervisorRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'supervisor@example.com',
          password: 'SuperPass123',
          name: 'Supervisor',
          role: 'supervisor'
        });

      const response = await request(app)
        .get('/api/sample/supervisor-data')
        .set('Authorization', `Bearer ${supervisorRes.body.accessToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny other roles from role-restricted route', async () => {
      const response = await request(app)
        .get('/api/sample/supervisor-data')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Audit Logging', () => {
    beforeEach(async () => {
      await resetDatabase();
    });

    it('should log user registration', async () => {
      const db = getDb();

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe'
        });

      const logs = await db.all('SELECT * FROM audit_log WHERE action = ? AND entity_type = ?', [
        'user_registered',
        'user'
      ]);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].payload).toContain('user@example.com');
    });

    it('should log user login', async () => {
      const db = getDb();

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'John Doe'
        });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123'
        });

      const logs = await db.all('SELECT * FROM audit_log WHERE action = ?', ['user_login']);

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Locked Account', () => {
    let adminToken;
    let userEmail;

    beforeEach(async () => {
      await resetDatabase();
      const adminRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123',
          name: 'Admin User',
          role: 'admin'
        });

      adminToken = adminRes.body.accessToken;

      const userRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          name: 'Regular User'
        });

      userEmail = userRes.body.email;
    });

    it('should prevent login for locked account', async () => {
      const listRes = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${adminToken}`);

      const userId = listRes.body.data.find((u) => u.email === userEmail).userId;

      await request(app)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'locked'
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'SecurePass123'
        });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.message).toContain('locked');
    });
  });
});

async function resetDatabase() {
  const db = getDb();
  await db.exec(`
    DELETE FROM request_proceedings;
    DELETE FROM audit_log;
    DELETE FROM files;
    DELETE FROM requests;
    DELETE FROM users;
  `);
}

async function removeTestDatabase() {
  try {
    await fs.promises.rm(config.DB_PATH, { force: true }).catch(() => {});
  } catch (err) {
    console.error('Error removing test database:', err);
  }
}
