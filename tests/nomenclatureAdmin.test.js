const request = require('supertest');
const fs = require('fs');
const { app, bootstrap } = require('../src/app');
const { getDb, closeDb } = require('../src/db');
const config = require('../src/config');

describe('Nomenclature Admin CRUD API', () => {
  let supervisorToken;
  let adminToken;
  let citizenToken;

  beforeAll(async () => {
    await bootstrap();
  });

  beforeEach(async () => {
    await resetDatabase();

    // Create test users
    const supervisorRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'supervisor@test.com',
        password: 'TestPass123',
        name: 'Supervisor User',
        role: 'supervisor'
      });
    supervisorToken = supervisorRes.body.accessToken;

    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@test.com',
        password: 'AdminPass123',
        name: 'Admin User',
        role: 'admin'
      });
    adminToken = adminRes.body.accessToken;

    const citizenRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'citizen@test.com',
        password: 'CitizenPass123',
        name: 'Citizen User',
        role: 'citizen'
      });
    citizenToken = citizenRes.body.accessToken;
  });

  afterAll(async () => {
    await closeDb();
    await removeTestDatabase();
  });

  describe('Authorization', () => {
    it('denies access to citizens', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/insufficient|not authorized/i);
    });

    it('allows access to supervisors', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
    });

    it('allows access to admins', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('denies unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/nomenclature-admin/:entity', () => {
    it('lists request types with pagination', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
      expect(response.body.items).toBeInstanceOf(Array);
    });

    it('lists request topics', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_topics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
    });

    it('lists intake forms', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/intake_forms')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
    });

    it('lists social groups', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/social_groups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
    });

    it('excludes inactive items by default', async () => {
      // First create an item
      await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST1', name: 'Test Type' });

      // Deactivate the first default type
      const listRes = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`);

      const firstId = listRes.body.items[0].id;
      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${firstId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });

      // List again - inactive item should be excluded
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.items.every(item => item.active === 1)).toBe(true);
    });

    it('includes inactive items when requested', async () => {
      // Create and deactivate an item
      const createRes = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST2', name: 'Test Type 2' });

      const itemId = createRes.body.id;

      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${itemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });

      // List with includeInactive
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ includeInactive: true });

      expect(response.status).toBe(200);
      const inactiveItems = response.body.items.filter(item => item.active === 0);
      expect(inactiveItems.length).toBeGreaterThan(0);
    });

    it('validates pagination parameters', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .query({ limit: 200, offset: -1 });

      expect(response.status).toBe(400);
    });

    it('rejects invalid entity names', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/invalid_entity')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/nomenclature-admin/:entity/:id', () => {
    it('retrieves a specific item', async () => {
      const listRes = await request(app)
        .get('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${supervisorToken}`);

      const itemId = listRes.body.items[0].id;

      const response = await request(app)
        .get(`/api/nomenclature-admin/request_types/${itemId}`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(itemId);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('active');
    });

    it('returns error for non-existent item', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types/99999')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('validates id parameter', async () => {
      const response = await request(app)
        .get('/api/nomenclature-admin/request_types/invalid')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/nomenclature-admin/:entity', () => {
    it('creates a new request type', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NEWTYPE001',
          name: 'New Request Type'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe('NEWTYPE001');
      expect(response.body.name).toBe('New Request Type');
      expect(response.body.active).toBe(1);
    });

    it('creates a new topic', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_topics')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          code: 'TOPIC001',
          name: 'New Topic'
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('TOPIC001');
    });

    it('creates a new intake form', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/intake_forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'IF003',
          name: 'New Intake Form'
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('IF003');
    });

    it('creates a new social group', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/social_groups')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          code: 'SG003',
          name: 'New Social Group'
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('SG003');
    });

    it('normalizes code to uppercase', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'lowercase123',
          name: 'Test Item'
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('LOWERCASE123');
    });

    it('trims whitespace from code and name', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: '  CODE123  ',
          name: '  Test Item  '
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('CODE123');
      expect(response.body.name).toBe('Test Item');
    });

    it('rejects duplicate codes', async () => {
      const code = 'DUPCODE123';

      // Create first item
      await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code, name: 'First Item' });

      // Try to create second with same code
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code, name: 'Second Item' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('requires code', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Item'
        });

      expect(response.status).toBe(400);
    });

    it('requires name', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CODE123'
        });

      expect(response.status).toBe(400);
    });

    it('rejects empty code', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: '   ',
          name: 'Test Item'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/cannot be empty/i);
    });

    it('rejects empty name', async () => {
      const response = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'CODE123',
          name: '   '
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/cannot be empty/i);
    });

    it('logs audit entry for creation', async () => {
      await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'AUDIT001',
          name: 'Audit Test'
        });

      const db = getDb();
      const auditLog = await db.get(
        'SELECT * FROM audit_log WHERE action = ? AND entity_type = ? ORDER BY created_at DESC LIMIT 1',
        ['create', 'request_types']
      );

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('create');
      expect(auditLog.entity_type).toBe('request_types');
    });
  });

  describe('PATCH /api/nomenclature-admin/:entity/:id', () => {
    let testItemId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TESTITEM',
          name: 'Original Name'
        });
      testItemId = createRes.body.id;
    });

    it('updates code', async () => {
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NEWCODE'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('NEWCODE');
      expect(response.body.name).toBe('Original Name');
    });

    it('updates name', async () => {
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.code).toBe('TESTITEM');
    });

    it('updates both code and name', async () => {
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NEWCODE2',
          name: 'New Name 2'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('NEWCODE2');
      expect(response.body.name).toBe('New Name 2');
    });

    it('requires at least one field', async () => {
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('rejects duplicate code', async () => {
      // Create another item
      await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'EXISTING', name: 'Existing Item' });

      // Try to update first item to use same code
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'EXISTING'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('logs audit entry for update', async () => {
      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name'
        });

      const db = getDb();
      const auditLog = await db.get(
        'SELECT * FROM audit_log WHERE action = ? AND entity_type = ? ORDER BY created_at DESC LIMIT 1',
        ['update', 'request_types']
      );

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('update');
    });
  });

  describe('PATCH /api/nomenclature-admin/:entity/:id/toggle', () => {
    let testItemId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TOGGLETEST',
          name: 'Toggle Test'
        });
      testItemId = createRes.body.id;
    });

    it('deactivates an active item', async () => {
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(0);
    });

    it('activates an inactive item', async () => {
      // First deactivate
      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });

      // Then activate
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: true });

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(1);
    });

    it('requires active parameter', async () => {
      const response = await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('logs audit entry for deactivation', async () => {
      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });

      const db = getDb();
      const auditLog = await db.get(
        'SELECT * FROM audit_log WHERE action = ? AND entity_type = ? ORDER BY created_at DESC LIMIT 1',
        ['deactivate', 'request_types']
      );

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('deactivate');
    });

    it('logs audit entry for activation', async () => {
      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });

      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${testItemId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: true });

      const db = getDb();
      const auditLog = await db.get(
        'SELECT * FROM audit_log WHERE action = ? AND entity_type = ? ORDER BY created_at DESC LIMIT 1',
        ['activate', 'request_types']
      );

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('activate');
    });
  });

  describe('Integration with Request Creation', () => {
    it('allows newly created types in request forms', async () => {
      // Create a new type
      const typeRes = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NEWTYPE',
          name: 'New Request Type for Integration'
        });

      const newTypeId = typeRes.body.id;

      // Verify it appears in nomenclature list
      const nomRes = await request(app)
        .get('/api/nomenclature');

      const foundType = nomRes.body.types.find(t => t.id === newTypeId);
      expect(foundType).toBeDefined();
      expect(foundType.code).toBe('NEWTYPE');
    });

    it('excludes deactivated types from nomenclature', async () => {
      // Create a new type
      const typeRes = await request(app)
        .post('/api/nomenclature-admin/request_types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'DEACTIVETYPE',
          name: 'Type to Deactivate'
        });

      const typeId = typeRes.body.id;

      // Deactivate it
      await request(app)
        .patch(`/api/nomenclature-admin/request_types/${typeId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });

      // Verify it's not in active list
      const nomRes = await request(app)
        .get('/api/nomenclature');

      const foundType = nomRes.body.types.find(t => t.id === typeId);
      expect(foundType).toBeUndefined();
    });
  });
});

async function resetDatabase() {
  const db = getDb();
  // Delete in order to respect foreign keys
  await db.run('DELETE FROM deadline_notifications');
  await db.run('DELETE FROM files');
  await db.run('DELETE FROM audit_log');
  await db.run('DELETE FROM request_proceedings');
  await db.run('DELETE FROM request_search');
  await db.run('DELETE FROM requests');
  await db.run('DELETE FROM users');
  await db.run('DELETE FROM request_types');
  await db.run('DELETE FROM request_topics');
  await db.run('DELETE FROM intake_forms');
  await db.run('DELETE FROM social_groups');

  // Re-seed the nomenclature tables
  await db.run(`
    INSERT INTO request_types (code, name, active) VALUES 
    ('RT001', 'Type 1', 1),
    ('RT002', 'Type 2', 1)
  `);

  await db.run(`
    INSERT INTO request_topics (code, name, active) VALUES 
    ('TP001', 'Topic 1', 1),
    ('TP002', 'Topic 2', 1)
  `);

  await db.run(`
    INSERT INTO intake_forms (code, name, active) VALUES 
    ('IF001', 'Form 1', 1),
    ('IF002', 'Form 2', 1)
  `);

  await db.run(`
    INSERT INTO social_groups (code, name, active) VALUES 
    ('SG001', 'Group 1', 1),
    ('SG002', 'Group 2', 1)
  `);
}

async function removeTestDatabase() {
  await fs.promises.rm(config.DB_PATH, { force: true }).catch(() => {});
}
