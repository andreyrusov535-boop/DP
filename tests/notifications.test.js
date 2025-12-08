const request = require('supertest');
const { app, bootstrap } = require('../src/app');
const { getDb, closeDb } = require('../src/db');
const config = require('../src/config');
const { runNotificationJob } = require('../src/services/notificationService');
const { createUser } = require('../src/models/userModel');
const { hashPassword } = require('../src/services/authService');

describe('Notification system', () => {
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

  it('sends due_soon notification to executor 24 hours before deadline', async () => {
    const db = getDb();
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create executor user
    const executorUserResult = await db.run(
      `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'executor@example.com',
        await hashPassword('Executor123'),
        'John Executor',
        'executor',
        'active',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const executorUserId = executorUserResult.lastID;

    // Create request with due date in 24 hours
    const requestResult = await db.run(
      `INSERT INTO requests (
        citizen_fio, description, status, executor, executor_user_id,
        due_date, control_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Citizen',
        'Test request',
        'in_progress',
        'John Executor',
        executorUserId,
        in24Hours.toISOString(),
        'normal',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const requestId = requestResult.lastID;

    // Run notification job
    await runNotificationJob();

    // Verify notification was recorded
    const notification = await db.get(
      `SELECT * FROM deadline_notifications WHERE request_id = ? AND notification_type = 'due_soon'`,
      [requestId]
    );
    expect(notification).toBeDefined();
    expect(notification.target_user_id).toBe(executorUserId);
  });

  it('does not send duplicate due_soon notifications', async () => {
    const db = getDb();
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create executor user
    const executorUserResult = await db.run(
      `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'executor2@example.com',
        await hashPassword('Executor123'),
        'Jane Executor',
        'executor',
        'active',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const executorUserId = executorUserResult.lastID;

    // Create request with due date in 24 hours
    const requestResult = await db.run(
      `INSERT INTO requests (
        citizen_fio, description, status, executor, executor_user_id,
        due_date, control_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Citizen 2',
        'Test request 2',
        'in_progress',
        'Jane Executor',
        executorUserId,
        in24Hours.toISOString(),
        'normal',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const requestId = requestResult.lastID;

    // Run notification job first time
    await runNotificationJob();

    // Verify first notification was recorded
    const firstNotification = await db.get(
      `SELECT COUNT(*) as count FROM deadline_notifications WHERE request_id = ? AND notification_type = 'due_soon'`,
      [requestId]
    );
    expect(firstNotification.count).toBe(1);

    // Run notification job again
    await runNotificationJob();

    // Verify no second notification was created
    const secondCheck = await db.get(
      `SELECT COUNT(*) as count FROM deadline_notifications WHERE request_id = ? AND notification_type = 'due_soon'`,
      [requestId]
    );
    expect(secondCheck.count).toBe(1);
  });

  it('sends overdue notification to supervisors and admins', async () => {
    const db = getDb();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Create executor user
    const executorUserResult = await db.run(
      `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'executor3@example.com',
        await hashPassword('Executor123'),
        'Bob Executor',
        'executor',
        'active',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const executorUserId = executorUserResult.lastID;

    // Create supervisor
    const supervisorResult = await db.run(
      `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'supervisor@example.com',
        await hashPassword('Supervisor123'),
        'Alice Supervisor',
        'supervisor',
        'active',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const supervisorId = supervisorResult.lastID;

    // Create admin
    const adminResult = await db.run(
      `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'admin@example.com',
        await hashPassword('Admin123'),
        'Charlie Admin',
        'admin',
        'active',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const adminId = adminResult.lastID;

    // Create overdue request
    const requestResult = await db.run(
      `INSERT INTO requests (
        citizen_fio, description, status, executor, executor_user_id,
        due_date, control_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Citizen 3',
        'Overdue request',
        'in_progress',
        'Bob Executor',
        executorUserId,
        yesterday.toISOString(),
        'overdue',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const requestId = requestResult.lastID;

    // Run notification job
    await runNotificationJob();

    // Verify notifications were sent to both supervisor and admin
    const notifications = await db.all(
      `SELECT * FROM deadline_notifications WHERE request_id = ? AND notification_type = 'overdue' ORDER BY target_user_id`,
      [requestId]
    );
    expect(notifications.length).toBeGreaterThanOrEqual(2);

    const supervisorNotification = notifications.find((n) => n.target_user_id === supervisorId);
    const adminNotification = notifications.find((n) => n.target_user_id === adminId);

    expect(supervisorNotification).toBeDefined();
    expect(adminNotification).toBeDefined();
  });

  it('does not send due_soon notification for completed or archived requests', async () => {
    const db = getDb();
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create executor user
    const executorUserResult = await db.run(
      `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'executor4@example.com',
        await hashPassword('Executor123'),
        'Dave Executor',
        'executor',
        'active',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const executorUserId = executorUserResult.lastID;

    // Create completed request
    const completedResult = await db.run(
      `INSERT INTO requests (
        citizen_fio, description, status, executor, executor_user_id,
        due_date, control_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Citizen 4',
        'Completed request',
        'completed',
        'Dave Executor',
        executorUserId,
        in24Hours.toISOString(),
        'normal',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const completedId = completedResult.lastID;

    // Create archived request
    const archivedResult = await db.run(
      `INSERT INTO requests (
        citizen_fio, description, status, executor, executor_user_id,
        due_date, control_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Citizen 5',
        'Archived request',
        'archived',
        'Dave Executor',
        executorUserId,
        in24Hours.toISOString(),
        'normal',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const archivedId = archivedResult.lastID;

    // Run notification job
    await runNotificationJob();

    // Verify no notifications were sent
    const completedNotification = await db.get(
      `SELECT COUNT(*) as count FROM deadline_notifications WHERE request_id = ?`,
      [completedId]
    );
    const archivedNotification = await db.get(
      `SELECT COUNT(*) as count FROM deadline_notifications WHERE request_id = ?`,
      [archivedId]
    );

    expect(completedNotification.count).toBe(0);
    expect(archivedNotification.count).toBe(0);
  });

  it('allows assigning executor via executorUserId', async () => {
    // Create executor user
    const createdUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newexecutor@example.com',
        password: 'NewExecutor123',
        name: 'New Executor',
        role: 'executor'
      });

    expect(createdUserResponse.status).toBe(201);
    const executorUserId = createdUserResponse.body.userId;

    // Create request with executor
    const createResponse = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test Citizen',
        description: 'Test request',
        executorUserId,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.executorUserId).toBe(executorUserId);

    // Fetch and verify
    const getResponse = await request(app).get(`/api/requests/${createResponse.body.id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.executorUserId).toBe(executorUserId);
  });

  it('rejects invalid executorUserId', async () => {
    const createResponse = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test Citizen',
        description: 'Test request',
        executorUserId: 99999,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });

    expect(createResponse.status).toBe(400);
    expect(createResponse.body.message).toContain('Invalid executor user');
  });

  it('rejects executor with non-executor role', async () => {
    // Create citizen user
    const createdUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'citizen@example.com',
        password: 'Citizen123',
        name: 'Test Citizen',
        role: 'citizen'
      });

    const citizenUserId = createdUserResponse.body.userId;

    // Try to assign as executor
    const createResponse = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test Citizen',
        description: 'Test request',
        executorUserId: citizenUserId,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });

    expect(createResponse.status).toBe(400);
    expect(createResponse.body.message).toContain('executor');
  });

  it('rejects executor with locked status', async () => {
    const db = getDb();
    const now = new Date();

    // Create locked executor
    const result = await db.run(
      `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'locked@example.com',
        await hashPassword('Locked123'),
        'Locked User',
        'executor',
        'locked',
        now.toISOString(),
        now.toISOString()
      ]
    );
    const lockedUserId = result.lastID;

    // Try to assign locked executor
    const createResponse = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test Citizen',
        description: 'Test request',
        executorUserId: lockedUserId,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });

    expect(createResponse.status).toBe(400);
    expect(createResponse.body.message).toContain('active status');
  });

  it('allows updating executorUserId via PATCH', async () => {
    // Create two executor users
    const exec1Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'exec1@example.com',
        password: 'Exec1Pass123',
        name: 'Executor One',
        role: 'executor'
      });
    const exec1Id = exec1Response.body.userId;

    const exec2Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'exec2@example.com',
        password: 'Exec2Pass123',
        name: 'Executor Two',
        role: 'executor'
      });
    const exec2Id = exec2Response.body.userId;

    // Create request with first executor
    const createResponse = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test Citizen',
        description: 'Test request',
        executorUserId: exec1Id,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
    const requestId = createResponse.body.id;

    // Update to second executor
    const updateResponse = await request(app)
      .patch(`/api/requests/${requestId}`)
      .send({
        executorUserId: exec2Id
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.executorUserId).toBe(exec2Id);
  });

  it('handles requests without executor gracefully', async () => {
    const createResponse = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Test Citizen',
        description: 'Test request without executor',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.executorUserId).toBeNull();

    // Run notification job - should not error
    await runNotificationJob();
  });
});

async function resetDatabase() {
  const db = getDb();
  await db.exec('DELETE FROM deadline_notifications');
  await db.exec('DELETE FROM audit_log');
  await db.exec('DELETE FROM files');
  await db.exec('DELETE FROM request_proceedings');
  await db.exec('DELETE FROM requests');
  await db.exec('DELETE FROM users');
}

async function removeTestDatabase() {
  const fs = require('fs');
  const path = require('path');
  const testDbPath = config.DB_PATH;
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}
