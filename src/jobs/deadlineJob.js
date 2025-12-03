const cron = require('node-cron');
const { refreshAllControlStatuses } = require('../services/requestService');

let scheduledJob;

function scheduleDeadlineRefresh() {
  if (scheduledJob || process.env.NODE_ENV === 'test') {
    return scheduledJob;
  }

  scheduledJob = cron.schedule(
    '0 3 * * *',
    async () => {
      await refreshAllControlStatuses();
    },
    { scheduled: true }
  );
  return scheduledJob;
}

async function runDeadlineRefreshOnce() {
  await refreshAllControlStatuses();
}

module.exports = {
  scheduleDeadlineRefresh,
  runDeadlineRefreshOnce
};
