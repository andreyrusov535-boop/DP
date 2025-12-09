# Request Management System - Phase 3

## Overview

A comprehensive, production-ready Request Management System with JWT authentication, role-based access control, file handling, reporting, and full audit trails. Built with Node.js/Express backend and vanilla JavaScript frontend.

**Current Version**: 1.0.0  
**Status**: Production Ready (Post-UAT)

## Quick Links

- **[Installation Guide](docs/INSTALLATION.md)** - Setup for development, Docker, and production
- **[Administrator Guide](docs/ADMIN_GUIDE.md)** - System administration and configuration
- **[User Guide](docs/USER_GUIDE.md)** - Role-based user instructions
- **[API Specification](docs/openapi.yaml)** - Complete OpenAPI/Swagger documentation
- **[UAT Checklist](docs/UAT_CHECKLIST.md)** - Testing and release procedures
- **[Changelog](CHANGELOG.md)** - Release notes and version history

## Features

### Authentication
- Login and registration forms with enhanced accessibility
- JWT token storage (in-memory + sessionStorage)
- Automatic token refresh
- Password validation with strength requirements
- Email validation
- Screen reader support for form validation

### Dashboard Views
- **Overview**: Dashboard with statistics and reporting widgets
  - Request counts by status
  - Request counts by type
  - Real-time updates (every 30 seconds)
  - High contrast mode support

- **Requests**: Browse, filter, and manage requests
  - Advanced filtering (type, status, executor, date range, text search)
  - Request list with status badges and deadline indicators
  - Role-based inline actions
  - Virtual scrolling for large datasets (50+ items)
  - Debounced search inputs to prevent unnecessary API calls
  - AbortController support to cancel in-flight requests

- **Create Request**: Form to create new requests
  - Support for multi-file attachments (up to 5 files per request)
  - Supported formats: JPEG, PNG, GIF, PDF
  - Size limit: 10MB per file
  - Client-side file validation with error messages
  - Deadline scheduling
  - Enhanced inline validation with aria-describedby

- **File Management**:
  - View and download attachments with preserved filenames
  - Delete individual attachments (operators/admins only)
  - Upload additional files when editing requests
  - Metadata display: file size, type, upload date
  - Audit trail for all attachment operations

- **Reports & Analytics** (Supervisors/Admins only):
   - Interactive KPI cards with key metrics
   - Visual charts powered by Chart.js with memory management
      - Requests by Status (Doughnut Chart)
      - Monthly Dynamics (Stacked Bar Chart with daily/weekly grouping)
      - Reduced motion support for accessibility
   - Filterable data (status, type, territory, executor, date range)
   - Export capabilities (Excel and PDF)
   - Trends table with time-series breakdown
   - Responsive visualizations for all screen sizes

### Accessibility Features
- **WCAG 2.1 AA Compliance**:
  - Semantic HTML5 structure with proper ARIA labels
  - Focus management and keyboard navigation
  - Screen reader announcements for dynamic content
  - Skip navigation links
  - High contrast mode support via `prefers-contrast: high`
  - Reduced motion support via `prefers-reduced-motion: reduce`
  - Touch-friendly targets (44px minimum)
  - Focus indicators and outlines
  - Live regions for status updates

- **Keyboard Navigation**:
  - Tab order management
  - Escape key closes modals
  - Ctrl/Cmd+K focuses search
  - Arrow key navigation in lists
  - Focus trapping in modals

### Responsive Design
- **Breakpoint Support**:
  - **Large Desktop (1280px+)**: Optimized for 1280×720 displays
  - **Standard Desktop (1024-1279px)**: Optimized for 1024×768 tablets
  - **Tablet (768-1023px)**: Portrait tablet layouts
  - **Mobile (≤480px)**: Optimized for 320px phones
  - **Small Mobile (≤320px)**: Extra small phone optimization

- **Layout Features**:
  - No horizontal scroll on any screen size
  - Flexible grid systems that reflow properly
  - Collapsible sidebars on mobile
  - Touch-optimized buttons and spacing
  - Readable typography at all sizes

### Performance Optimizations
- **Request Management**:
  - Debounced filter inputs (300ms delay, 500ms for search)
  - AbortController cancels stale requests
  - Virtual scrolling for large lists
  - Chart.js memory management and cleanup
  - Lazy loading for heavy sections

- **Network Performance**:
  - Response time targets: ≤2s for API calls, ≤10s for report generation
  - Concurrent request handling
  - Efficient DOM updates with document fragments
  - Optimized asset loading

## Browser Support

### Supported Browsers
- **Chrome 90+** (Recommended)
- **Firefox 88+** (Full support)
- **Edge 90+** (Full support)
- **Safari 14+** (Full support)

### Compatibility Features
- Modern JavaScript (ES2020+) features
- CSS Grid and Flexbox layouts
- CSS Custom Properties (variables)
- Fetch API with AbortController
- Web Accessibility API
- Responsive Viewport Units

## Performance Testing

### Running Performance Tests
```bash
# Ensure server is running
npm run dev

# Run performance smoke test
npm run perf

# Custom base URL (optional)
BASE_URL=http://localhost:3001 npm run perf
```

### Performance Metrics
The performance test validates:
- **API Response Times**: ≤2s average, ≤2s maximum
- **Health Check**: ≤500ms average, ≤1s maximum
- **Static Assets**: ≤300ms average, ≤1s maximum
- **Throughput**: Handles concurrent requests efficiently
- **Error Rates**: <1% for healthy endpoints

### Performance Guidelines
- Requests list renders in <2s with 100+ entries
- Charts initialize without memory leaks
- Filter changes don't queue stale network calls
- Smooth scrolling at 60fps on all devices
- No layout jank during data updates

- **Reference Data Management** (Supervisors/Admins only):
   - Manage nomenclature/reference data for the system
   - Tabs for different entity types: Request Types, Request Topics, Intake Forms, Social Groups
   - Create, edit, and deactivate nomenclature items
   - Real-time table updates
   - Code and name validation
   - Duplicate prevention
   - Active/inactive status toggle
   - Audit logging for all changes

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

A production-ready Express 4.18+ Node.js 18+ API with SQLite database that fulfills the dashboard contract ships with this repository.

### Quick Start

```bash
# Install dependencies
npm install

# Setup environment (optional - sensible defaults provided)
cp .env.example .env

# Run database migrations
npm run migrate

# Development mode (with auto-reload via nodemon)
npm run dev

# Production mode
npm start

# Run tests
npm test

# Lint with auto-fix
npm run lint
```

### Features & Capabilities

- **Request domain model**: Citizen FIO, contact data, type/topic references, description, status, executor, priority, due date, and computed control status
- **Security hardening**: Helmet for HTTP headers, CORS support, rate limiting (100 req/15min), input validation with express-validator, HTML sanitization
- **File management**: Multer-based attachment pipeline (≤5 files/request, JPEG/PNG/GIF/PDF, ≤10 MB each) with persistent metadata and secure download endpoints
- **Data querying**: Filtering, search, pagination, and sorting backed by DB indexes for performant queries
- **Deadline management**: Automatic deadline status calculation on read/write with scheduled cron refresh (Node-cron) and notification hooks for approaching/overdue deadlines
- **Audit logging**: Comprehensive audit trails in `audit_log` and `request_proceedings` tables for every mutation
- **Automated notifications**: Scheduled job sends reminders 24h before SLA and escalates overdue requests to supervisors/admins
  - Executor assignment via `executorUserId` FK with role and status validation
  - Email notifications with request details and direct links (mock SMTP in test/dev mode)
  - Duplicate prevention via `deadline_notifications` tracking table
  - Configurable cron schedule and notification window
- **Reference data**: Nomenclature endpoints for request types/topics used by the frontend filters
- **Reporting & Analytics**: Aggregated overview reports, time-series dynamics, and Excel/PDF exports with filtering support (supervisor/admin role required)
- **Compression**: Response compression with gzip for bandwidth optimization
- **Logging**: Morgan-based HTTP request logging

### Configuration

Environment variables (see `.env.example` for defaults):

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./data/requests.sqlite

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Bcrypt
BCRYPT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
MAX_ATTACHMENTS=5
UPLOAD_DIR=./uploads

# Notification Settings
NOTIFICATION_HOURS_BEFORE_DEADLINE=24
NOTIFICATION_CRON_SCHEDULE=0 * * * *

# SMTP Configuration (for production)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=noreply@requests.local
```

### Non-Functional Requirements

- **Response Time**: ≤2 seconds for API responses under normal load
- **Concurrency**: Supports ≤100 concurrent users
- **Database**: SQLite with automatic connection pooling and prepared statements
- **Health Check**: `/health` endpoint returns `{"status":"ok"}` with 200 status code

### API Endpoints

**Health Check**
- `GET /health` - Returns server health status (200 OK)

**Authentication** (to be implemented)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new account
- `POST /api/auth/refresh` - Refresh access token

**Requests**
- `GET /api/requests` - List requests (with optional filters)
- `GET /api/requests/:id` - Get request details
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request
- `POST /api/requests/:id/assign` - Assign executor
- `PATCH /api/requests/:id/status` - Update status

**Reporting & Analytics** (requires supervisor or admin role)
- `GET /api/reports/overview` - Get aggregated analytics overview
- `GET /api/reports/dynamics` - Get time-series trend data
- `GET /api/reports/export` - Export reports in Excel or PDF format

**Nomenclature**
- `GET /api/nomenclature/*` - Reference data endpoints

**Files**
- File upload and download endpoints via `/api/files`

### Project Structure

```
src/
├── server.js           # Application entry point
├── app.js              # Express app configuration with middleware
├── config.js           # Environment configuration management
├── db.js               # Database initialization and connection
├── middleware/         # Express middleware (upload, validation)
├── models/             # Database models
├── routes/             # API route definitions
├── services/           # Business logic services
├── jobs/               # Scheduled tasks (deadline refresh)
├── utils/              # Utility functions
└── public/             # Static files serving
tests/
├── ...                 # Integration tests (Jest + Supertest)
scripts/
├── migrate.js          # Database migration script
└── seed.js             # Database seeding script
```

### Detailed Specification

See [`API_SPEC.md`](./API_SPEC.md) for comprehensive API documentation.

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

### Starting the Backend Server

```bash
# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev
```

The API will be available at `http://localhost:3000` with health check at `http://localhost:3000/health`

### Accessing the Frontend

1. Ensure backend is running at `http://localhost:3000` (see above)
2. Open `public/index.html` in a browser (or serve it via a web server)
3. Register or login with credentials
4. Start managing requests!

## Browser DevTools

The application logs key events to the console for debugging:
- API requests and responses
- Auth state changes
- Errors and failures
- Loading states

Use Chrome DevTools (F12) to inspect network requests, storage, and console output.

## Testing & Quality Assurance

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

Tests cover:
- Authentication and authorization
- Request CRUD operations
- File management (upload, download, delete)
- Report generation
- Nomenclature management
- Audit logging
- Notification system

### E2E Tests (Puppeteer)

```bash
# Run end-to-end tests
npm run test:e2e
```

E2E tests cover:
- Complete authentication flow (register, login, refresh)
- Request creation, editing, deletion
- File uploads and management
- Filter and search functionality
- Authorization and role enforcement

### Security Testing

```bash
# Run security audit and linting
npm run security
```

Includes:
- `npm audit --production` for vulnerability scanning
- ESLint security rules enforcement
- Security test suite (`tests/security.test.js`)

### Performance Testing

```bash
# Run performance smoke tests
npm run test:perf
```

Validates:
- Health check: < 500ms
- API endpoints: < 2s average response time
- Report generation: < 10s
- No memory leaks under load

### Test Coverage

- Unit tests: 170+ test cases
- E2E tests: 40+ browser-based scenarios
- Security tests: 40+ vulnerability scenarios
- Performance tests: 6 critical endpoints

## npm Scripts

```bash
npm start              # Start production server
npm run dev           # Start development server (with auto-reload via nodemon)
npm test              # Run unit and integration tests
npm run test:e2e      # Run E2E tests with Puppeteer
npm run security      # Run security audit and linting
npm run test:perf     # Run performance smoke tests
npm run lint          # Fix ESLint issues
npm run migrate       # Create/update database schema
npm run seed          # Seed initial nomenclature data
npm run perf          # Run load test with Autocannon
```
