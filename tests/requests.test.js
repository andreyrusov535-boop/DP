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
    // Get actual topic ID from database (topics start at ID 11 in full seed)
    const db = getDb();
    const topic = await db.get('SELECT id FROM nomenclature WHERE type = ? LIMIT 1', 'topic');
    
    const response = await request(app)
      .post('/api/requests')
      .field('citizenFio', 'Jane Citizen')
      .field('description', 'Need help with lighting issue')
      .field('contactEmail', 'jane@example.com')
      .field('contactPhone', '555-1234')
      .field('requestTypeId', '1')
      .field('requestTopicId', topic ? topic.id.toString() : '')
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
    expect(Array.isArray(response.body.socialGroups)).toBe(true);
    expect(Array.isArray(response.body.intakeForms)).toBe(true);
    expect(response.body.types.length).toBeGreaterThan(0);
    expect(response.body.topics.length).toBeGreaterThan(0);
    expect(response.body.socialGroups.length).toBeGreaterThan(0);
    expect(response.body.intakeForms.length).toBeGreaterThan(0);
  });

  it('creates request with new metadata fields (address, territory, social group, intake form)', async () => {
    const dueDate = futureHours(72);
    // Lookup the actual IDs from the database (they are assigned sequentially from full seed data)
    const db = getDb();
    const socialGroup = await db.get('SELECT id FROM nomenclature WHERE type = ? LIMIT 1', 'social_group');
    const intakeForm = await db.get('SELECT id FROM nomenclature WHERE type = ? LIMIT 1', 'intake_form');
    
    const response = await request(app)
      .post('/api/requests')
      .send({
        citizenFio: 'Metadata Citizen',
        description: 'Request with rich metadata',
        contactEmail: 'metadata@example.com',
        address: '123 Main Street, Downtown',
        territory: 'Zone A',
        socialGroupId: socialGroup.id,
        intakeFormId: intakeForm.id,
        contactChannel: 'phone',
        requestTypeId: 1,
        dueDate
      });

    expect(response.status).toBe(201);
    expect(response.body.address).toBe('123 Main Street, Downtown');
    expect(response.body.territory).toBe('Zone A');
    expect(response.body.contactChannel).toBe('phone');
    expect(response.body.socialGroup).not.toBeNull();
    expect(response.body.socialGroup.id).toBe(socialGroup.id);
    expect(response.body.intakeForm).not.toBeNull();
    expect(response.body.intakeForm.id).toBe(intakeForm.id);
  });

  it('filters requests by address, territory, social group, and intake form', async () => {
    // Lookup actual IDs from the database
    const db = getDb();
    const socialGroups = await db.all('SELECT id FROM nomenclature WHERE type = ? ORDER BY id LIMIT 2', 'social_group');
    const intakeForms = await db.all('SELECT id FROM nomenclature WHERE type = ? ORDER BY id LIMIT 2', 'intake_form');
    
    await createJsonRequest({
      address: '123 Main Street',
      territory: 'Downtown',
      socialGroupId: socialGroups[0].id,
      intakeFormId: intakeForms[0].id,
      contactChannel: 'phone'
    });

    await createJsonRequest({
      address: '456 Oak Avenue',
      territory: 'Uptown',
      socialGroupId: socialGroups[1].id,
      intakeFormId: intakeForms[1].id,
      contactChannel: 'email'
    });

    const addressFilter = await request(app)
      .get('/api/requests')
      .query({ address: 'Main Street' });
    expect(addressFilter.status).toBe(200);
    expect(addressFilter.body.data.length).toBe(1);
    expect(addressFilter.body.data[0].address).toContain('Main Street');

    const territoryFilter = await request(app)
      .get('/api/requests')
      .query({ territory: 'Uptown' });
    expect(territoryFilter.status).toBe(200);
    expect(territoryFilter.body.data.length).toBe(1);
    expect(territoryFilter.body.data[0].territory).toBe('Uptown');

    const socialGroupFilter = await request(app)
      .get('/api/requests')
      .query({ social_group_id: socialGroups[0].id });
    expect(socialGroupFilter.status).toBe(200);
    expect(socialGroupFilter.body.data.length).toBe(1);
    expect(socialGroupFilter.body.data[0].socialGroup.id).toBe(socialGroups[0].id);

    const intakeFormFilter = await request(app)
      .get('/api/requests')
      .query({ intake_form_id: intakeForms[1].id });
    expect(intakeFormFilter.status).toBe(200);
    expect(intakeFormFilter.body.data.length).toBe(1);
    expect(intakeFormFilter.body.data[0].intakeForm.id).toBe(intakeForms[1].id);
  });

  it('searches requests using full-text search (FTS)', async () => {
    await createJsonRequest({
      description: 'Water pipeline broken in downtown area',
      address: '123 Main Street',
      territory: 'Downtown Zone'
    });

    await createJsonRequest({
      description: 'Street lighting outage',
      address: '456 Oak Avenue',
      territory: 'Uptown Zone'
    });

    const searchByPhrase = await request(app)
      .get('/api/requests')
      .query({ search: 'water pipeline' });

    expect(searchByPhrase.status).toBe(200);
    expect(searchByPhrase.body.data.length).toBe(1);
    expect(searchByPhrase.body.data[0].description.toLowerCase()).toContain('water');

    const searchByAddressWord = await request(app)
      .get('/api/requests')
      .query({ search: 'downtown' });

    expect(searchByAddressWord.status).toBe(200);
    expect(searchByAddressWord.body.data.length).toBeGreaterThan(0);
  });

  it('updates request with new metadata fields', async () => {
    const created = await createJsonRequest();
    // Lookup actual IDs from the database
    const db = getDb();
    const socialGroup = await db.get('SELECT id FROM nomenclature WHERE type = ? ORDER BY id DESC LIMIT 1', 'social_group');
    const intakeForm = await db.get('SELECT id FROM nomenclature WHERE type = ? ORDER BY id DESC LIMIT 1', 'intake_form');

    const updated = await request(app)
      .patch(`/api/requests/${created.id}`)
      .send({
        address: 'Updated Address 789',
        territory: 'New Zone',
        socialGroupId: socialGroup.id,
        intakeFormId: intakeForm.id,
        contactChannel: 'email'
      });

    expect(updated.status).toBe(200);
    expect(updated.body.address).toBe('Updated Address 789');
    expect(updated.body.territory).toBe('New Zone');
    expect(updated.body.socialGroup.id).toBe(socialGroup.id);
    expect(updated.body.intakeForm.id).toBe(intakeForm.id);
    expect(updated.body.contactChannel).toBe('email');
  });
});

async function createJsonRequest(overrides = {}) {
  const payload = {
    citizenFio: 'Sample User',
    description: 'Sample description',
    contactEmail: 'sample@example.com',
    contactPhone: '555-0000',
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
    DELETE FROM request_search;
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
