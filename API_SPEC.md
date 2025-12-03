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
| `executor` | string (optional) | Assigned operator |
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

## Deadline Control Logic

- Threshold: 48 hours
- `controlStatus` transitions:
  - `no`: no due date
  - `normal`: due date > 48h away
  - `approaching`: due date within 48h
  - `overdue`: past due date
- Recalculation happens on every read/write and via a scheduled cron job (`0 3 * * *`) in production.
- Notifications hook logs approaching/overdue events (`[deadline-notification]` console output).

## File Handling

- Storage: disk (`/uploads` in production, `/uploads_test` during tests)
- Validation: `multer` enforces MIME and size, service layer enforces per-request count
- Metadata persisted in `files` table (original name, stored name, MIME, size, created_at)
- Download URLs: `/api/files/:fileId/download`

## Auditing & Proceedings

Every `POST`/`PATCH` writes serialized payload details to both `audit_log` (`payload` column) and `request_proceedings` (`notes` column). These tables are ready for downstream analytics or notification pipelines.

## Testing & Verification

- Run `npm test` to execute Jest + Supertest integration suite covering CRUD flows, filtering, attachment limits, downloads, and nomenclature lookups.
- Manual smoke test:
  1. `npm start`
  2. `POST /api/requests` with a due date ~72h ahead → confirm `controlStatus: normal`
  3. `PATCH /api/requests/:id` shrinking the deadline to < 48h → `controlStatus: approaching`
  4. Wait/poke cron (or `runDeadlineRefreshOnce`) to observe `overdue` transition if the due date passes

See `README.md` for run instructions. This spec aligns the backend contract with the existing frontend dashboard expectations.
