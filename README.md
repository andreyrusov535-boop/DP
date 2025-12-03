# Request Management System - Frontend Dashboard MVP

## Overview

This is a responsive HTML/CSS/Vanilla JavaScript frontend for a Request Management System. It provides a modern, accessible dashboard for managing requests with role-based features.

## Features

### Authentication
- Login and registration forms
- JWT token storage (in-memory + sessionStorage)
- Automatic token refresh
- Password validation with strength requirements
- Email validation

### Dashboard Views
- **Overview**: Dashboard with statistics and reporting widgets
  - Request counts by status
  - Request counts by type
  - Real-time updates (every 30 seconds)

- **Requests**: Browse, filter, and manage requests
  - Advanced filtering (type, status, executor, date range, text search)
  - Request list with status badges and deadline indicators
  - Role-based inline actions

- **Create Request**: Form to create new requests
  - Support for file attachments (JPG, PNG, PDF - max 10MB)
  - Client-side file validation
  - Deadline scheduling

### Request Management
- **View Details**: Modal to view full request information
- **Edit Request**: Update request details (role-based permissions)
- **Delete Request**: Remove requests (operators only)
- **Assign Request**: Assign executors (supervisors only)
- **Status Management**: Update request status (supervisors)

### Responsive Design
- Desktop, tablet, and mobile layouts
- CSS Grid/Flexbox for responsive layouts
- Touch-friendly interface
- Print-friendly styling
- Dark mode support (system preference)
- High contrast mode support
- Reduced motion support

### Accessibility
- ARIA labels and roles
- Semantic HTML
- Keyboard navigation
- Color contrast compliance
- Focus indicators
- Form validation messages

### User Interface
- Loading states with spinner animations
- Success/error notifications with auto-dismiss
- Form validation with inline error messages
- Modal dialogs for editing/viewing
- Deadline status badges (normal, approaching, overdue)
- Role-based UI elements
- User profile indicator

## File Structure

```
public/
├── index.html              # Main HTML file
├── styles/
│   ├── main.css           # Main stylesheet with CSS variables
│   └── responsive.css     # Responsive breakpoints and media queries
└── js/
    ├── config.js          # Configuration and constants
    ├── auth.js            # Authentication module (JWT, login, register)
    ├── api.js             # API client with fetch helpers
    ├── utils.js           # Utility functions (formatting, validation)
    ├── ui.js              # UI manipulation and rendering
    └── app.js             # Main application logic
```

## Technical Stack

- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern CSS with Grid, Flexbox, CSS variables, media queries
- **Vanilla JavaScript**: ES6+ with module pattern
- **No external dependencies**: Pure frontend with no build tools required

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## API Integration

The frontend expects a backend API at `http://localhost:3000/api` with the following endpoints:

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new account
- `POST /api/auth/refresh` - Refresh access token

### Requests
- `GET /api/requests` - List requests (with optional filters)
- `GET /api/requests/:id` - Get request details
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request
- `POST /api/requests/:id/assign` - Assign executor
- `PATCH /api/requests/:id/status` - Update status

### Statistics
- `GET /api/stats/overview` - Get dashboard statistics

## Backend API Server

A production-ready Express + SQLite service that fulfills the dashboard contract ships with this repository.

- **Location**: `/src`, entry point `src/server.js`
- **Install & Run**: `npm install && npm start` (defaults to port `3000`)
- **Tests**: `npm test` (Jest + Supertest integration suite)
- **Detailed spec**: [`API_SPEC.md`](./API_SPEC.md)

### Key Capabilities
- Request domain model covering citizen FIO, contact data, type/topic references, description, status, executor, priority, due date, and computed control status
- Express-validator + sanitize-html input hardening on every write
- Filtering, search, pagination, and sorting backed by DB indexes for performant queries
- Attachment pipeline (≤5 files/request, JPEG/PNG/GIF/PDF, ≤10 MB each) with persistent metadata and secure download endpoints
- Deadline control recalculated on read/write plus a scheduled cron refresh and notification hooks for approaching/overdue deadlines
- Audit trails recorded in both `audit_log` and `request_proceedings` tables for every mutation
- Nomenclature endpoints for request types/topics used by the frontend filters

## JWT Storage Strategy

The application uses a hybrid approach for JWT token management:

1. **In-Memory Storage**: Tokens are stored in JavaScript variables for the current session
2. **SessionStorage Backup**: Tokens are also stored in sessionStorage for page refresh resilience
3. **No Persistent Storage**: Tokens are cleared on logout or browser close
4. **Automatic Refresh**: Access tokens are refreshed every 5 minutes

## File Upload Validation

Client-side validation for file uploads:

- **Max Size**: 10MB
- **Allowed Types**: JPG, PNG, PDF
- **Allowed Extensions**: .jpg, .jpeg, .png, .pdf

## CSS Variables

Key CSS variables defined in `:root`:

```css
--primary-color: #2563eb
--secondary-color: #64748b
--success-color: #10b981
--danger-color: #ef4444
--warning-color: #f59e0b
--info-color: #0ea5e9
--background-color: #f8fafc
--surface-color: #ffffff
--border-color: #e2e8f0
--text-primary: #1e293b
--text-secondary: #64748b
--text-light: #94a3b8
```

## Responsive Breakpoints

- **Large Desktop**: 1600px and up
- **Desktop**: 1200px and up
- **Tablet**: 768px and up
- **Mobile**: 480px and below

## User Roles

- **Citizen**: Can create and view own requests
- **Operator**: Can create, edit, and manage their assigned requests
- **Supervisor**: Can view all requests and manage assignments

## Error Handling

- Network error notifications
- API error messages
- Form validation with inline feedback
- Loading states during async operations
- Token expiration handling with automatic re-authentication

## Security Features

- CSRF token support in headers
- Authorization header with JWT
- Input sanitization (escapeHtml)
- Password strength validation
- Email validation
- Secure file upload validation

## Development Notes

### Module Pattern
Each JavaScript module is self-contained and uses the revealing module pattern for encapsulation.

### Event Delegation
Request list actions use event delegation for efficient event handling.

### Utilities
The Utils module provides common functions for:
- Date/time formatting
- Form validation
- File validation
- Text formatting
- Debouncing/throttling

### Storage
- Authentication tokens stored in sessionStorage
- User info stored in sessionStorage
- All storage cleared on logout

## Testing Acceptance Criteria

✓ Running backend and opening index.html allows login
✓ Creating requests with forms and file inputs
✓ Filtering requests with multiple filters
✓ Responsive layout on desktop, tablet, and mobile
✓ Role-based permissions for operators, supervisors, and citizens
✓ Deadline status indicators (normal/approaching/overdue)
✓ Error and success notifications
✓ Loading states during data fetching
✓ Accessibility labels and keyboard navigation
✓ Validated in Chrome and Firefox

## Getting Started

1. Ensure backend is running at `http://localhost:3000`
2. Open `public/index.html` in a browser
3. Register or login with credentials
4. Start managing requests!

## Browser DevTools

The application logs key events to the console for debugging:
- API requests and responses
- Auth state changes
- Errors and failures
- Loading states

Use Chrome DevTools (F12) to inspect network requests, storage, and console output.
