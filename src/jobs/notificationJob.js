const cron = require('node-cron');
const { NOTIFICATION_CRON_SCHEDULE, NODE_ENV } = require('../config');
const { runNotificationJob } = require('../services/notificationService');

let scheduledJob;

function scheduleNotificationJob() {
  if (scheduledJob || NODE_ENV === 'test') {
    return scheduledJob;
  }

  scheduledJob = cron.schedule(
    NOTIFICATION_CRON_SCHEDULE,
    async () => {
      await runNotificationJob();
    },
    { scheduled: true }
  );

  console.log(`[notification-job] Scheduled with cron pattern: ${NOTIFICATION_CRON_SCHEDULE}`);
  return scheduledJob;
}

async function runNotificationJobOnce() {
  await runNotificationJob();
}

module.exports = {
  scheduleNotificationJob,
  runNotificationJobOnce
};
