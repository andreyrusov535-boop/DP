const request = require('supertest');
const { app, bootstrap } = require('../src/app');
const { getDb, closeDb } = require('../src/db');
const config = require('../src/config');
const fs = require('fs');
const path = require('path');

describe('Reporting API', () => {
  let supervisorToken;
  let citizenToken;
  let adminToken;

  beforeAll(async () => {
    await bootstrap();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedTestData();
    supervisorToken = await createUserAndGetToken('supervisor@test.com', 'supervisor');
    adminToken = await createUserAndGetToken('admin@test.com', 'admin');
    citizenToken = await createUserAndGetToken('citizen@test.com', 'citizen');
  });

  afterAll(async () => {
    await closeDb();
    await removeTestDatabase();
  });

  describe('GET /api/reports/overview', () => {
    it('returns aggregated overview for supervisor', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byTopic');
      expect(response.body).toHaveProperty('byExecutor');
      expect(response.body).toHaveProperty('byTerritory');
      expect(response.body).toHaveProperty('bySocialGroup');
      expect(response.body).toHaveProperty('byIntakeForm');
      expect(response.body).toHaveProperty('byPriority');

      expect(response.body.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.byStatus)).toBe(true);
      expect(Array.isArray(response.body.byPriority)).toBe(true);
    });

    it('returns aggregated overview for admin', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('denies access for citizen role', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('denies access without authentication', async () => {
      const response = await request(app).get('/api/reports/overview');

      expect(response.status).toBe(401);
    });

    it('filters overview by status', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .query({ status: 'new' })
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.byStatus.length).toBeLessThanOrEqual(1);
      if (response.body.byStatus.length > 0) {
        expect(response.body.byStatus[0].status).toBe('new');
      }
    });

    it('filters overview by priority', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .query({ priority: 'high' })
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.byPriority.length).toBeLessThanOrEqual(1);
    });

    it('filters overview by date range', async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/reports/overview')
        .query({ date_from: dateFrom, date_to: dateTo })
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('validates invalid status', async () => {
      const response = await request(app)
        .get('/api/reports/overview')
        .query({ status: 'invalid_status' })
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/reports/dynamics', () => {
    it('returns time-series data grouped by day', async () => {
      const response = await request(app)
        .get('/api/reports/dynamics')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('groupBy');
      expect(response.body).toHaveProperty('series');
      expect(Array.isArray(response.body.series)).toBe(true);
      expect(response.body.groupBy).toBe('daily');

      if (response.body.series.length > 0) {
        const firstItem = response.body.series[0];
        expect(firstItem).toHaveProperty('period');
        expect(firstItem).toHaveProperty('total');
        expect(firstItem).toHaveProperty('new');
        expect(firstItem).toHaveProperty('inProgress');
        expect(firstItem).toHaveProperty('completed');
      }
    });

    it('returns time-series data grouped by week', async () => {
      const response = await request(app)
        .get('/api/reports/dynamics')
        .query({ groupBy: 'weekly' })
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.groupBy).toBe('weekly');
      expect(Array.isArray(response.body.series)).toBe(true);
    });

    it('denies access for citizen role', async () => {
      const response = await request(app)
        .get('/api/reports/dynamics')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(response.status).toBe(403);
    });

    it('validates groupBy parameter', async () => {
      const response = await request(app)
        .get('/api/reports/dynamics')
        .query({ groupBy: 'monthly' })
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/reports/export', () => {
    it('generates Excel export for supervisor', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .buffer()
        .parse((res, callback) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(response.headers['content-disposition']).toMatch(/^attachment; filename="report-\d+\.xlsx"$/);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('generates PDF export for admin', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .query({ format: 'pdf' })
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer()
        .parse((res, callback) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/^attachment; filename="report-\d+\.pdf"$/);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('denies export for citizen role', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(response.status).toBe(403);
    });

    it('requires format parameter', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(400);
    });

    it('validates format parameter', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(400);
    });

    it('exports with applied filters', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .query({ format: 'excel', status: 'new', priority: 'high' })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .buffer()
        .parse((res, callback) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Audit logging', () => {
    it('logs overview report access', async () => {
      await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${supervisorToken}`);

      const db = getDb();
      const logs = await db.all(
        "SELECT * FROM audit_log WHERE action = 'view_overview' AND entity_type = 'report' ORDER BY created_at DESC LIMIT 1"
      );

      expect(logs.length).toBe(1);
      expect(logs[0].user_id).toBeGreaterThan(0);
    });

    it('logs dynamics report access', async () => {
      await request(app)
        .get('/api/reports/dynamics')
        .set('Authorization', `Bearer ${supervisorToken}`);

      const db = getDb();
      const logs = await db.all(
        "SELECT * FROM audit_log WHERE action = 'view_dynamics' AND entity_type = 'report' ORDER BY created_at DESC LIMIT 1"
      );

      expect(logs.length).toBe(1);
    });

    it('logs Excel export generation', async () => {
      await request(app)
        .get('/api/reports/export')
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .buffer()
        .parse((res, callback) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      const db = getDb();
      const logs = await db.all(
        "SELECT * FROM audit_log WHERE action = 'export_excel' AND entity_type = 'report' ORDER BY created_at DESC LIMIT 1"
      );

      expect(logs.length).toBe(1);
    });

    it('logs PDF export generation', async () => {
      await request(app)
        .get('/api/reports/export')
        .query({ format: 'pdf' })
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer()
        .parse((res, callback) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      const db = getDb();
      const logs = await db.all(
        "SELECT * FROM audit_log WHERE action = 'export_pdf' AND entity_type = 'report' ORDER BY created_at DESC LIMIT 1"
      );

      expect(logs.length).toBe(1);
    });
  });

  describe('Performance and data integrity', () => {
    it('handles empty dataset gracefully', async () => {
      const db = getDb();
      await db.run('DELETE FROM requests');

      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
      expect(response.body.byStatus).toEqual([]);
    });

    it('aggregates data correctly', async () => {
      const db = getDb();
      await db.run('DELETE FROM requests');

      await createTestRequest({ status: 'new', priority: 'high' });
      await createTestRequest({ status: 'new', priority: 'medium' });
      await createTestRequest({ status: 'in_progress', priority: 'high' });

      const response = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);

      const newStatus = response.body.byStatus.find((s) => s.status === 'new');
      expect(newStatus.count).toBe(2);

      const inProgressStatus = response.body.byStatus.find((s) => s.status === 'in_progress');
      expect(inProgressStatus.count).toBe(1);

      const highPriority = response.body.byPriority.find((p) => p.priority === 'high');
      expect(highPriority.count).toBe(2);
    });
  });
});

// Helper functions
async function resetDatabase() {
  const db = getDb();
  await db.run('DELETE FROM files');
  await db.run('DELETE FROM request_proceedings');
  await db.run('DELETE FROM audit_log');
  await db.run('DELETE FROM requests');
  await db.run('DELETE FROM users');
}

async function removeTestDatabase() {
  if (fs.existsSync(config.DB_PATH)) {
    fs.unlinkSync(config.DB_PATH);
  }
}

async function seedTestData() {
  await createTestRequest({
    citizenFio: 'John Doe',
    description: 'Water supply issue',
    status: 'new',
    priority: 'high',
    executor: 'Executor A',
    territory: 'District 1',
    requestTypeId: 1,
    requestTopicId: 1,
    socialGroupId: 1,
    intakeFormId: 1
  });

  await createTestRequest({
    citizenFio: 'Jane Smith',
    description: 'Street lighting problem',
    status: 'in_progress',
    priority: 'medium',
    executor: 'Executor B',
    territory: 'District 2',
    requestTypeId: 2,
    requestTopicId: 2,
    socialGroupId: 2,
    intakeFormId: 2
  });

  await createTestRequest({
    citizenFio: 'Bob Wilson',
    description: 'Housing maintenance',
    status: 'completed',
    priority: 'low',
    executor: 'Executor A',
    territory: 'District 1',
    requestTypeId: 3,
    requestTopicId: 3,
    socialGroupId: 3,
    intakeFormId: 3
  });

  await createTestRequest({
    citizenFio: 'Alice Brown',
    description: 'Emergency repair',
    status: 'new',
    priority: 'urgent',
    executor: 'Executor C',
    territory: 'District 3'
  });
}

async function createTestRequest(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const dueDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const sql = `
    INSERT INTO requests (
      citizen_fio, description, status, priority, executor, 
      territory, request_type_id, request_topic_id, 
      social_group_id, intake_form_id, due_date, 
      control_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await db.run(sql, [
    data.citizenFio || 'Test Citizen',
    data.description || 'Test description',
    data.status || 'new',
    data.priority || 'medium',
    data.executor || null,
    data.territory || null,
    data.requestTypeId || null,
    data.requestTopicId || null,
    data.socialGroupId || null,
    data.intakeFormId || null,
    data.dueDate || dueDate,
    data.controlStatus || 'normal',
    now,
    now
  ]);

  return result.lastID;
}

async function createUserAndGetToken(email, role) {
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const db = getDb();

  const passwordHash = await bcrypt.hash('Test123!', 10);
  const now = new Date().toISOString();

  const result = await db.run(
    `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [email, passwordHash, `Test ${role}`, role, 'active', now, now]
  );

  const token = jwt.sign(
    { userId: result.lastID, email, role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY }
  );

  return token;
}
