const request = require('supertest');
const fs = require('fs');
const { app, bootstrap } = require('../src/app');
const { getDb, closeDb } = require('../src/db');
const config = require('../src/config');

const downloadParser = (res, callback) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('Request workflow API', () => {
  beforeAll(async () => {
    await resetUploads();
    await bootstrap();
  });

  beforeEach(async () => {
    await resetDatabase();
    await resetUploads();
  });

  afterAll(async () => {
    await resetUploads();
    await closeDb();
    await removeTestDatabase();
  });

  it('creates a request with attachments and persists metadata', async () => {
    const dueDate = futureHours(72);
    const response = await request(app)
      .post('/api/requests')
      .field('citizenFio', 'Jane Citizen')
      .field('description', 'Need help with lighting issue')
      .field('contactEmail', 'jane@example.com')
      .field('contactPhone', '555-1234')
      .field('requestTypeId', '1')
      .field('requestTopicId', '1')
      .field('dueDate', dueDate)
      .attach('attachments', Buffer.from('file-1'), {
        filename: 'evidence.pdf',
        contentType: 'application/pdf'
      })
      .attach('attachments', Buffer.from('file-2'), {
        filename: 'photo.png',
        contentType: 'image/png'
      });

    expect(response.status).toBe(201);
    expect(response.body.attachments).toHaveLength(2);
    expect(response.body.controlStatus).toBe('normal');
    expect(response.body.citizenFio).toBe('Jane Citizen');
  });

  it('filters requests by status, executor, and search with pagination', async () => {
    await createJsonRequest({
      citizenFio: 'Alice Example',
      description: 'Water pipeline broken',
      status: 'in_progress',
      executor: 'Operator X',
      priority: 'high',
      dueDate: futureHours(4)
    });
    await createJsonRequest({
      citizenFio: 'Bob Example',
      description: 'Street lamp outage',
      status: 'new',
      executor: 'Operator Y',
      priority: 'medium',
      dueDate: futureHours(120)
    });
    await createJsonRequest({
      citizenFio: 'Charlie Example',
      description: 'General inquiry',
      status: 'completed',
      executor: 'Operator Z',
      priority: 'low',
      dueDate: pastHours(4)
    });

    const response = await request(app)
      .get('/api/requests')
      .query({ status: 'in_progress', search: 'pipeline', executor: 'operator x', limit: 1, page: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].citizenFio).toBe('Alice Example');
    expect(response.body.data[0].controlStatus).toBe('approaching');
  });

  it('recalculates control status on patch and logs proceedings', async () => {
    const created = await createJsonRequest({
      dueDate: futureHours(120),
      status: 'in_progress'
    });

    const updated = await request(app)
      .patch(`/api/requests/${created.id}`)
      .send({ dueDate: futureHours(1) });

    expect(updated.status).toBe(200);
    expect(updated.body.controlStatus).toBe('approaching');

    const db = getDb();
    const log = await db.get('SELECT COUNT(*) as cnt FROM request_proceedings WHERE request_id = ?', created.id);
    expect(log.cnt).toBeGreaterThanOrEqual(2); // create + update
  });

  it('enforces attachment limit per request', async () => {
    const createAgent = request(app)
      .post('/api/requests')
      .field('citizenFio', 'Limit Tester')
      .field('description', 'Initial attachments')
      .field('dueDate', futureHours(72));

    for (let i = 0; i < 4; i += 1) {
      createAgent.attach('attachments', Buffer.from(`file-${i}`), {
        filename: `doc${i}.pdf`,
        contentType: 'application/pdf'
      });
    }

    const created = await createAgent;
    expect(created.status).toBe(201);

    const patchAgent = request(app)
      .patch(`/api/requests/${created.body.id}`)
      .field('dueDate', futureHours(24));

    for (let i = 0; i < 2; i += 1) {
      patchAgent.attach('attachments', Buffer.from(`extra-${i}`), {
        filename: `extra${i}.pdf`,
        contentType: 'application/pdf'
      });
    }

    const response = await patchAgent;
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Attachment limit/);
  });

  it('downloads stored attachments securely', async () => {
    const fileBuffer = Buffer.from('pdf-content-here');
    const creation = await request(app)
      .post('/api/requests')
      .field('citizenFio', 'Downloader')
      .field('description', 'Needs file download')
      .field('dueDate', futureHours(72))
      .attach('attachments', fileBuffer, {
        filename: 'report.pdf',
        contentType: 'application/pdf'
      });

    const attachmentId = creation.body.attachments[0].id;
    const download = await request(app)
      .get(`/api/files/${attachmentId}/download`)
      .buffer()
      .parse(downloadParser);

    expect(download.status).toBe(200);
    expect(download.headers['content-disposition']).toContain('report.pdf');
    expect(download.body.equals(fileBuffer)).toBe(true);
  });

  it('provides nomenclature lookups', async () => {
    const response = await request(app).get('/api/nomenclature');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.types)).toBe(true);
    expect(Array.isArray(response.body.topics)).toBe(true);
    expect(response.body.types.length).toBeGreaterThan(0);
    expect(response.body.topics.length).toBeGreaterThan(0);
  });
});

async function createJsonRequest(overrides = {}) {
  const payload = {
    citizenFio: 'Sample User',
    description: 'Sample description',
    contactEmail: 'sample@example.com',
    contactPhone: '555-0000',
    requestTypeId: 1,
    requestTopicId: 1,
    executor: 'Operator Base',
    status: 'new',
    priority: 'medium',
    dueDate: futureHours(96),
    ...overrides
  };

  const response = await request(app).post('/api/requests').send(payload);
  expect(response.status).toBe(201);
  return response.body;
}

async function resetDatabase() {
  const db = getDb();
  await db.exec(`
    DELETE FROM files;
    DELETE FROM audit_log;
    DELETE FROM request_proceedings;
    DELETE FROM requests;
  `);
}

async function resetUploads() {
  await fs.promises.rm(config.UPLOAD_DIR, { recursive: true, force: true }).catch(() => {});
  await fs.promises.mkdir(config.UPLOAD_DIR, { recursive: true });
}

async function removeTestDatabase() {
  await fs.promises.rm(config.DB_PATH, { force: true }).catch(() => {});
}

function futureHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function pastHours(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
