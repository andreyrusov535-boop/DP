const { getDb } = require('../db');
const { logAuditEntry } = require('../utils/audit');
const { clean } = require('../utils/sanitize');
const { REQUEST_STATUSES, PRIORITIES } = require('../config');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

async function getOverview(query, userId = null) {
  const db = getDb();
  const filters = buildFilters(query);
  const whereClause = buildWhereClause(filters);
  const params = buildParams(filters);

  const statusBreakdown = await db.all(
    `SELECT status, COUNT(*) as count 
     FROM requests r 
     ${whereClause} 
     GROUP BY status 
     ORDER BY count DESC`,
    params
  );

  const typeBreakdown = await db.all(
    `SELECT rt.name as type_name, COUNT(*) as count 
     FROM requests r 
     LEFT JOIN nomenclature rt ON r.request_type_id = rt.id AND rt.type = 'request_type'
     ${whereClause} 
     GROUP BY r.request_type_id, rt.name 
     ORDER BY count DESC`,
    params
  );

  const topicBreakdown = await db.all(
    `SELECT rtop.name as topic_name, COUNT(*) as count 
     FROM requests r 
     LEFT JOIN nomenclature rtop ON r.request_topic_id = rtop.id AND rtop.type = 'topic'
     ${whereClause} 
     GROUP BY r.request_topic_id, rtop.name 
     ORDER BY count DESC`,
    params
  );

  const executorBreakdown = await db.all(
    `SELECT 
       COALESCE(executor, 'Unassigned') as executor_name, 
       COUNT(*) as count 
     FROM requests r 
     ${whereClause} 
     GROUP BY executor 
     ORDER BY count DESC 
     LIMIT 10`,
    params
  );

  const territoryBreakdown = await db.all(
    `SELECT 
       COALESCE(territory, 'Not Specified') as territory_name, 
       COUNT(*) as count 
     FROM requests r 
     ${whereClause} 
     GROUP BY territory 
     ORDER BY count DESC 
     LIMIT 10`,
    params
  );

  const socialGroupBreakdown = await db.all(
    `SELECT sg.name as social_group_name, COUNT(*) as count 
     FROM requests r 
     LEFT JOIN nomenclature sg ON r.social_group_id = sg.id AND sg.type = 'social_group'
     ${whereClause} 
     GROUP BY r.social_group_id, sg.name 
     ORDER BY count DESC`,
    params
  );

  const intakeFormBreakdown = await db.all(
    `SELECT inf.name as intake_form_name, COUNT(*) as count 
     FROM requests r 
     LEFT JOIN nomenclature inf ON r.intake_form_id = inf.id AND inf.type = 'intake_form'
     ${whereClause} 
     GROUP BY r.intake_form_id, inf.name 
     ORDER BY count DESC`,
    params
  );

  const priorityBreakdown = await db.all(
    `SELECT priority, COUNT(*) as count 
     FROM requests r 
     ${whereClause} 
     GROUP BY priority 
     ORDER BY 
       CASE priority 
         WHEN 'urgent' THEN 1 
         WHEN 'high' THEN 2 
         WHEN 'medium' THEN 3 
         WHEN 'low' THEN 4 
       END`,
    params
  );

  const totalResult = await db.get(
    `SELECT COUNT(*) as total FROM requests r ${whereClause}`,
    params
  );

  if (userId) {
    await logAuditEntry({
      user_id: userId,
      action: 'view_overview',
      entity_type: 'report',
      payload: { filters: query },
      created_at: new Date().toISOString()
    });
  }

  return {
    total: totalResult.total,
    byStatus: statusBreakdown.map(row => ({ status: row.status, count: row.count })),
    byType: typeBreakdown.map(row => ({ type: row.type_name || 'Not Specified', count: row.count })),
    byTopic: topicBreakdown.map(row => ({ topic: row.topic_name || 'Not Specified', count: row.count })),
    byExecutor: executorBreakdown.map(row => ({ executor: row.executor_name, count: row.count })),
    byTerritory: territoryBreakdown.map(row => ({ territory: row.territory_name, count: row.count })),
    bySocialGroup: socialGroupBreakdown.map(row => ({ socialGroup: row.social_group_name || 'Not Specified', count: row.count })),
    byIntakeForm: intakeFormBreakdown.map(row => ({ intakeForm: row.intake_form_name || 'Not Specified', count: row.count })),
    byPriority: priorityBreakdown.map(row => ({ priority: row.priority, count: row.count }))
  };
}

async function getDynamics(query, userId = null) {
  const db = getDb();
  const filters = buildFilters(query);
  const whereClause = buildWhereClause(filters);
  const params = buildParams(filters);
  const groupBy = query.groupBy || 'daily';

  let dateFormat;
  if (groupBy === 'weekly') {
    dateFormat = 'strftime(\'%Y-W%W\', r.created_at)';
  } else {
    dateFormat = 'date(r.created_at)';
  }

  const timeSeries = await db.all(
    `SELECT 
       ${dateFormat} as period,
       COUNT(*) as count,
       SUM(CASE WHEN r.status = 'new' THEN 1 ELSE 0 END) as new_count,
       SUM(CASE WHEN r.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
       SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
       SUM(CASE WHEN r.status = 'paused' THEN 1 ELSE 0 END) as paused_count,
       SUM(CASE WHEN r.status = 'archived' THEN 1 ELSE 0 END) as archived_count
     FROM requests r 
     ${whereClause} 
     GROUP BY period 
     ORDER BY period ASC`,
    params
  );

  if (userId) {
    await logAuditEntry({
      user_id: userId,
      action: 'view_dynamics',
      entity_type: 'report',
      payload: { filters: query, groupBy },
      created_at: new Date().toISOString()
    });
  }

  return {
    groupBy,
    series: timeSeries.map(row => ({
      period: row.period,
      total: row.count,
      new: row.new_count,
      inProgress: row.in_progress_count,
      completed: row.completed_count,
      paused: row.paused_count,
      archived: row.archived_count
    }))
  };
}

async function generateExcelExport(query, userId = null) {
  const overview = await getOverview(query);
  const dynamics = await getDynamics(query);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Request Management System';
  workbook.created = new Date();

  const overviewSheet = workbook.addWorksheet('Overview');
  
  overviewSheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  overviewSheet.addRow({ metric: 'Generated At', value: new Date().toISOString() });
  overviewSheet.addRow({ metric: 'Total Requests', value: overview.total });
  overviewSheet.addRow({});

  if (query.date_from || query.date_to || query.status || query.priority) {
    overviewSheet.addRow({ metric: 'Applied Filters', value: '' });
    if (query.date_from) overviewSheet.addRow({ metric: '  Date From', value: query.date_from });
    if (query.date_to) overviewSheet.addRow({ metric: '  Date To', value: query.date_to });
    if (query.status) overviewSheet.addRow({ metric: '  Status', value: query.status });
    if (query.priority) overviewSheet.addRow({ metric: '  Priority', value: query.priority });
    if (query.type) overviewSheet.addRow({ metric: '  Type ID', value: query.type });
    if (query.topic) overviewSheet.addRow({ metric: '  Topic ID', value: query.topic });
    if (query.territory) overviewSheet.addRow({ metric: '  Territory', value: query.territory });
    overviewSheet.addRow({});
  }

  addBreakdownSection(overviewSheet, 'By Status', overview.byStatus, 'status');
  addBreakdownSection(overviewSheet, 'By Priority', overview.byPriority, 'priority');
  addBreakdownSection(overviewSheet, 'By Type', overview.byType, 'type');
  addBreakdownSection(overviewSheet, 'By Topic', overview.byTopic, 'topic');
  addBreakdownSection(overviewSheet, 'By Executor', overview.byExecutor, 'executor');
  addBreakdownSection(overviewSheet, 'By Territory', overview.byTerritory, 'territory');
  addBreakdownSection(overviewSheet, 'By Social Group', overview.bySocialGroup, 'socialGroup');
  addBreakdownSection(overviewSheet, 'By Intake Form', overview.byIntakeForm, 'intakeForm');

  const dynamicsSheet = workbook.addWorksheet('Dynamics');
  dynamicsSheet.columns = [
    { header: 'Period', key: 'period', width: 15 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'New', key: 'new', width: 10 },
    { header: 'In Progress', key: 'inProgress', width: 15 },
    { header: 'Completed', key: 'completed', width: 12 },
    { header: 'Paused', key: 'paused', width: 10 },
    { header: 'Archived', key: 'archived', width: 10 }
  ];

  dynamics.series.forEach(item => {
    dynamicsSheet.addRow(item);
  });

  overviewSheet.getRow(1).font = { bold: true };
  dynamicsSheet.getRow(1).font = { bold: true };

  if (userId) {
    await logAuditEntry({
      user_id: userId,
      action: 'export_excel',
      entity_type: 'report',
      payload: { filters: query },
      created_at: new Date().toISOString()
    });
  }

  return workbook;
}

async function generatePdfExport(query, userId = null) {
  const overview = await getOverview(query);
  const dynamics = await getDynamics(query);

  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text('Request Management Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  if (query.date_from || query.date_to || query.status || query.priority) {
    doc.fontSize(12).text('Applied Filters:', { underline: true });
    doc.fontSize(10);
    if (query.date_from) doc.text(`  Date From: ${query.date_from}`);
    if (query.date_to) doc.text(`  Date To: ${query.date_to}`);
    if (query.status) doc.text(`  Status: ${query.status}`);
    if (query.priority) doc.text(`  Priority: ${query.priority}`);
    if (query.type) doc.text(`  Type ID: ${query.type}`);
    if (query.topic) doc.text(`  Topic ID: ${query.topic}`);
    if (query.territory) doc.text(`  Territory: ${query.territory}`);
    doc.moveDown();
  }

  doc.fontSize(14).text(`Total Requests: ${overview.total}`, { bold: true });
  doc.moveDown();

  addPdfSection(doc, 'Breakdown by Status', overview.byStatus, 'status');
  addPdfSection(doc, 'Breakdown by Priority', overview.byPriority, 'priority');
  addPdfSection(doc, 'Top Executors', overview.byExecutor, 'executor');
  addPdfSection(doc, 'Top Territories', overview.byTerritory, 'territory');

  doc.addPage();
  doc.fontSize(16).text('Time Series Data', { underline: true });
  doc.moveDown();
  doc.fontSize(10);

  if (dynamics.series.length > 0) {
    dynamics.series.slice(0, 20).forEach(item => {
      doc.text(
        `${item.period}: Total=${item.total} (New=${item.new}, InProgress=${item.inProgress}, Completed=${item.completed})`
      );
    });
    if (dynamics.series.length > 20) {
      doc.moveDown();
      doc.text(`... and ${dynamics.series.length - 20} more periods`);
    }
  } else {
    doc.text('No data available for the selected period');
  }

  doc.end();

  if (userId) {
    await logAuditEntry({
      user_id: userId,
      action: 'export_pdf',
      entity_type: 'report',
      payload: { filters: query },
      created_at: new Date().toISOString()
    });
  }

  return doc;
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

function buildWhereClause(filters) {
  const conditions = [];

  if (filters.fio) conditions.push('LOWER(r.citizen_fio) LIKE LOWER(?)');
  if (filters.typeId) conditions.push('r.request_type_id = ?');
  if (filters.topicId) conditions.push('r.request_topic_id = ?');
  if (filters.status) conditions.push('r.status = ?');
  if (filters.executor) conditions.push('LOWER(r.executor) LIKE LOWER(?)');
  if (filters.priority) conditions.push('r.priority = ?');
  if (filters.address) conditions.push('LOWER(r.address) LIKE LOWER(?)');
  if (filters.territory) conditions.push('LOWER(r.territory) LIKE LOWER(?)');
  if (filters.socialGroupId) conditions.push('r.social_group_id = ?');
  if (filters.intakeFormId) conditions.push('r.intake_form_id = ?');
  if (filters.contactChannel) conditions.push('r.contact_channel = ?');
  if (filters.dateFrom) conditions.push('date(r.created_at) >= date(?)');
  if (filters.dateTo) conditions.push('date(r.created_at) <= date(?)');
  if (filters.search) conditions.push('r.id IN (SELECT id FROM request_search WHERE request_search MATCH ?)');

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

function buildParams(filters) {
  const params = [];

  if (filters.fio) params.push(`%${filters.fio}%`);
  if (filters.typeId) params.push(filters.typeId);
  if (filters.topicId) params.push(filters.topicId);
  if (filters.status) params.push(filters.status);
  if (filters.executor) params.push(`%${filters.executor}%`);
  if (filters.priority) params.push(filters.priority);
  if (filters.address) params.push(`%${filters.address}%`);
  if (filters.territory) params.push(`%${filters.territory}%`);
  if (filters.socialGroupId) params.push(filters.socialGroupId);
  if (filters.intakeFormId) params.push(filters.intakeFormId);
  if (filters.contactChannel) params.push(filters.contactChannel);
  if (filters.dateFrom) params.push(filters.dateFrom);
  if (filters.dateTo) params.push(filters.dateTo);
  if (filters.search) params.push(filters.search);

  return params;
}

function addBreakdownSection(sheet, title, data, key) {
  sheet.addRow({ metric: title, value: '' });
  if (data.length === 0) {
    sheet.addRow({ metric: '  No data', value: '' });
  } else {
    data.forEach(item => {
      sheet.addRow({ metric: `  ${item[key]}`, value: item.count });
    });
  }
  sheet.addRow({});
}

function addPdfSection(doc, title, data, key) {
  if (doc.y > 650) {
    doc.addPage();
  }

  doc.fontSize(12).text(title, { underline: true });
  doc.fontSize(10);

  if (data.length === 0) {
    doc.text('  No data');
  } else {
    data.forEach(item => {
      doc.text(`  ${item[key]}: ${item.count}`);
    });
  }
  doc.moveDown();
}

module.exports = {
  getOverview,
  getDynamics,
  generateExcelExport,
  generatePdfExport
};
