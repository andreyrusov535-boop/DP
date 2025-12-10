const { getDb } = require('../db');
const { NOTIFICATION_HOURS_BEFORE_DEADLINE } = require('../config');
const { sendEmail, buildNotificationMessage } = require('../utils/notifications');

async function getRequestsDueSoon() {
  const db = getDb();
  const now = new Date();
  const hoursFromNow = new Date(now.getTime() + NOTIFICATION_HOURS_BEFORE_DEADLINE * 60 * 60 * 1000).toISOString();

  const sql = `
    SELECT r.*, u.email, u.name
    FROM requests r
    JOIN users u ON r.executor_user_id = u.id
    WHERE r.due_date IS NOT NULL
      AND r.due_date > ?
      AND r.due_date <= ?
      AND r.status NOT IN ('completed', 'archived')
      AND NOT EXISTS (
        SELECT 1 FROM deadline_notifications dn
        WHERE dn.request_id = r.id AND dn.notification_type = 'due_soon'
      )
    ORDER BY r.due_date ASC
  `;

  return db.all(sql, [now.toISOString(), hoursFromNow]);
}

async function getOverdueRequests() {
  const db = getDb();
  const now = new Date().toISOString();

  const sql = `
    SELECT r.*, u.email, u.name, u.role
    FROM requests r
    JOIN users u ON r.executor_user_id = u.id
    WHERE r.due_date IS NOT NULL
      AND r.due_date < ?
      AND r.status NOT IN ('completed', 'archived')
      AND NOT EXISTS (
        SELECT 1 FROM deadline_notifications dn
        WHERE dn.request_id = r.id AND dn.notification_type = 'overdue'
      )
    ORDER BY r.due_date ASC
  `;

  return db.all(sql, [now]);
}

async function getSupervisorsAndAdmins() {
  const db = getDb();
  const sql = `
    SELECT id, email, name, role
    FROM users
    WHERE role IN ('supervisor', 'admin')
      AND status = 'active'
    ORDER BY role DESC
  `;

  return db.all(sql, []);
}

async function recordNotification(requestId, notificationType, targetUserId) {
  const db = getDb();
  const sql = `
    INSERT INTO deadline_notifications (request_id, notification_type, target_user_id, created_at)
    VALUES (?, ?, ?, ?)
  `;

  return db.run(sql, [requestId, notificationType, targetUserId || null, new Date().toISOString()]);
}

async function shouldSendNotification(requestId, notificationType) {
  const db = getDb();
  const sql = `
    SELECT COUNT(*) as count FROM deadline_notifications
    WHERE request_id = ? AND notification_type = ?
  `;

  const result = await db.get(sql, [requestId, notificationType]);
  return result.count === 0;
}

async function processDueSoonNotifications() {
  try {
    const requests = await getRequestsDueSoon();

    for (const request of requests) {
      const hasNotification = await shouldSendNotification(request.id, 'due_soon');

      if (!hasNotification) {
        continue;
      }

      try {
        const messageBody = buildNotificationMessage(request.id, request, 'due_soon');
        await sendEmail(request.email, messageBody.subject, messageBody.html);
        await recordNotification(request.id, 'due_soon', request.executor_user_id);
        console.log(`[notification-job] Sent due_soon notification for request ${request.id} to ${request.email}`);
      } catch (error) {
        console.error(`[notification-job] Failed to send due_soon notification for request ${request.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[notification-job] Error processing due_soon notifications:', error);
  }
}

async function processOverdueNotifications() {
  try {
    const requests = await getOverdueRequests();
    const supervisors = await getSupervisorsAndAdmins();

    for (const request of requests) {
      const hasNotification = await shouldSendNotification(request.id, 'overdue');

      if (!hasNotification) {
        continue;
      }

      for (const supervisor of supervisors) {
        try {
          const messageBody = buildNotificationMessage(request.id, request, 'overdue');
          await sendEmail(supervisor.email, messageBody.subject, messageBody.html);
          await recordNotification(request.id, 'overdue', supervisor.id);
          console.log(`[notification-job] Sent overdue notification for request ${request.id} to ${supervisor.email}`);
        } catch (error) {
          console.error(`[notification-job] Failed to send overdue notification for request ${request.id} to ${supervisor.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[notification-job] Error processing overdue notifications:', error);
  }
}

async function runNotificationJob() {
  console.log('[notification-job] Running notification job at', new Date().toISOString());
  await processDueSoonNotifications();
  await processOverdueNotifications();
}

module.exports = {
  getRequestsDueSoon,
  getOverdueRequests,
  getSupervisorsAndAdmins,
  recordNotification,
  shouldSendNotification,
  processDueSoonNotifications,
  processOverdueNotifications,
  runNotificationJob
};
