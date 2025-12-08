const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app, bootstrap } = require('../src/app');
const { getDb, closeDb } = require('../src/db');
const { initializeMailer } = require('../src/utils/notifications');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'requests.test.sqlite');

let adminToken;
let operatorToken;
let supervisorToken;
let citizenToken;
let adminUserId;
let operatorUserId;
let testRequestId;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  await bootstrap();
  initializeMailer();

  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'admin@test.com',
      password: 'Admin123!',
      name: 'Test Admin',
      role: 'admin'
    });
  adminToken = adminRes.body.accessToken;
  adminUserId = adminRes.body.userId;

  const operatorRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'operator@test.com',
      password: 'Operator123!',
      name: 'Test Operator',
      role: 'operator'
    });
  operatorToken = operatorRes.body.accessToken;
  operatorUserId = operatorRes.body.userId;

  const supervisorRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'supervisor@test.com',
      password: 'Supervisor123!',
      name: 'Test Supervisor',
      role: 'supervisor'
    });
  supervisorToken = supervisorRes.body.accessToken;

  const citizenRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'citizen@test.com',
      password: 'Citizen123!',
      name: 'Test Citizen',
      role: 'citizen'
    });
  citizenToken = citizenRes.body.accessToken;

  const reqRes = await request(app)
    .post('/api/requests')
    .send({
      citizenFio: 'John Doe',
      description: 'Test request for removal',
      contactEmail: 'john@example.com',
      contactPhone: '1234567890',
      status: 'in_progress',
      priority: 'medium'
    });
  testRequestId = reqRes.body.id;
});

afterAll(async () => {
  await closeDb();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('Remove from Control - Authorization', () => {
  test('allows admin to remove request from control', async () => {
    const res = await request(app)
      .patch(`/api/requests/${testRequestId}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Admin removal test' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('removed');
    expect(res.body.removedFromControlAt).toBeTruthy();
    expect(res.body.removedFromControlBy).toBe('Test Admin');
    expect(res.body.removedFromControlByUserId).toBe(adminUserId);
  });

  test('allows operator to remove request from control', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Jane Doe',
        description: 'Test request for operator removal',
        contactEmail: 'jane@example.com',
        status: 'new'
      });

    const res = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ note: 'Operator removal' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('removed');
    expect(res.body.removedFromControlBy).toBe('Test Operator');
    expect(res.body.removedFromControlByUserId).toBe(operatorUserId);
  });

  test('allows supervisor to remove request from control', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Bob Smith',
        description: 'Test request for supervisor removal',
        contactEmail: 'bob@example.com',
        status: 'in_progress'
      });

    const res = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ note: 'Supervisor removal' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('removed');
    expect(res.body.removedFromControlBy).toBe('Test Supervisor');
  });

  test('denies citizen from removing request from control', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Alice Johnson',
        description: 'Test request',
        status: 'new'
      });

    const res = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ note: 'Citizen removal attempt' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Insufficient permissions');
  });

  test('denies unauthenticated user from removing request from control', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test User',
        description: 'Test request',
        status: 'new'
      });

    const res = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .send({ note: 'Unauthorized removal' });

    expect(res.status).toBe(401);
  });
});

describe('Remove from Control - Functionality', () => {
  test('successfully removes request from control with note', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test Citizen',
        description: 'Request to be removed',
        contactEmail: 'test@example.com',
        status: 'in_progress'
      });

    const removeRes = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Duplicate request found' });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.status).toBe('removed');
    expect(removeRes.body.removedFromControlAt).toBeTruthy();
    expect(removeRes.body.removedFromControlBy).toBe('Test Admin');
    expect(removeRes.body.removedFromControlByUserId).toBe(adminUserId);

    const fetchRes = await request(app)
      .get(`/api/requests/${reqRes.body.id}`);
    
    expect(fetchRes.body.status).toBe('removed');
    expect(fetchRes.body.removedFromControlAt).toBeTruthy();
  });

  test('successfully removes request from control without note', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Another Citizen',
        description: 'Another request',
        status: 'new'
      });

    const removeRes = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({});

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.status).toBe('removed');
  });

  test('prevents duplicate removal', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Duplicate Test',
        description: 'Request for duplicate test',
        status: 'new'
      });

    await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'First removal' });

    const secondRemoval = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Second removal attempt' });

    expect(secondRemoval.status).toBe(400);
    expect(secondRemoval.body.message).toContain('already removed from control');
  });

  test('prevents removal of completed requests', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Completed Request',
        description: 'This is completed',
        status: 'completed'
      });

    const removeRes = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Trying to remove completed' });

    expect(removeRes.status).toBe(400);
    expect(removeRes.body.message).toContain('Cannot remove completed or archived requests');
  });

  test('prevents removal of archived requests', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Archived Request',
        description: 'This is archived',
        status: 'archived'
      });

    const removeRes = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Trying to remove archived' });

    expect(removeRes.status).toBe(400);
    expect(removeRes.body.message).toContain('Cannot remove completed or archived requests');
  });

  test('returns 404 for non-existent request', async () => {
    const res = await request(app)
      .patch('/api/requests/99999/remove-from-control')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('not found');
  });
});

describe('Remove from Control - Audit and Proceedings', () => {
  test('creates audit log entry on removal', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Audit Test',
        description: 'For audit log test',
        status: 'in_progress'
      });

    await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Testing audit log' });

    const db = getDb();
    const auditEntry = await db.get(
      'SELECT * FROM audit_log WHERE request_id = ? AND action = ?',
      [reqRes.body.id, 'remove_from_control']
    );

    expect(auditEntry).toBeTruthy();
    expect(auditEntry.user_id).toBe(adminUserId);
    expect(auditEntry.entity_type).toBe('request');
    const payload = JSON.parse(auditEntry.payload);
    expect(payload.note).toBe('Testing audit log');
    expect(payload.previous_status).toBe('in_progress');
    expect(payload.removed_by).toBe('Test Admin');
  });

  test('creates proceeding entry on removal', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Proceeding Test',
        description: 'For proceeding test',
        status: 'new'
      });

    await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ note: 'Testing proceeding' });

    const db = getDb();
    const proceeding = await db.get(
      'SELECT * FROM request_proceedings WHERE request_id = ? AND action = ?',
      [reqRes.body.id, 'remove_from_control']
    );

    expect(proceeding).toBeTruthy();
    expect(proceeding.notes).toContain('Removed from control');
    expect(proceeding.notes).toContain('Testing proceeding');
  });

  test('creates proceeding entry without note', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Proceeding No Note',
        description: 'For proceeding without note',
        status: 'new'
      });

    await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({});

    const db = getDb();
    const proceeding = await db.get(
      'SELECT * FROM request_proceedings WHERE request_id = ? AND action = ?',
      [reqRes.body.id, 'remove_from_control']
    );

    expect(proceeding).toBeTruthy();
    expect(proceeding.notes).toBe('Removed from control');
  });
});

describe('Remove from Control - Notifications', () => {
  test('sends notification when contact email exists', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Email Test',
        description: 'For email notification test',
        contactEmail: 'emailtest@example.com',
        status: 'in_progress'
      });

    const removeRes = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Notification test' });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.status).toBe('removed');
    expect(removeRes.body.contactEmail).toBe('emailtest@example.com');
  });

  test('handles gracefully when no contact email exists', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'No Email Test',
        description: 'Request without email',
        status: 'new'
      });

    const removeRes = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ note: 'No email test' });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.status).toBe('removed');
  });
});

describe('Remove from Control - Input Validation', () => {
  test('validates note length', async () => {
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Long Note Test',
        description: 'For note validation',
        status: 'new'
      });

    const longNote = 'a'.repeat(1001);
    const res = await request(app)
      .patch(`/api/requests/${reqRes.body.id}/remove-from-control`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: longNote });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeTruthy();
  });

  test('validates request id is numeric', async () => {
    const res = await request(app)
      .patch('/api/requests/invalid/remove-from-control')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Test' });

    expect(res.status).toBe(400);
  });
});
