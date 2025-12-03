const { insertRequest, updateRequest, getRequestById, listRequests, insertFiles, getFilesByRequestId, getFileById, logAction } = require('../models/requestModel');
const { findTypeById, findTopicById, findPriorityById } = require('../models/nomenclatureModel');
const { calculateControlStatus } = require('../utils/deadline');
const { notifyDeadlineStatus } = require('../utils/notifications');
const { clean } = require('../utils/sanitize');
const { MAX_ATTACHMENTS, REQUEST_STATUSES, PRIORITIES } = require('../config');
const { getDb } = require('../db');

async function createRequest(payload, files = []) {
  await ensureTypeAndTopic(payload);
  await ensurePriority(payload);
  validateStatus(payload);

  const sanitized = sanitizePayload(payload);
  const now = new Date().toISOString();
  sanitized.created_at = now;
  sanitized.updated_at = now;
  sanitized.control_status = calculateControlStatus(sanitized.due_date);

  const requestId = await insertRequest(sanitized);
  await persistFiles(requestId, files);
  triggerDeadlineNotification(requestId, sanitized, sanitized.control_status);
  await logMutation(requestId, 'create', sanitized);

  return fetchRequestWithFiles(requestId);
}

async function updateRequestById(id, payload, files = []) {
  const existing = await getRequestById(id);
  if (!existing) {
    return null;
  }

  if (payload.requestTypeId || payload.requestTopicId) {
    await ensureTypeAndTopic(payload);
  }
  if (payload.priorityId || payload.priority) {
    await ensurePriority(payload);
  }
  validateStatus(payload);

  const attachments = await getFilesByRequestId(id);
  if (attachments.length + files.length > MAX_ATTACHMENTS) {
    throw new Error(`Attachment limit of ${MAX_ATTACHMENTS} would be exceeded`);
  }

  const updates = sanitizePayload(payload, true);
  let nextControlStatus;

  if (Object.prototype.hasOwnProperty.call(updates, 'due_date')) {
    nextControlStatus = calculateControlStatus(updates.due_date);
    updates.control_status = nextControlStatus;
  }

  if (Object.keys(updates).length > 0) {
    await updateRequest(id, updates);
    if (nextControlStatus && nextControlStatus !== existing.control_status) {
      const merged = { ...existing, ...updates };
      triggerDeadlineNotification(id, merged, nextControlStatus);
    }
  }

  await persistFiles(id, files);
  await logMutation(id, 'update', updates);

  return fetchRequestWithFiles(id);
}

async function fetchRequestWithFiles(id) {
  const record = await getRequestById(id);
  if (!record) {
    return null;
  }

  await ensureControlStatus(record);
  const files = await getFilesByRequestId(id);
  return mapRequest(record, files);
}

async function fetchRequestsList(query) {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 20;
  const offset = (page - 1) * limit;
  const filters = buildFilters(query);

  const { rows, total } = await listRequests({
    filters,
    limit,
    offset,
    sortBy: query.sort_by || 'created_at',
    sortOrder: query.sort_order || 'desc'
  });

  const enriched = [];
  for (const row of rows) {
    await ensureControlStatus(row);
    const files = await getFilesByRequestId(row.id);
    enriched.push(mapRequest(row, files));
  }

  return {
    data: enriched,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    }
  };
}

async function persistFiles(requestId, files) {
  if (!files || !files.length) {
    return;
  }
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`Cannot attach more than ${MAX_ATTACHMENTS} files at once`);
  }

  const now = new Date().toISOString();
  const records = files.map((file) => ({
    request_id: requestId,
    original_name: file.originalname,
    stored_name: file.filename,
    mime_type: file.mimetype,
    size: file.size,
    created_at: now
  }));
  await insertFiles(records);
}

async function ensureControlStatus(record) {
  const newStatus = calculateControlStatus(record.due_date);
  if (newStatus !== record.control_status) {
    await updateRequest(record.id, { control_status: newStatus });
    record.control_status = newStatus;
    if (newStatus === 'approaching' || newStatus === 'overdue') {
      notifyDeadlineStatus(record, newStatus);
    }
  }
}

async function refreshAllControlStatuses() {
  const db = getDb();
  const rows = await db.all('SELECT id, citizen_fio, due_date, control_status FROM requests');
  for (const row of rows) {
    await ensureControlStatus(row);
  }
}

async function ensureTypeAndTopic(payload) {
  if (payload.requestTypeId !== undefined) {
    const typeId = Number(payload.requestTypeId);
    if (Number.isNaN(typeId)) {
      throw new Error('Invalid request type reference');
    }
    const type = await findTypeById(typeId);
    if (!type) {
      throw new Error('Invalid request type reference');
    }
  }
  if (payload.requestTopicId !== undefined) {
    const topicId = Number(payload.requestTopicId);
    if (Number.isNaN(topicId)) {
      throw new Error('Invalid request topic reference');
    }
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error('Invalid request topic reference');
    }
  }
}

async function ensurePriority(payload) {
  const priorityId = payload.priorityId || payload.priority;
  if (priorityId !== undefined) {
    const id = Number(priorityId);
    if (Number.isNaN(id)) {
      throw new Error('Invalid priority reference');
    }
    const priority = await findPriorityById(id);
    if (!priority) {
      throw new Error('Invalid priority reference');
    }
  }
}

function validateStatus(payload) {
  if (payload.status !== undefined && !REQUEST_STATUSES.includes(payload.status)) {
    throw new Error('Unsupported status value');
  }
}

function sanitizePayload(payload, isUpdate = false) {
  const sanitized = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);

  if (has('citizenFio')) sanitized.citizen_fio = clean(payload.citizenFio);
  if (has('contactPhone')) sanitized.contact_phone = clean(payload.contactPhone);
  if (has('contactEmail')) sanitized.contact_email = clean(payload.contactEmail);
  if (has('requestTypeId')) sanitized.request_type_id = Number(payload.requestTypeId);
  if (has('requestTopicId')) sanitized.request_topic_id = Number(payload.requestTopicId);
  if (has('receiptFormId')) sanitized.receipt_form_id = Number(payload.receiptFormId);
  if (has('description')) sanitized.description = clean(payload.description);
  if (has('status')) sanitized.status = payload.status;
  if (has('executorId')) sanitized.executor_id = Number(payload.executorId);
  if (has('priorityId')) sanitized.priority_id = Number(payload.priorityId);
  else if (has('priority')) sanitized.priority_id = Number(payload.priority);
  if (has('dueDate')) sanitized.due_date = sanitizeDate(payload.dueDate);
  if (!isUpdate) {
    if (!sanitized.status) sanitized.status = 'new';
    if (!sanitized.priority_id) sanitized.priority_id = 3; // medium priority by default
  }
  return sanitized;
}

function sanitizeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid due_date');
  }
  return date.toISOString();
}

function buildFilters(query) {
  const filters = {
    fio: query.fio ? clean(query.fio) : undefined,
    typeId: parseId(query.type),
    topicId: parseId(query.topic),
    status: query.status,
    executorId: parseId(query.executor),
    priorityId: parseId(query.priority),
    dateFrom: query.date_from,
    dateTo: query.date_to,
    search: query.search ? clean(query.search) : undefined
  };

  if (filters.status && !REQUEST_STATUSES.includes(filters.status)) {
    filters.status = undefined;
  }
  if (filters.priorityId && !Number.isNaN(filters.priorityId)) {
    // Keep numeric priority ID as is
  }

  return filters;
}

function parseId(value) {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function logMutation(requestId, action, payload) {
  const timestamp = new Date().toISOString();
  const serialized = JSON.stringify(payload || {});
  await logAction('audit_log', {
    request_id: requestId,
    action,
    details: serialized,
    created_at: timestamp
  });
  await logAction('request_proceedings', {
    request_id: requestId,
    action,
    details: serialized,
    created_at: timestamp
  });
}

function mapRequest(row, files) {
  return {
    id: row.id,
    citizenFio: row.citizen_fio,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    requestType: row.request_type_id
      ? { id: row.request_type_id, name: row.request_type_name }
      : null,
    requestTopic: row.request_topic_id
      ? { id: row.request_topic_id, name: row.request_topic_name }
      : null,
    receiptForm: row.receipt_form_id
      ? { id: row.receipt_form_id, name: row.receipt_form_name }
      : null,
    description: row.description,
    status: row.status,
    executorId: row.executor_id,
    executor: row.executor_name || row.executor,
    priorityId: row.priority_id,
    priority: row.priority_name || row.priority,
    dueDate: row.due_date,
    resolvedAt: row.resolved_at,
    controlStatus: row.control_status,
    isOverdue: row.is_overdue,
    externalId: row.external_id,
    source: row.source,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: files.map((file) => ({
      id: file.id,
      originalName: file.original_name,
      mimeType: file.mime_type,
      size: file.size,
      createdAt: file.created_at,
      downloadUrl: `/api/files/${file.id}/download`
    }))
  };
}

async function getAttachmentById(fileId) {
  const file = await getFileById(fileId);
  if (!file) {
    return null;
  }
  return file;
}

function triggerDeadlineNotification(requestId, record, status) {
  if (status === 'approaching' || status === 'overdue') {
    notifyDeadlineStatus(
      {
        id: requestId,
        citizen_fio: record.citizen_fio || record.citizenFio,
        due_date: record.due_date || record.dueDate
      },
      status
    );
  }
}

module.exports = {
  createRequest,
  updateRequestById,
  fetchRequestWithFiles,
  fetchRequestsList,
  refreshAllControlStatuses,
  getAttachmentById
};
