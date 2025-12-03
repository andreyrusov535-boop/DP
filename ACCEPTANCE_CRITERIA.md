# Acceptance Criteria - Frontend Dashboard MVP

## Testing Instructions

### Prerequisites
1. Backend API running at `http://localhost:3000/api`
2. HTTP server serving the frontend from `/home/engine/project/public/`
3. Chrome or Firefox browser

### Test Setup
```bash
# Terminal 1: Ensure backend is running on port 3000
# (Backend setup instructions should be provided separately)

# Terminal 2: Start HTTP server
cd /home/engine/project
python3 -m http.server 8000

# Browser: Navigate to
http://localhost:8000/public/index.html
```

## Acceptance Criteria Checklist

### ✅ 1. Authentication & JWT
- [ ] **Login Form**: 
  - User can enter email and password
  - Click "Login" button
  - Receives JWT tokens from backend
  - Tokens stored in sessionStorage
  - Redirected to dashboard on success
  - Error message shown on failure

- [ ] **Register Form**:
  - User can enter name, email, password, confirm password, and role
  - Password validation shows requirements (8+ chars, uppercase, lowercase, number)
  - Passwords must match
  - Can select role (Citizen, Operator, Supervisor)
  - Account created on backend
  - Auto-login after registration
  - Error message shown on validation failure

- [ ] **Token Management**:
  - JWT token persists across page refreshes (via sessionStorage)
  - Token automatically refreshes every 5 minutes
  - User stays logged in during active use
  - Logout clears all tokens and user data
  - Expired token triggers re-authentication

### ✅ 2. Dashboard Overview
- [ ] **Statistics Widget - Status Counts**:
  - Displays count of requests by status
  - Shows: New, In Progress, Completed, Cancelled
  - Updates every 30 seconds
  - Counts match backend data

- [ ] **Statistics Widget - Type Counts**:
  - Displays count of requests by type
  - Shows all available types (Repair, Maintenance, Installation, Inspection, Other)
  - Updates every 30 seconds

### ✅ 3. Request List & Filtering
- [ ] **Request List Display**:
  - Shows all requests in a clean list format
  - Each request displays:
    - Description (first 50 chars)
    - Type (formatted)
    - Location
    - Executor (if assigned)
    - Created date/time
    - Deadline (if set)
    - Status badge (colored by status)
    - Deadline status badge (Normal/Approaching/Overdue)

- [ ] **Filtering**:
  - Filter by Type dropdown
  - Filter by Status dropdown
  - Filter by Executor name (text input)
  - Filter by Date Range (from/to date inputs)
  - Text search across description/location
  - "Apply Filters" button executes all filters
  - "Reset" button clears all filters
  - Filters work in combination

- [ ] **Request List Updates**:
  - List updates immediately after filtering
  - Empty state shown when no results
  - Loading indicator shown during fetch

### ✅ 4. Request Creation
- [ ] **Create Request Form**:
  - Type field (required) - dropdown with all types
  - Description field (required) - textarea
  - Location field (required) - text input
  - Deadline field (optional) - datetime input
  - File attachment field (optional) - file input

- [ ] **File Upload Validation**:
  - Client-side validation before upload
  - Accepts: JPG, PNG, PDF files
  - Max size: 10MB
  - Shows error message for invalid files:
    - "File size must be less than 10 MB"
    - "File type must be one of: image/jpeg, image/png, application/pdf"
    - "File extension must be one of: jpg, jpeg, png, pdf"
  - Validation error shown inline near file input
  - Upload rejected if validation fails

- [ ] **Request Creation**:
  - Form validates all required fields
  - Shows loading state during submission
  - Success notification shown after creation
  - Form cleared after successful submission
  - List updates with new request
  - Error notification shown on failure

### ✅ 5. Request Management - Role-Based Actions

**For Operators**:
- [ ] **Edit Request**:
  - Can modify: Type, Description, Location, Deadline
  - Cannot modify: Status, Executor
  - "Edit" button on each request (except completed)
  - Modal dialog opens with pre-populated form
  - Save changes button
  - Success notification on update
  - List updates after save

- [ ] **Delete Request**:
  - "Delete" button on each request
  - Confirmation dialog shown
  - Request deleted if confirmed
  - List updates after delete
  - Success notification shown

**For Supervisors**:
- [ ] **View & Manage**:
  - "View" button on each request (read-only)
  - "Manage" button opens edit dialog
  - Can modify: Status, Executor
  - Cannot modify: Type, Description, Location
  - Assign executor to request
  - Update request status (New, In Progress, Completed, Cancelled)
  - Changes update in real-time

**For Citizens**:
- [ ] **View Only**:
  - "View" button to see request details
  - Cannot edit, delete, or manage requests
  - Can create new requests

### ✅ 6. Deadline Status Indicators

- [ ] **Color-Coded Badges**:
  - **Green (Normal)**: Deadline is more than 48 hours away
  - **Amber/Orange (Approaching)**: Deadline is within 48 hours
  - **Red (Overdue)**: Deadline has passed
  - Badge shows "Overdue", "Approaching", or "On Track"
  - Updates dynamically as deadline approaches

### ✅ 7. User Profile & Navigation

- [ ] **User Profile Indicator**:
  - Shows in header: User name
  - Shows in header: User role badge (colored by role)
  - Logout button in header
  - Logout clears session and returns to login

- [ ] **Navigation**:
  - Dashboard nav item
  - Requests nav item
  - Create Request nav item
  - Active nav item highlighted
  - Clicking nav item switches views
  - Section updates on navigation

### ✅ 8. User Experience & Notifications

- [ ] **Loading States**:
  - Spinner shown while fetching requests
  - Spinner shown while saving changes
  - Form elements disabled during submission (optional)
  - Indicates "Loading requests..." text

- [ ] **Success Notifications**:
  - Appear in top-right corner
  - Show success message (e.g., "Request created successfully!")
  - Green background color
  - Auto-dismiss after 5 seconds
  - Close button available

- [ ] **Error Notifications**:
  - Appear in top-right corner
  - Show error message with details
  - Red background color
  - Auto-dismiss after 5 seconds
  - Close button available

- [ ] **Form Validation Messages**:
  - Inline messages for form errors
  - Clear validation feedback
  - Password strength requirements shown
  - File validation errors displayed

### ✅ 9. Responsive Design

**Desktop (1200px+)**:
- [ ] Full layout with sidebar
- [ ] Multiple columns for widgets
- [ ] Full-featured request list
- [ ] All filters visible in grid layout

**Tablet (768px - 1199px)**:
- [ ] Sidebar becomes horizontal nav tabs
- [ ] Single column widgets
- [ ] Request list optimized for tablet
- [ ] Touch-friendly button sizes
- [ ] Filters wrap appropriately

**Mobile (480px and below)**:
- [ ] Single column layout
- [ ] Horizontal navigation tabs
- [ ] Stacked form elements
- [ ] Large touch targets (44px minimum)
- [ ] Request list cards stack vertically
- [ ] Modals full-width with padding
- [ ] Readable text sizes
- [ ] Optimized filter layout

### ✅ 10. Accessibility

- [ ] **ARIA Labels**:
  - All buttons have aria-label
  - All form inputs have associated labels
  - Alert roles on notifications
  - Form validation messages associated with inputs

- [ ] **Semantic HTML**:
  - Proper use of `<form>`, `<fieldset>`, `<legend>`
  - `<button>` elements for buttons (not divs)
  - Proper heading hierarchy (h1, h2, h3)
  - `<label>` elements for form inputs

- [ ] **Keyboard Navigation**:
  - Tab through all interactive elements
  - Enter/Space activates buttons
  - Escape closes modals
  - Focus visible on all elements

- [ ] **Screen Reader Friendly**:
  - Form validation errors announced
  - Notifications announced
  - Dynamic content changes announced

### ✅ 11. Browser Validation

**Chrome (Latest)**:
- [ ] Open DevTools (F12)
- [ ] Check Console for errors
- [ ] Check Network tab for API calls
- [ ] All features work as expected
- [ ] Layout responsive and correct
- [ ] No CSS errors or warnings

**Firefox (Latest)**:
- [ ] Open DevTools (F12)
- [ ] Check Console for errors
- [ ] Check Network tab for API calls
- [ ] All features work as expected
- [ ] Layout responsive and correct
- [ ] No CSS errors or warnings

### ✅ 12. Complete User Journey

**Test Scenario 1: New User Registration & Request Creation**
1. Open index.html
2. Click Register tab
3. Fill in registration form
4. Select role (Operator)
5. Click Register button
6. Should see dashboard
7. Click "Create Request" nav item
8. Fill in request form with:
   - Type: Repair
   - Description: Test request description
   - Location: Building A, Room 101
   - Deadline: 2 days from now
   - Attachment: Upload a JPG file
9. Click "Create Request" button
10. See success notification
11. Should be able to see new request in Requests view
12. Request should show with Normal deadline status

**Test Scenario 2: Supervisor Managing Requests**
1. Login with supervisor account
2. Go to Requests view
3. Filter requests (try different filters)
4. Click "Manage" on a request
5. Change status to "In Progress"
6. Assign executor
7. Click "Save Changes"
8. See success notification
9. List updates with new assignment
10. Go to Dashboard, verify stats updated

**Test Scenario 3: File Upload Validation**
1. Navigate to Create Request
2. Try uploading file > 10MB → Should show size error
3. Try uploading .exe file → Should show type error
4. Upload valid JPG file → Should accept
5. Submit request → File should be included

**Test Scenario 4: Filter & Search**
1. Go to Requests view
2. Apply Type filter → See only that type
3. Apply Status filter → See only that status
4. Apply Date range → See only requests in range
5. Use text search → See only matching requests
6. Click Reset → All filters cleared
7. All requests visible again

**Test Scenario 5: Responsive Testing**
1. Open DevTools
2. Toggle device toolbar
3. Test on:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
4. Verify layout adjusts correctly
5. Verify touch targets are adequate
6. Verify text is readable
7. Verify modals are usable on mobile

### ✅ 13. Performance

- [ ] **Initial Load**: < 3 seconds (with backend running)
- [ ] **Request List Load**: < 2 seconds
- [ ] **Filter Apply**: < 1 second
- [ ] **Stats Update**: Automatic every 30 seconds
- [ ] **No Layout Shift**: Stable DOM structure
- [ ] **Smooth Animations**: No janky transitions

### ✅ 14. Security

- [ ] **JWT Tokens**: Not exposed in console as plain text
- [ ] **CSRF Protection**: X-CSRF-Token header sent with requests
- [ ] **Input Sanitization**: HTML entities escaped in display
- [ ] **Session Storage**: Only sessionStorage used (not localStorage)
- [ ] **No Sensitive Data**: No passwords or tokens in HTML/CSS
- [ ] **HTTPS Ready**: Works with HTTPS (for production)

## Final Verification

After completing all checks above:

```javascript
// Open browser console (F12) and run:
console.log('Frontend version:', document.title);
console.log('Auth status:', Auth.isAuthenticated());
console.log('User info:', Auth.getUserInfo());
console.log('API base:', CONFIG.API_BASE_URL);
```

Should output:
- Title: "Request Management Dashboard"
- Auth status: true (if logged in)
- User info: Object with name, email, role
- API base: "http://localhost:3000/api"

## Sign-Off

**Frontend MVP is complete when:**
- ✅ All acceptance criteria items checked
- ✅ No console errors in Chrome and Firefox
- ✅ No broken network requests
- ✅ Responsive layout verified on all breakpoints
- ✅ User can complete full journey: Register → Create → Filter → Edit → Delete
- ✅ Role-based permissions working correctly
- ✅ Notifications and loading states working
- ✅ Deadline status indicators color-coded correctly
- ✅ Accessibility features tested with screen reader (if available)

## Known Limitations

1. File uploads are client-side validated; backend must also validate
2. Backend must return proper JWT format (access_token, refresh_token)
3. CSRF token is optional (taken from meta tag or cookie if available)
4. File attachments served from backend (frontend only uploads)
5. No offline mode support
6. No real-time WebSocket updates (stats refresh via polling)

## Success Criteria

**The MVP is successful when:**
1. Running backend at localhost:3000 and frontend from /public/index.html
2. User can register and login
3. User can create requests with files
4. User can filter and search requests
5. User can see deadline status badges
6. Request list updates in real-time
7. Role-based actions work correctly
8. Layout is responsive on desktop, tablet, mobile
9. All accessibility labels present
10. No console errors in Chrome and Firefox
