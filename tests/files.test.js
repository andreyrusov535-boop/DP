const request = require('supertest');
const fs = require('fs');
const { app, bootstrap } = require('../src/app');
const { getDb, closeDb } = require('../src/db');
const config = require('../src/config');

describe('File Management API', () => {
  let operatorToken;
  let supervisorToken;
  let adminToken;
  let citizenToken;

  beforeAll(async () => {
    await resetUploads();
    await bootstrap();
    await resetDatabase();
    
    operatorToken = await createAndRegisterUser('operator@test.com', 'password', 'Operator User', 'operator');
    supervisorToken = await createAndRegisterUser('supervisor@test.com', 'password', 'Supervisor User', 'supervisor');
    adminToken = await createAndRegisterUser('admin@test.com', 'password', 'Admin User', 'admin');
    citizenToken = await createAndRegisterUser('citizen@test.com', 'password', 'Citizen User', 'citizen');
  });

  beforeEach(async () => {
    await resetUploads();
    const db = getDb();
    await db.exec(`
      DELETE FROM files;
      DELETE FROM audit_log;
      DELETE FROM request_proceedings;
      DELETE FROM request_search;
      DELETE FROM requests;
    `);
  });

  afterAll(async () => {
    await resetUploads();
    await closeDb();
    await removeTestDatabase();
  });

  describe('DELETE /api/files/:id - Delete attachment', () => {
    async function createRequestWithAttachments() {
      return request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .field('contactEmail', 'test@example.com')
        .field('contactPhone', '555-1234')
        .attach('attachments', Buffer.from('file-content-1'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .attach('attachments', Buffer.from('file-content-2'), {
          filename: 'image.png',
          contentType: 'image/png'
        });
    }

    it('allows operator to delete attachment', async () => {
      const createResponse = await createRequestWithAttachments();
      expect(createResponse.status).toBe(201);
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      expect(getResponse.body.attachments).toHaveLength(2);
      const fileId = getResponse.body.attachments[0].id;

      const deleteResponse = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('File deleted successfully');

      const afterDelete = await request(app).get(`/api/requests/${requestId}`);
      expect(afterDelete.body.attachments).toHaveLength(1);
      expect(afterDelete.body.attachments[0].originalName).toBe('image.png');
    });

    it('allows supervisor to delete attachment', async () => {
      const createResponse = await createRequestWithAttachments();
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      const fileId = getResponse.body.attachments[0].id;

      const deleteResponse = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('allows admin to delete attachment', async () => {
      const createResponse = await createRequestWithAttachments();
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      const fileId = getResponse.body.attachments[0].id;

      const deleteResponse = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('denies citizen from deleting attachment', async () => {
      const createResponse = await createRequestWithAttachments();
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      const fileId = getResponse.body.attachments[0].id;

      const deleteResponse = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(deleteResponse.status).toBe(403);
    });

    it('denies unauthenticated user from deleting attachment', async () => {
      const createResponse = await createRequestWithAttachments();
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      const fileId = getResponse.body.attachments[0].id;

      const deleteResponse = await request(app).delete(`/api/files/${fileId}`);

      expect(deleteResponse.status).toBe(401);
    });

    it('returns 404 for non-existent file', async () => {
      const deleteResponse = await request(app)
        .delete('/api/files/99999')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(deleteResponse.status).toBe(404);
    });

    it('removes file from disk', async () => {
      const createResponse = await createRequestWithAttachments();
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      const fileId = getResponse.body.attachments[0].id;

      const db = getDb();
      const fileRecord = await db.get('SELECT stored_name FROM files WHERE id = ?', fileId);
      const filePath = require('path').join(config.UPLOAD_DIR, fileRecord.stored_name);

      expect(fs.existsSync(filePath)).toBe(true);

      await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('writes audit log entry when deleting attachment', async () => {
      const createResponse = await createRequestWithAttachments();
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      const fileId = getResponse.body.attachments[0].id;

      const db = getDb();
      const beforeResponse = await db.get('SELECT COUNT(*) as count FROM audit_log WHERE action = ?', 'delete_attachment');
      const beforeCount = beforeResponse ? beforeResponse.count : 0;

      await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      const afterResponse = await db.get('SELECT COUNT(*) as count FROM audit_log WHERE action = ?', 'delete_attachment');
      const afterCount = afterResponse ? afterResponse.count : 0;
      expect(afterCount).toBeGreaterThan(beforeCount);

      const auditEntry = await db.get('SELECT * FROM audit_log WHERE action = ? ORDER BY id DESC LIMIT 1', 'delete_attachment');
      expect(auditEntry).toBeTruthy();
      expect(auditEntry.entity_type).toBe('attachment');
      expect(auditEntry.request_id).toBe(requestId);
      expect(auditEntry.user_id).not.toBeNull();
    });

    it('creates proceeding entry when deleting attachment', async () => {
      const createResponse = await createRequestWithAttachments();
      const requestId = createResponse.body.id;
      
      const getResponse = await request(app).get(`/api/requests/${requestId}`);
      const fileId = getResponse.body.attachments[0].id;
      const originalName = getResponse.body.attachments[0].originalName;

      const deleteResponse = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(deleteResponse.status).toBe(200);

      const db = getDb();
      const proceeding = await db.get('SELECT * FROM request_proceedings WHERE action = ? AND request_id = ? ORDER BY id DESC LIMIT 1', 'delete_attachment', requestId);
      expect(proceeding).toBeTruthy();
      expect(proceeding.request_id).toBe(requestId);
      expect(proceeding.notes).toContain(originalName);
    });
  });

  describe('Multi-file upload validation', () => {
    it('rejects invalid mime types', async () => {
      const createResponse = await request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .attach('attachments', Buffer.from('executable-content'), {
          filename: 'virus.exe',
          contentType: 'application/x-msdownload'
        });

      expect(createResponse.status).toBe(400);
      expect(createResponse.body.message.toLowerCase()).toContain('type');
    });

    it('rejects oversized files', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const createResponse = await request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .attach('attachments', largeBuffer, {
          filename: 'large.pdf',
          contentType: 'application/pdf'
        });

      expect(createResponse.status).toBe(400);
      expect(createResponse.body.message.toLowerCase()).toMatch(/size|large/);
    });

    it('rejects exceeding attachment limit in create', async () => {
      const createResponse = await request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .attach('attachments', Buffer.from('file-1'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-2'), { filename: 'b.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-3'), { filename: 'c.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-4'), { filename: 'd.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-5'), { filename: 'e.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-6'), { filename: 'f.pdf', contentType: 'application/pdf' });

      expect(createResponse.status).toBe(400);
    });

    it('accepts exactly 5 valid files', async () => {
      const createResponse = await request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .attach('attachments', Buffer.from('file-1'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-2'), { filename: 'b.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-3'), { filename: 'c.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-4'), { filename: 'd.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-5'), { filename: 'e.pdf', contentType: 'application/pdf' });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.attachments).toHaveLength(5);
    });

    it('rejects exceeding attachment limit on update', async () => {
      const createResponse = await request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .attach('attachments', Buffer.from('file-1'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-2'), { filename: 'b.pdf', contentType: 'application/pdf' });

      const requestId = createResponse.body.id;

      const patchResponse = await request(app)
        .patch(`/api/requests/${requestId}`)
        .field('description', 'Updated')
        .attach('attachments', Buffer.from('file-3'), { filename: 'c.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-4'), { filename: 'd.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-5'), { filename: 'e.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-6'), { filename: 'f.pdf', contentType: 'application/pdf' });

      expect(patchResponse.status).toBe(400);
      expect(patchResponse.body.message.toLowerCase()).toContain('limit');
    });

    it('allows adding files up to limit on update', async () => {
      const createResponse = await request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .attach('attachments', Buffer.from('file-1'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-2'), { filename: 'b.pdf', contentType: 'application/pdf' });

      const requestId = createResponse.body.id;

      const patchResponse = await request(app)
        .patch(`/api/requests/${requestId}`)
        .field('description', 'Updated')
        .attach('attachments', Buffer.from('file-3'), { filename: 'c.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-4'), { filename: 'd.pdf', contentType: 'application/pdf' })
        .attach('attachments', Buffer.from('file-5'), { filename: 'e.pdf', contentType: 'application/pdf' });

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.attachments).toHaveLength(5);
    });

    it('includes attachment metadata in response', async () => {
      const createResponse = await request(app)
        .post('/api/requests')
        .field('citizenFio', 'Test Citizen')
        .field('description', 'Test request')
        .attach('attachments', Buffer.from('test-content'), {
          filename: 'document.pdf',
          contentType: 'application/pdf'
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.attachments).toHaveLength(1);
      const attachment = createResponse.body.attachments[0];
      expect(attachment).toHaveProperty('id');
      expect(attachment).toHaveProperty('originalName');
      expect(attachment.originalName).toBe('document.pdf');
      expect(attachment).toHaveProperty('mimeType');
      expect(attachment.mimeType).toBe('application/pdf');
      expect(attachment).toHaveProperty('size');
      expect(attachment.size).toBeGreaterThan(0);
      expect(attachment).toHaveProperty('createdAt');
      expect(attachment).toHaveProperty('downloadUrl');
      expect(attachment.downloadUrl).toBe(`/api/files/${attachment.id}/download`);
    });
  });
});

async function createAndRegisterUser(email, password, name, role) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password: 'SecurePass123',
      name,
      role
    });
  return response.body.accessToken;
}

async function resetDatabase() {
  const db = getDb();
  await db.exec(`
    DELETE FROM files;
    DELETE FROM audit_log;
    DELETE FROM request_proceedings;
    DELETE FROM request_search;
    DELETE FROM requests;
    DELETE FROM users;
  `);
}

async function resetUploads() {
  await fs.promises.rm(config.UPLOAD_DIR, { recursive: true, force: true }).catch(() => {});
  await fs.promises.mkdir(config.UPLOAD_DIR, { recursive: true });
}

async function removeTestDatabase() {
  await fs.promises.rm(config.DB_PATH, { force: true }).catch(() => {});
}
