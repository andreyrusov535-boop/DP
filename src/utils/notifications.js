const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, NODE_ENV } = require('../config');

let transporter;

function initializeMailer() {
  if (transporter) {
    return transporter;
  }

  // In test environment or with incomplete SMTP config, use a mock transporter
  if (NODE_ENV === 'test' || !SMTP_HOST) {
    transporter = {
      sendMail: async (options) => {
        console.log('[email-notification]', JSON.stringify(options));
        return { messageId: `mock-${Date.now()}` };
      }
    };
  } else {
    const transportConfig = {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465
    };

    // Add auth only if credentials are provided
    if (SMTP_USER && SMTP_PASS) {
      transportConfig.auth = {
        user: SMTP_USER,
        pass: SMTP_PASS
      };
    }

    transporter = nodemailer.createTransport(transportConfig);
  }

  return transporter;
}

async function sendEmail(to, subject, html) {
  try {
    const mailer = initializeMailer();
    const result = await mailer.sendMail({
      from: SMTP_FROM_EMAIL,
      to,
      subject,
      html
    });
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

function buildNotificationMessage(requestId, request, notificationType, baseUrl = 'http://localhost:3000') {
  const requestLink = `${baseUrl}/requests/${requestId}`;
  const citizenName = request.citizenFio || request.citizen_fio || 'Unknown';
  const dueDate = request.dueDate || request.due_date || 'N/A';

  if (notificationType === 'due_soon') {
    return {
      subject: `Request #${requestId}: Due Date Approaching - 24 Hours`,
      html: `
        <h2>Reminder: Request Due Soon</h2>
        <p>A request assigned to you has an approaching deadline.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">#${requestId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Citizen Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${citizenName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dueDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${request.description || request.Description || 'N/A'}</td>
          </tr>
        </table>
        <p><a href="${requestLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px;">View Request</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification. Please do not reply to this email.</p>
      `
    };
  }

  if (notificationType === 'overdue') {
    return {
      subject: `Request #${requestId}: OVERDUE - Escalation Required`,
      html: `
        <h2 style="color: #d32f2f;">URGENT: Request is Overdue</h2>
        <p>A request has become overdue and requires immediate attention.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">#${requestId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Citizen Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${citizenName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dueDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${request.description || request.Description || 'N/A'}</td>
          </tr>
        </table>
        <p><a href="${requestLink}" style="display: inline-block; padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px;">Review Request</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification. Please do not reply to this email.</p>
      `
    };
  }

  if (notificationType === 'removed_from_control') {
    const removedBy = request.removedBy || request.removed_by || 'System Administrator';
    const reason = request.reason || request.note || 'No specific reason provided';
    
    return {
      subject: `Request #${requestId}: Removed from Control`,
      html: `
        <h2 style="color: #f57c00;">Request Removed from Control</h2>
        <p>Your request has been removed from our control system.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">#${requestId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Citizen Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${citizenName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${request.description || request.Description || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Removed By:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${removedBy}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${reason}</td>
          </tr>
        </table>
        <p style="color: #666; margin-top: 15px;">This request will no longer be actively monitored by our system. If you believe this is an error or need further assistance, please contact our support team.</p>
        <p><a href="${requestLink}" style="display: inline-block; padding: 10px 20px; background-color: #f57c00; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px;">View Request Details</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification. Please do not reply to this email.</p>
      `
    };
  }

  return {
    subject: `Request #${requestId}: Notification`,
    html: `<p>Request notification for #${requestId}.</p><p><a href="${requestLink}">View Request</a></p>`
  };
}

function notifyDeadlineStatus(request, status) {
  // Placeholder notification hook. In production, integrate with email/SMS/queue.
  const payload = {
    requestId: request.id,
    citizenFio: request.citizen_fio || request.citizenFio,
    status,
    dueDate: request.due_date || request.dueDate
  };
  console.log('[deadline-notification]', JSON.stringify(payload));
}

module.exports = {
  notifyDeadlineStatus,
  sendEmail,
  buildNotificationMessage,
  initializeMailer
};
