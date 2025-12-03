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
  notifyDeadlineStatus
};
