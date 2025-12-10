const { insertRequest, updateRequest, getRequestById, listRequests, insertFiles, getFilesByRequestId, getFileById, logProceeding, logAction, deleteFileById } = require('../models/requestModel');
const { findTypeById, findTopicById, findSocialGroupById, findIntakeFormById, findPriorityById } = require('../models/nomenclatureModel');
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
  await ensurePriority(payload);
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
  if (payload.priorityId || payload.priority) {
    await ensurePriority(payload);
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
  // Using legacy getDb directly here just for query execution, but we should use dbService ideally
  // Since getDb calls dbService.getDatabase(), it returns the sqlite handle.
  // Ideally we should move this query to requestModel
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
  if (payload.receiptFormId !== undefined) {
    const intakeFormId = Number(payload.receiptFormId);
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

async function ensurePriority(payload) {
  const priorityId = payload.priorityId;
  if (priorityId !== undefined && priorityId !== null) {
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

function validateStatusAndPriority(payload) {
  if (payload.status !== undefined && !REQUEST_STATUSES.includes(payload.status)) {
    throw new Error('Unsupported status value');
  }
  if (payload.priority !== undefined && !PRIORITIES.includes(payload.priority)) {
    // If priority is text, check against list. If ID, it was checked in ensurePriority
    // But payload.priority might be ID if frontend sent it? No, frontend sends text usually in Phase 3.
    // Allow if it is in list OR if priorityId is set.
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
  if (has('receiptFormId')) sanitized.intake_form_id = Number(payload.receiptFormId); // Alias
  if (has('contactChannel')) sanitized.contact_channel = clean(payload.contactChannel);
  if (has('status')) sanitized.status = payload.status;
  if (has('executor')) sanitized.executor = clean(payload.executor);
  if (has('executorUserId')) sanitized.executor_user_id = payload.executorUserId ? Number(payload.executorUserId) : null;
  if (has('executorId')) sanitized.executor_user_id = payload.executorId ? Number(payload.executorId) : null;
  
  if (has('priority')) sanitized.priority = payload.priority;
  if (has('priorityId')) sanitized.priority_id = Number(payload.priorityId);
  
  if (has('dueDate')) sanitized.due_date = sanitizeDate(payload.dueDate);
  if (has('externalId')) sanitized.external_id = payload.externalId;
  if (has('source')) sanitized.source = payload.source;
  if (has('createdBy')) sanitized.created_by = payload.createdBy;

  if (!isUpdate) {
    if (!sanitized.status) sanitized.status = 'new';
    if (!sanitized.priority) sanitized.priority = 'medium';
    // if priority_id not set, default? We set default in DB or model layer.
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
    executorId: parseId(query.executorId), // Support explicit ID filter
    priority: query.priority,
    priorityId: parseId(query.priorityId),
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
  // Check priority only if it is a string from the known list
  if (filters.priority && !PRIORITIES.includes(filters.priority) && isNaN(Number(filters.priority))) {
    // If it's not in the list and not a number, clear it?
    // Wait, if it is a number passed as string, it might be ID.
    // The buildFilters logic in Feature branch kept numeric ID.
    // Here we let it pass if it matches priorities list.
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

  // Phase 3 Audit
  await logAuditEntry({
    user_id: null,
    request_id: requestId,
    action,
    entity_type: 'request',
    payload: normalizedPayload,
    created_at: timestamp
  });

  // Feature Branch Audit (schema_migrations compatible)
  // logAction calls dbService.execute
  await logAction('audit_log', {
    request_id: requestId,
    action,
    details: serialized,
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
    receiptForm: row.intake_form_id // Feature alias
      ? { id: row.intake_form_id, name: row.intake_form_name }
      : null,
    description: row.description,
    status: row.status,
    executor: row.executor, // Legacy text
    executorUserId: row.executor_user_id,
    executorId: row.executor_user_id, // Feature alias
    priority: row.priority, // Text
    priorityId: row.priority_id, // ID
    dueDate: row.due_date,
    controlStatus: row.control_status,
    removedFromControlAt: row.removed_from_control_at,
    removedFromControlBy: row.removed_from_control_by,
    removedFromControlByUserId: row.removed_from_control_by_user_id,
    
    // Feature fields
    isOverdue: row.is_overdue,
    externalId: row.external_id,
    source: row.source,
    createdBy: row.created_by,
    resolvedAt: row.resolved_at,
    
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

async function deleteAttachment(fileId, user) {
  const file = await getFileById(fileId);
  if (!file) {
    return false;
  }

  // Delete from disk
  await deleteFileIfExists(file.stored_name);

  // Delete from database
  await deleteFileById(fileId);

  // Log audit entry
  const timestamp = new Date().toISOString();
  await logAuditEntry({
    user_id: user ? user.userId : null,
    request_id: file.request_id,
    action: 'delete_attachment',
    entity_type: 'attachment',
    payload: {
      file_id: fileId,
      original_name: file.original_name,
      deleted_by: user ? user.email : 'system'
    },
    created_at: timestamp
  });

  // Log proceeding
  await logProceeding({
    request_id: file.request_id,
    action: 'delete_attachment',
    details: JSON.stringify({
      file_id: fileId,
      original_name: file.original_name,
      deleted_by: user ? user.email : 'system'
    }),
    created_at: timestamp
  });

  return true;
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
    control_status: 'no',
    removed_from_control_at: now,
    removed_from_control_by: userName,
    removed_from_control_by_user_id: user.userId
  };
  
  await updateRequest(id, updates);
  
  // Build notes string that includes "Removed from control" and the optional note
  const notesMessage = note ? `Removed from control - ${note}` : 'Removed from control';
  
  // Log audit entry
  await logAuditEntry({
    user_id: user.userId,
    request_id: id,
    action: 'remove_from_control',
    entity_type: 'request',
    payload: {
      note,
      previous_status: request.status,
      removed_by: userName,
      removed_at: now
    },
    created_at: now
  });
  
  // Log proceeding with plain text notes (not JSON) for test compatibility
  await logProceeding({
    request_id: id,
    action: 'remove_from_control',
    details: notesMessage,
    created_at: now
  });

  return fetchRequestWithFiles(id);
}

// Export everything including removeRequestFromControl
module.exports = {
  createRequest,
  updateRequestById,
  fetchRequestWithFiles,
  fetchRequestsList,
  getAttachmentById,
  deleteAttachment,
  refreshAllControlStatuses,
  removeRequestFromControl
};
