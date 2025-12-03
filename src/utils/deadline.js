const { DEADLINE_APPROACHING_THRESHOLD_HOURS } = require('../config');

function calculateControlStatus(dueDate, now = new Date()) {
  if (!dueDate) {
    return 'no';
  }

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'no';
  }

  const diffMs = parsed.getTime() - now.getTime();
  if (diffMs < 0) {
    return 'overdue';
  }

  const hours = diffMs / (1000 * 60 * 60);
  if (hours <= DEADLINE_APPROACHING_THRESHOLD_HOURS) {
    return 'approaching';
  }
  return 'normal';
}

module.exports = {
  calculateControlStatus
};
