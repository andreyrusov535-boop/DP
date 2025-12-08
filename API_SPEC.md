# Request Workflow API Specification

## Overview

The Request Workflow API is a lightweight Express + SQLite service that powers the dashboard frontend. It handles full request lifecycle management, attachment storage, deadline control, and nomenclature lookups. All endpoints are prefixed with `/api`.

- Base URL (local): `http://localhost:3000/api`
- Authentication: not enforced for this MVP (plug in auth middleware as needed)
- Content types: `application/json` or `multipart/form-data` for payloads with attachments

## Domain Model

### Request Fields

| Field | Type | Description |
| --- | --- | --- |
| `citizenFio` | string (required) | Full name of the citizen |
| `contactEmail` | string (optional) | Contact email (validated) |
| `contactPhone` | string (optional) | Contact phone (min 5 chars) |
| `requestTypeId` | integer (optional) | Foreign key to nomenclature `request_types` |
| `requestTopicId` | integer (optional) | Foreign key to nomenclature `request_topics` |
| `description` | string (required) | Request body, sanitized with `sanitize-html` |
| `status` | enum | `new`, `in_progress`, `paused`, `completed`, `archived` |
| `executor` | string (optional) | Assigned operator (display name) |
| `executorUserId` | integer (optional) | Foreign key to `users` table; must have executor/operator/supervisor/admin role with active status |
| `priority` | enum | `low`, `medium`, `high`, `urgent` |
| `dueDate` | ISO 8601 string (optional) | Deadline |
| `controlStatus` | enum | `no`, `normal`, `approaching`, `overdue` (computed) |
| `attachments` | array | Up to 5 files per request, metadata persisted in `files` table |

All write operations use `express-validator` + `sanitize-html`. Every mutation is logged into `audit_log` and `request_proceedings`.

## Endpoints

### `POST /api/requests`
Create a new request.

- **Body**: JSON or multipart form with the fields above (`citizenFio` & `description` required)
- **Attachments**: multipart field name `attachments`, up to 5 files, each ≤ 10 MB, types: JPEG, PNG, GIF, PDF
- **Response**: created request object with attachment metadata and download URLs

### `GET /api/requests`
List requests with rich filtering.

Query parameters:

| Param | Description |
| --- | --- |
| `fio` | Partial match on citizen FIO |
| `type` | Type ID |
| `topic` | Topic ID |
| `status` | Status enum |
| `executor` | Partial executor name |
| `priority` | Priority enum |
| `date_from` / `date_to` | Due date range (ISO-8601) |
| `search` | Full-text search across description, citizen FIO, executor, contact email |
| `page` | Page number (default 1) |
| `limit` | Page size (default 20, max 100) |
| `sort_by` | `created_at`, `due_date`, `priority`, `status`, `control_status`, `citizen_fio` |
| `sort_order` | `asc` or `desc` |

**Response**: `{ data: Request[], meta: { total, page, limit, pages } }`

All deadlines are recalculated on read before returning.

### `GET /api/requests/:id`
Fetch a single request with attachments.

- **Path params**: `id` (integer)
- **Response**: request object or `404`

### `PATCH /api/requests/:id`
Partial update. Accepts JSON or multipart for attaching additional files.

- Validates the same fields as POST (all optional).
- Adds new attachments while ensuring total per request ≤ 5.
- Recalculates `controlStatus` when deadlines change.

### `GET /api/files/:id/download`
Secure download endpoint for stored attachments.

- Validates file ownership, ensures the underlying file exists on disk, and streams it with the original filename.

### `GET /api/nomenclature`
Returns both request types and topics.

- `GET /api/nomenclature/types`
- `GET /api/nomenclature/topics`

## Nomenclature Admin API (Reference Data Management)

All nomenclature admin endpoints require **authentication** with `supervisor` or `admin` role.

### `GET /api/nomenclature-admin/:entity`
List nomenclature items for a given entity type.

- **Path params**: `entity` (one of: `request_types`, `request_topics`, `intake_forms`, `social_groups`)
- **Query params**:
  - `limit` (default 50, max 100): Page size
  - `offset` (default 0): Pagination offset
  - `includeInactive` (default false): Include deactivated items

- **Response**: `{ items: [], total: number, limit: number, offset: number, page: number }`

### `GET /api/nomenclature-admin/:entity/:id`
Get a specific nomenclature item.

- **Path params**: `entity`, `id` (integer)
- **Query params**: `includeInactive` (optional)
- **Response**: `{ id, code, name, active }`

### `POST /api/nomenclature-admin/:entity`
Create a new nomenclature item.

- **Path params**: `entity`
- **Body**: `{ code (string, required), name (string, required) }`
- **Validation**: Code must be unique per entity, both fields must be non-empty
- **Response**: created item object with status 201

### `PATCH /api/nomenclature-admin/:entity/:id`
Update nomenclature item code and/or name.

- **Path params**: `entity`, `id`
- **Body**: `{ code? (string), name? (string) }` (at least one field required)
- **Validation**: Code uniqueness enforced, empty values rejected
- **Response**: updated item object

### `PATCH /api/nomenclature-admin/:entity/:id/toggle`
Toggle the active status of an item.

- **Path params**: `entity`, `id`
- **Body**: `{ active (boolean, required) }`
- **Response**: updated item object

All create/update operations are logged in `audit_log` with action type: `create`, `update`, `activate`, or `deactivate`.

### `GET /api/reports/overview`
Returns aggregated analytics overview. **Requires authentication with supervisor or admin role.**

Query parameters (all optional, used for filtering):

| Param | Description |
| --- | --- |
| `status` | Filter by status enum |
| `priority` | Filter by priority enum |
| `type` | Filter by request type ID |
| `topic` | Filter by request topic ID |
| `social_group_id` | Filter by social group ID |
| `intake_form_id` | Filter by intake form ID |
| `territory` | Filter by territory |
| `executor` | Filter by executor name |
| `fio` | Filter by citizen FIO |
| `address` | Filter by address |
| `contact_channel` | Filter by contact channel |
| `date_from` / `date_to` | Filter by creation date range (ISO-8601) |
| `search` | Full-text search |

**Response**:
```json
{
  "total": 150,
  "byStatus": [
    { "status": "new", "count": 45 },
    { "status": "in_progress", "count": 60 }
  ],
  "byType": [
    { "type": "Water Supply", "count": 50 }
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
    { "priority": "high", "count": 35 }
  ]
}
```

### `GET /api/reports/dynamics`
Returns time-series data for trend analysis. **Requires authentication with supervisor or admin role.**

Query parameters:
- All filter parameters from `/overview` endpoint
- `groupBy`: `daily` (default) or `weekly`

**Response**:
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
    }
  ]
}
```

### `GET /api/reports/export`
Generates and streams Excel or PDF export. **Requires authentication with supervisor or admin role.**

Query parameters:
- `format`: **required**, must be `excel` or `pdf`
- All filter parameters from `/overview` endpoint

**Response**:
- Excel: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PDF: `Content-Type: application/pdf`
- Both include `Content-Disposition` header with suggested filename

**Excel export** includes two worksheets:
1. **Overview**: Metadata, applied filters, and all aggregated breakdowns
2. **Dynamics**: Time-series data with period, total, and status counts

**PDF export** includes:
- Report header with generation timestamp
- Applied filters section
- Total requests count
- All breakdowns (status, priority, executors, territories)
- Time-series summary (first 20 periods)

All report endpoints log audit entries for traceability.

## Deadline Control Logic

- Threshold: 48 hours
- `controlStatus` transitions:
  - `no`: no due date
  - `normal`: due date > 48h away
  - `approaching`: due date within 48h
  - `overdue`: past due date
- Recalculation happens on every read/write and via a scheduled cron job (`0 3 * * *`) in production.
- Notifications hook logs approaching/overdue events (`[deadline-notification]` console output).

## Automated Notifications & Executor Assignment

### Executor Assignment
When assigning a request to an executor via `executorUserId`:
- The user must exist and have role: `operator`, `executor`, `supervisor`, or `admin`
- The user must have status: `active`
- Both `executor` (text display name) and `executorUserId` (FK) are stored for flexibility
- Can be set during POST `/api/requests` or PATCH `/api/requests/:id`

### Notification Scheduling
- **Job**: `src/jobs/notificationJob.js` scheduled via `node-cron` with pattern from `NOTIFICATION_CRON_SCHEDULE` (default: hourly at `0 * * * *`)
- **Due Soon Notifications**: Fired 24 hours before deadline (configurable via `NOTIFICATION_HOURS_BEFORE_DEADLINE`)
  - Sent to executor email if `executorUserId` is set
  - Only for requests with status NOT in `['completed', 'archived']`
  - Prevented from duplicate sends via `deadline_notifications` table tracking
- **Overdue Notifications**: Fired when deadline passes
  - Sent to all `active` users with roles: `supervisor` or `admin`
  - Only once per request via duplicate prevention
- **Email Delivery**: Via `nodemailer`
  - Production: Uses configured SMTP server (see `SMTP_*` env vars)
  - Development/Test: Logs to console (`[email-notification]` prefix) for inspection
- **Configuration**: See `NOTIFICATION_*` and `SMTP_*` environment variables in `.env.example`

### Preventing Duplicate Notifications
- `deadline_notifications` table tracks all sent notifications with:
  - `request_id`: which request was notified
  - `notification_type`: `'due_soon'` or `'overdue'`
  - `target_user_id`: who was notified
  - `created_at`: when the notification was sent
- Before sending, the service checks if a notification already exists for that (request_id, notification_type) pair
- This ensures idempotent scheduling even if the cron job reruns

## File Handling

- Storage: disk (`/uploads` in production, `/uploads_test` during tests)
- Validation: `multer` enforces MIME and size, service layer enforces per-request count
- Metadata persisted in `files` table (original name, stored name, MIME, size, created_at)
- Download URLs: `/api/files/:fileId/download`

## Auditing & Proceedings

Every `POST`/`PATCH` writes serialized payload details to both `audit_log` (`payload` column) and `request_proceedings` (`notes` column). These tables are ready for downstream analytics or notification pipelines. Executor assignments are validated and logged.

## Testing & Verification

- Run `npm test` to execute Jest + Supertest integration suite covering CRUD flows, filtering, attachment limits, downloads, and nomenclature lookups.
- Manual smoke test:
  1. `npm start`
  2. `POST /api/requests` with a due date ~72h ahead → confirm `controlStatus: normal`
  3. `PATCH /api/requests/:id` shrinking the deadline to < 48h → `controlStatus: approaching`
  4. Wait/poke cron (or `runDeadlineRefreshOnce`) to observe `overdue` transition if the due date passes

See `README.md` for run instructions. This spec aligns the backend contract with the existing frontend dashboard expectations.
