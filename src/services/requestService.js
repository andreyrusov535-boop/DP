const { insertRequest, updateRequest, getRequestById, listRequests, insertFiles, getFilesByRequestId, getFileById, logProceeding, deleteFileById } = require('../models/requestModel');
const { findTypeById, findTopicById, findSocialGroupById, findIntakeFormById } = require('../models/nomenclatureModel');
const { calculateControlStatus } = require('../utils/deadline');
const { notifyDeadlineStatus, sendEmail, buildNotificationMessage } = require('../utils/notifications');
const { clean } = require('../utils/sanitize');
const { MAX_ATTACHMENTS, REQUEST_STATUSES, PRIORITIES } = require('../config');
const { getDb } = require('../db');
const { logAuditEntry } = require('../utils/audit');
const { getUserById } = require('../models/userModel');
const { deleteFileIfExists } = require('../utils/fileStorage');

async function createRequest(payload, files = []) {
  await ensureTypeAndTopic(payload);
  validateStatusAndPriority(payload);

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
  validateStatusAndPriority(payload);

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
  if (payload.socialGroupId !== undefined) {
    const socialGroupId = Number(payload.socialGroupId);
    if (Number.isNaN(socialGroupId)) {
      throw new Error('Invalid social group reference');
    }
    const socialGroup = await findSocialGroupById(socialGroupId);
    if (!socialGroup) {
      throw new Error('Invalid social group reference');
    }
  }
  if (payload.intakeFormId !== undefined) {
    const intakeFormId = Number(payload.intakeFormId);
    if (Number.isNaN(intakeFormId)) {
      throw new Error('Invalid intake form reference');
    }
    const intakeForm = await findIntakeFormById(intakeFormId);
    if (!intakeForm) {
      throw new Error('Invalid intake form reference');
    }
  }
  if (payload.executorUserId !== undefined && payload.executorUserId !== null) {
    const executorUserId = Number(payload.executorUserId);
    if (Number.isNaN(executorUserId)) {
      throw new Error('Invalid executor user reference');
    }
    const user = await getUserById(executorUserId);
    if (!user) {
      throw new Error('Invalid executor user reference');
    }
    if (user.status !== 'active') {
      throw new Error('Executor user must have active status');
    }
    const validExecutorRoles = ['operator', 'executor', 'supervisor', 'admin'];
    if (!validExecutorRoles.includes(user.role)) {
      throw new Error('Executor user must have executor, operator, supervisor, or admin role');
    }
  }
}

function validateStatusAndPriority(payload) {
  if (payload.status !== undefined && !REQUEST_STATUSES.includes(payload.status)) {
    throw new Error('Unsupported status value');
  }
  if (payload.priority !== undefined && !PRIORITIES.includes(payload.priority)) {
    throw new Error('Unsupported priority value');
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
  if (has('description')) sanitized.description = clean(payload.description);
  if (has('address')) sanitized.address = clean(payload.address);
  if (has('territory')) sanitized.territory = clean(payload.territory);
  if (has('socialGroupId')) sanitized.social_group_id = Number(payload.socialGroupId);
  if (has('intakeFormId')) sanitized.intake_form_id = Number(payload.intakeFormId);
  if (has('contactChannel')) sanitized.contact_channel = clean(payload.contactChannel);
  if (has('status')) sanitized.status = payload.status;
  if (has('executor')) sanitized.executor = clean(payload.executor);
  if (has('executorUserId')) sanitized.executor_user_id = payload.executorUserId ? Number(payload.executorUserId) : null;
  if (has('priority')) sanitized.priority = payload.priority;
  if (has('dueDate')) sanitized.due_date = sanitizeDate(payload.dueDate);
  if (!isUpdate) {
    if (!sanitized.status) sanitized.status = 'new';
    if (!sanitized.priority) sanitized.priority = 'medium';
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
    executor: query.executor ? clean(query.executor) : undefined,
    priority: query.priority,
    address: query.address ? clean(query.address) : undefined,
    territory: query.territory ? clean(query.territory) : undefined,
    socialGroupId: parseId(query.social_group_id),
    intakeFormId: parseId(query.intake_form_id),
    contactChannel: query.contact_channel,
    dateFrom: query.date_from,
    dateTo: query.date_to,
    search: query.search ? clean(query.search) : undefined
  };

  if (filters.status && !REQUEST_STATUSES.includes(filters.status)) {
    filters.status = undefined;
  }
  if (filters.priority && !PRIORITIES.includes(filters.priority)) {
    filters.priority = undefined;
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
  const normalizedPayload = payload || {};
  const serialized = JSON.stringify(normalizedPayload);

  await logAuditEntry({
    user_id: null,
    request_id: requestId,
    action,
    entity_type: 'request',
    payload: normalizedPayload,
    created_at: timestamp
  });

  await logProceeding({
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
    address: row.address,
    territory: row.territory,
    contactChannel: row.contact_channel,
    requestType: row.request_type_id
      ? { id: row.request_type_id, name: row.request_type_name }
      : null,
    requestTopic: row.request_topic_id
      ? { id: row.request_topic_id, name: row.request_topic_name }
      : null,
    socialGroup: row.social_group_id
      ? { id: row.social_group_id, name: row.social_group_name }
      : null,
    intakeForm: row.intake_form_id
      ? { id: row.intake_form_id, name: row.intake_form_name }
      : null,
    description: row.description,
    status: row.status,
    executor: row.executor,
    executorUserId: row.executor_user_id,
    priority: row.priority,
    dueDate: row.due_date,
    controlStatus: row.control_status,
    removedFromControlAt: row.removed_from_control_at,
    removedFromControlBy: row.removed_from_control_by,
    removedFromControlByUserId: row.removed_from_control_by_user_id,
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

async function removeRequestFromControl({ id, note, user }) {
  const request = await getRequestById(id);
  
  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status === 'removed') {
    throw new Error('Request is already removed from control');
  }

  if (request.status === 'completed' || request.status === 'archived') {
    throw new Error('Cannot remove completed or archived requests from control');
  }

  const actingUser = await getUserById(user.userId);
  const userName = actingUser ? actingUser.name : user.email;

  const now = new Date().toISOString();
  const updates = {
    status: 'removed',
    removed_from_control_at: now,
    removed_from_control_by: userName,
    removed_from_control_by_user_id: user.userId
  };

  await updateRequest(id, updates);

  const auditPayload = {
    note: note || null,
    previous_status: request.status,
    removed_by: userName,
    removed_by_user_id: user.userId
  };

  await logAuditEntry({
    user_id: user.userId,
    request_id: id,
    action: 'remove_from_control',
    entity_type: 'request',
    payload: auditPayload,
    created_at: now
  });

  const proceedingNote = note ? `Removed from control. Reason: ${note}` : 'Removed from control';
  await logProceeding({
    request_id: id,
    action: 'remove_from_control',
    details: proceedingNote,
    created_at: now
  });

  if (request.contact_email) {
    try {
      const notificationData = buildNotificationMessage(
        id,
        {
          citizenFio: request.citizen_fio,
          description: request.description,
          removedBy: userName,
          note: note
        },
        'removed_from_control'
      );

      await sendEmail(request.contact_email, notificationData.subject, notificationData.html);
    } catch (error) {
      console.error(`Failed to send removal notification for request #${id}:`, error.message);
    }
  }

  return fetchRequestWithFiles(id);
}

async function deleteAttachment(fileId, user) {
  const file = await getFileById(fileId);
  if (!file) {
    return null;
  }

  const now = new Date().toISOString();

  await deleteFileIfExists(file.stored_name);
  await deleteFileById(fileId);

  const auditPayload = {
    file_id: fileId,
    original_name: file.original_name,
    request_id: file.request_id
  };

  await logAuditEntry({
    user_id: user.userId,
    request_id: file.request_id,
    action: 'delete_attachment',
    entity_type: 'attachment',
    payload: auditPayload,
    created_at: now
  });

  const proceedingNote = `Attachment deleted: ${file.original_name}`;
  await logProceeding({
    request_id: file.request_id,
    action: 'delete_attachment',
    details: proceedingNote,
    created_at: now
  });

  return true;
}

module.exports = {
  createRequest,
  updateRequestById,
  fetchRequestWithFiles,
  fetchRequestsList,
  refreshAllControlStatuses,
  getAttachmentById,
  deleteAttachment,
  removeRequestFromControl
};
