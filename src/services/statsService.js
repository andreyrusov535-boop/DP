const { getDb } = require('../db');

async function getOverview() {
  const db = getDb();

  // Get total count
  const totalResult = await db.get(
    'SELECT COUNT(*) as total FROM requests'
  );

  // Get counts by status
  const statusCounts = await db.all(
    `SELECT status, COUNT(*) as count FROM requests GROUP BY status ORDER BY count DESC`
  );

  // Calculate derived stats
  let stats = {
    total: totalResult?.total || 0,
    byStatus: {},
    pending: 0,
    completed: 0,
    overdue: 0,
    upcoming: 0
  };

  // Process status breakdown
  statusCounts.forEach(row => {
    stats.byStatus[row.status] = row.count;
    
    // Map status to summary categories
    if (row.status === 'new' || row.status === 'in_progress' || row.status === 'pending_info') {
      stats.pending += row.count;
    } else if (row.status === 'resolved' || row.status === 'closed') {
      stats.completed += row.count;
    }
  });

  // Get overdue count
  const overdueResult = await db.get(
    'SELECT COUNT(*) as count FROM requests WHERE is_overdue = 1'
  );
  stats.overdue = overdueResult?.count || 0;

  // Get upcoming count (tasks with due_date in the future)
  const upcomingResult = await db.get(
    `SELECT COUNT(*) as count FROM requests 
     WHERE due_date IS NOT NULL 
     AND due_date > date('now')
     AND status NOT IN ('resolved', 'rejected', 'closed')`
  );
  stats.upcoming = upcomingResult?.count || 0;

  return stats;
}

module.exports = {
  getOverview
};
