# Reporting API Usage Guide

## Overview

The Reporting & Analytics module provides comprehensive insights into request data through aggregated overviews, time-series analysis, and export capabilities. All endpoints require authentication with **supervisor** or **admin** role.

## Authentication

All reporting endpoints require a JWT token with supervisor or admin role:

```bash
# Include in Authorization header
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Overview Report

Get aggregated statistics across multiple dimensions.

**Endpoint:** `GET /api/reports/overview`

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/overview"
```

**With Filters:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/overview?status=new&priority=high&date_from=2025-01-01&date_to=2025-12-31"
```

**Available Filters:**
- `status`: Filter by request status (new, in_progress, paused, completed, archived)
- `priority`: Filter by priority (low, medium, high, urgent)
- `type`: Filter by request type ID
- `topic`: Filter by request topic ID
- `social_group_id`: Filter by social group ID
- `intake_form_id`: Filter by intake form ID
- `territory`: Filter by territory name
- `executor`: Filter by executor name
- `fio`: Filter by citizen name
- `address`: Filter by address
- `contact_channel`: Filter by contact channel
- `date_from`: Start date for creation date range (ISO-8601)
- `date_to`: End date for creation date range (ISO-8601)
- `search`: Full-text search

**Response Structure:**
```json
{
  "total": 150,
  "byStatus": [
    { "status": "new", "count": 45 },
    { "status": "in_progress", "count": 60 },
    { "status": "completed", "count": 45 }
  ],
  "byType": [
    { "type": "Water Supply", "count": 50 },
    { "type": "Street Lighting", "count": 45 }
  ],
  "byTopic": [
    { "topic": "Leak Response", "count": 30 }
  ],
  "byExecutor": [
    { "executor": "John Doe", "count": 25 }
  ],
  "byTerritory": [
    { "territory": "District 1", "count": 40 }
  ],
  "bySocialGroup": [
    { "socialGroup": "Families with Children", "count": 20 }
  ],
  "byIntakeForm": [
    { "intakeForm": "Online Form", "count": 80 }
  ],
  "byPriority": [
    { "priority": "urgent", "count": 10 },
    { "priority": "high", "count": 35 },
    { "priority": "medium", "count": 70 },
    { "priority": "low", "count": 35 }
  ]
}
```

### 2. Time-Series Dynamics

Get trend data over time with status breakdowns.

**Endpoint:** `GET /api/reports/dynamics`

**Daily Grouping (default):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/dynamics"
```

**Weekly Grouping:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/dynamics?groupBy=weekly"
```

**With Date Range:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/dynamics?groupBy=daily&date_from=2025-11-01&date_to=2025-11-30"
```

**Parameters:**
- `groupBy`: Time grouping (daily or weekly)
- All filter parameters from overview endpoint

**Response Structure:**
```json
{
  "groupBy": "daily",
  "series": [
    {
      "period": "2025-12-01",
      "total": 15,
      "new": 5,
      "inProgress": 8,
      "completed": 2,
      "paused": 0,
      "archived": 0
    },
    {
      "period": "2025-12-02",
      "total": 12,
      "new": 3,
      "inProgress": 7,
      "completed": 2,
      "paused": 0,
      "archived": 0
    }
  ]
}
```

### 3. Export Reports

Download reports in Excel or PDF format.

**Endpoint:** `GET /api/reports/export`

**Excel Export:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/export?format=excel" \
  -o report.xlsx
```

**PDF Export:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/export?format=pdf" \
  -o report.pdf
```

**Export with Filters:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/export?format=excel&status=completed&date_from=2025-01-01&date_to=2025-12-31&territory=District1" \
  -o completed_requests_2025.xlsx
```

**Parameters:**
- `format`: **Required** - `excel` or `pdf`
- All filter parameters from overview endpoint

**Excel Export Contents:**
- **Overview Sheet**: 
  - Report metadata (generation timestamp)
  - Applied filters
  - Total request count
  - All aggregated breakdowns (status, type, topic, executor, territory, social group, intake form, priority)
- **Dynamics Sheet**: 
  - Time-series data with daily/weekly periods
  - Total counts and status breakdowns per period

**PDF Export Contents:**
- Report header with generation timestamp
- Applied filters section
- Total requests count
- Key breakdowns (status, priority, top executors, top territories)
- Time-series summary (first 20 periods)

## JavaScript/Node.js Examples

### Using fetch (Node.js 18+)

```javascript
const token = 'YOUR_JWT_TOKEN';

// Get overview
const overview = await fetch('http://localhost:3000/api/reports/overview', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await overview.json();
console.log('Total requests:', data.total);

// Get dynamics
const dynamics = await fetch('http://localhost:3000/api/reports/dynamics?groupBy=weekly', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const timeData = await dynamics.json();
console.log('Time series:', timeData.series);

// Download Excel
const excelResponse = await fetch('http://localhost:3000/api/reports/export?format=excel', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const buffer = await excelResponse.arrayBuffer();
const fs = require('fs');
fs.writeFileSync('report.xlsx', Buffer.from(buffer));
```

### Using axios

```javascript
const axios = require('axios');
const fs = require('fs');

const token = 'YOUR_JWT_TOKEN';
const config = {
  headers: { 'Authorization': `Bearer ${token}` }
};

// Get overview with filters
const overview = await axios.get(
  'http://localhost:3000/api/reports/overview',
  {
    ...config,
    params: {
      status: 'new',
      priority: 'high',
      date_from: '2025-01-01',
      date_to: '2025-12-31'
    }
  }
);
console.log('Overview:', overview.data);

// Download PDF
const pdf = await axios.get(
  'http://localhost:3000/api/reports/export?format=pdf',
  { ...config, responseType: 'arraybuffer' }
);
fs.writeFileSync('report.pdf', pdf.data);
```

## Use Cases

### 1. Monthly Performance Report
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/export?format=excel&date_from=2025-11-01&date_to=2025-11-30" \
  -o november_2025_report.xlsx
```

### 2. High Priority Requests Analysis
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/overview?priority=high&priority=urgent"
```

### 3. Territory Performance Comparison
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/overview?territory=District1"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/overview?territory=District2"
```

### 4. Weekly Trend Analysis
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/dynamics?groupBy=weekly&date_from=2025-01-01"
```

## Error Handling

**401 Unauthorized:**
```json
{
  "message": "Missing or invalid authorization header"
}
```

**403 Forbidden:**
```json
{
  "message": "Insufficient permissions"
}
```

**400 Bad Request:**
```json
{
  "errors": [
    {
      "msg": "Format must be excel or pdf",
      "param": "format",
      "location": "query"
    }
  ]
}
```

## Audit Trail

All report accesses and exports are logged in the audit_log table:
- `view_overview`: When overview endpoint is accessed
- `view_dynamics`: When dynamics endpoint is accessed
- `export_excel`: When Excel export is generated
- `export_pdf`: When PDF export is generated

Each entry includes:
- User ID
- Timestamp
- Applied filters (in payload field)

## Performance Notes

- Reports are generated on-demand (not cached)
- Exports stream data efficiently (no full buffering)
- Expected generation time: < 10 seconds for typical datasets
- Recommended to use filters for large datasets to improve performance
- SQL queries use indexes for optimal performance
