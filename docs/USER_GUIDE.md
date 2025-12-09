# User Guide

This guide provides role-specific instructions for using the Request Management System. Select your role below to find relevant information.

## Table of Contents

1. [For All Users](#for-all-users)
2. [Citizen Guide](#citizen-guide)
3. [Operator Guide](#operator-guide)
4. [Executor Guide](#executor-guide)
5. [Supervisor Guide](#supervisor-guide)
6. [Administrator Guide](#administrator-guide)
7. [File Management](#file-management)
8. [Audit Log](#audit-log)

## For All Users

### Logging In

1. Navigate to the login page
2. Enter your email and password
3. Click "Sign In"
4. If you forgot your password, click "Forgot Password?" and follow the email link

### Dashboard Overview

After logging in, you'll see:
- **Dashboard**: Summary statistics and key metrics
- **Requests**: List of requests you have access to
- **Settings**: Your profile and preferences (role-dependent)

### Profile Settings

1. Click your name in the top right corner
2. Click "Settings" or "Profile"
3. Update your display name or preferences
4. Click "Save"

### Password Change

1. Click your name in the top right corner
2. Click "Settings"
3. Click "Change Password"
4. Enter your current password
5. Enter your new password (must be 8+ characters with uppercase, lowercase, and number)
6. Click "Save"

### Logging Out

Click your name in the top right corner and select "Logout" or "Sign Out".

## Citizen Guide

As a **Citizen**, you can create and view your own requests.

### Creating a New Request

1. Click "Create Request" in the main menu
2. Fill in the form:
   - **Your Name** (required): Your full name
   - **Email** (optional): Your email address for contact
   - **Phone** (optional): Your contact phone number
   - **Address** (optional): Address related to the request
   - **Territory** (optional): Administrative territory
   - **Contact Channel** (optional): How you prefer to be contacted
   - **Request Type** (optional): Category of your request
   - **Topic** (optional): Specific topic/subject
   - **Description** (required): Detailed description of your request
   - **Priority** (optional): Importance level (low, medium, high, urgent)
   - **Deadline** (optional): When you need a response

3. Optionally, attach files:
   - Click "Add Files" or drag and drop files
   - Supported formats: JPEG, PNG, GIF, PDF
   - Maximum file size: 10 MB per file
   - Maximum files: 5 files per request

4. Click "Submit Request"

Your request is now in the system and will be reviewed by operators.

### Viewing Your Requests

1. Click "My Requests" or "Requests" in the menu
2. Your submitted requests are listed with status and details
3. Click a request to view full details

### Request Status

Your request can be in these statuses:

| Status | Meaning |
|--------|---------|
| **New** | Just created, awaiting review |
| **In Progress** | Being processed |
| **Paused** | Temporarily stopped, waiting for information from you |
| **Completed** | Done, ready for pickup/delivery |
| **Archived** | Closed and removed from active tracking |
| **Cancelled** | Withdrawn or unable to process |
| **Removed** | Removed from deadline monitoring |

### Contacting About Your Request

If your request is paused or needs information:
1. Check the request details for notes from the operator
2. Reply with the requested information by adding notes
3. The operator will update the status when ready

### Downloading Attachments

1. View your request details
2. Scroll to "Attachments" section
3. Click on a file to download it

## Operator Guide

As an **Operator**, you can create, view, edit, and manage all requests.

### Creating a Request

Follow the same process as [Citizens](#creating-a-new-request), but you can fill in additional fields:
- Assign to an executor
- Set a due date
- Set priority and status

### Browsing and Filtering Requests

1. Click "Requests" in the menu
2. Use filters to narrow down:
   - **Status**: Filter by request status
   - **Type**: Filter by request type
   - **Priority**: Filter by priority level
   - **Executor**: Filter by assigned person
   - **Date Range**: Filter by deadline date
   - **Search**: Full-text search across all request details

3. Click a request to view full details

### Editing a Request

1. Open a request
2. Click "Edit" button
3. Update any fields:
   - Description
   - Priority
   - Deadline
   - Assignment
   - Status (except "Removed")
   - Additional fields
4. Optionally, add more files (up to 5 total)
5. Click "Save"

### Assigning Requests

1. Open a request
2. Click "Assign Executor"
3. Select an executor from the list
4. Click "Assign"

The executor receives a notification (if email configured) and can now see the request.

### Updating Request Status

1. Open a request
2. Click "Change Status"
3. Select new status:
   - **New**: Initial state
   - **In Progress**: Currently being worked on
   - **Paused**: Waiting for additional information
   - **Completed**: Work done, ready for delivery
   - **Archived**: Close and move to history
   - **Cancelled**: Cannot process request
   - **Removed**: Remove from deadline tracking

4. Add a note (optional) explaining the change
5. Click "Update"

### Adding Notes

1. Open a request
2. Scroll to "Proceedings" section
3. Click "Add Note"
4. Type your note
5. Click "Add"

Notes are logged with timestamp and operator name.

### Removing from Control

To stop tracking a request's deadline:

1. Open the request
2. Click "Remove from Control" button
3. Add optional explanation note
4. Click "Confirm"

The request status changes to "Removed" and is no longer subject to deadline tracking.

### Managing File Attachments

**Viewing Files**:
1. Open a request
2. Scroll to "Attachments" section
3. Click on a file to download

**Adding More Files**:
1. Open a request
2. Click "Edit"
3. Scroll to "Add Files"
4. Drag and drop or click to select files
5. Click "Save"

**Deleting Files**:
1. Open a request
2. Scroll to "Attachments"
3. Click the trash/delete icon next to a file
4. Confirm deletion

## Executor Guide

As an **Executor**, you can view assigned requests and update their status.

### Viewing Assigned Requests

1. Click "My Tasks" or "Assigned Requests"
2. You see only requests assigned to you
3. Click a request to view details

### Updating Request Status

1. Open an assigned request
2. Click "Update Status"
3. Select status:
   - **In Progress**: You're working on it
   - **Paused**: Waiting for info from citizen
   - **Completed**: You've completed the work
4. Add a note explaining the update
5. Click "Save"

### Adding Progress Notes

1. Open a request
2. Scroll to "Proceedings" section
3. Click "Add Note"
4. Describe your progress
5. Click "Add"

### Managing Attachments

**View Citizen-Provided Files**:
- Open request → Scroll to "Attachments" → Click file to download

**Adding Supporting Documents**:
1. Open request
2. Click "Edit"
3. Add files in "Attachments" section (up to 5 total)
4. Click "Save"

### Checking Deadline Status

The request shows deadline information:
- **No Control**: No deadline tracking
- **Normal**: On track
- **Approaching**: Due soon (within 48 hours)
- **Overdue**: Past deadline

Prioritize requests that are approaching or overdue.

## Supervisor Guide

As a **Supervisor**, you have advanced capabilities including reporting and management.

### Dashboard & Analytics

1. Click "Reports" or "Analytics" in the menu
2. View key metrics:
   - Requests by status
   - Monthly trends
   - Request types distribution
   - Executor workload
   - Deadline performance

### Filtering Reports

Apply filters to see specific data:
- **Status**: New, In Progress, Completed, etc.
- **Type**: Request types
- **Date Range**: Custom date range
- **Priority**: By priority level
- **Executor**: By assigned person
- **Territory**: By geographic area

### Exporting Data

1. Generate a report with desired filters
2. Click "Export" button
3. Choose format:
   - **Excel**: .xlsx file for spreadsheets
   - **PDF**: Formatted report document
4. Download file to your computer

### Managing Request Types & Topics

1. Click "Settings" → "Nomenclature Management"
2. Select entity type:
   - Request Types
   - Request Topics
   - Social Groups
   - Intake Forms

3. View, add, edit, or deactivate items
4. Changes apply immediately to new requests

### Viewing Audit Log

1. Click "Settings" → "Audit Log"
2. See all system actions:
   - Who made what change
   - When it happened
   - What was changed
3. Use filters:
   - Date range
   - User
   - Action type
4. Export audit log for compliance

### Advanced Request Management

**Bulk Status Update**:
1. Select multiple requests from list
2. Click "Bulk Actions"
3. Select new status
4. Apply to all selected

**Archive Old Requests**:
1. Filter for old completed requests
2. Select all with checkbox
3. Click "Archive Selected"
4. Confirm

**Performance Metrics**:
1. View "Reports"
2. Check "Average Response Time"
3. Monitor executor efficiency
4. Identify bottlenecks

## Administrator Guide

As an **Administrator**, you have full system control.

### User Management

**Creating Users**:
1. Click "Settings" → "User Management"
2. Click "Add User"
3. Enter:
   - Email (unique)
   - Name
   - Role
4. Click "Create"
5. Share temporary password with user

**Changing User Roles**:
1. Settings → User Management
2. Find user
3. Click menu → Edit
4. Change role
5. Click "Update"

**Deactivating Users**:
1. Settings → User Management
2. Find user
3. Click menu → Lock User
4. Confirm

**Resetting User Passwords**:
1. Settings → User Management
2. Find user
3. Click menu → Reset Password
4. Send link to user via email

### System Configuration

1. Click "Settings" → "System Configuration"
2. Configure:
   - **Server Port**: Application port
   - **JWT Secret**: Authentication secret
   - **File Limits**: Max file size, file count
   - **Rate Limits**: API request limits
3. Click "Save"

**Note**: Some changes require application restart.

### Backup & Recovery

1. Click "Settings" → "Backup & Recovery"
2. Click "Create Backup" to create immediate backup
3. View backup history
4. Click "Restore" to recover from backup
5. Confirm recovery action

### Viewing All Audit Log

1. Click "Settings" → "Audit Log"
2. See all system actions:
   - User creations/modifications
   - Request changes
   - File uploads/deletions
   - System configuration changes
3. Filter by:
   - Date range
   - User
   - Action type
   - Request

4. Export for compliance and reporting

### System Health

1. Click "Settings" → "System Health"
2. View:
   - **API Status**: Health check status
   - **Database Status**: Database connectivity
   - **Disk Usage**: Storage utilization
   - **Active Sessions**: Number of logged-in users
   - **Recent Errors**: Last system errors (if any)

3. Monitor performance metrics
4. Receive alerts for issues

### Database Maintenance

Through the admin panel:

1. Click "Settings" → "Maintenance"
2. Available actions:
   - **Optimize Database**: Clean and defragment
   - **Clear Old Data**: Archive old requests
   - **Rebuild Indexes**: Optimize query performance
   - **Check Integrity**: Verify database health

3. Run maintenance during off-hours

## File Management

### Supported File Types

The system supports these file formats:

| Format | Extension | Use Case |
|--------|-----------|----------|
| **JPEG** | .jpg, .jpeg | Photographs, scans |
| **PNG** | .png | Screenshots, images |
| **GIF** | .gif | Animated images, diagrams |
| **PDF** | .pdf | Documents, forms, reports |

### File Limits

- **Maximum file size**: 10 MB per file
- **Maximum files per request**: 5 files
- **Total request size**: 50 MB

### Uploading Files

**When Creating a Request**:
1. In "Create Request" form
2. Click "Add Files" or drag files into drop zone
3. Select up to 5 files (total 50 MB)
4. See file preview before submitting
5. Submit request with files

**When Editing a Request** (Operators only):
1. Open request
2. Click "Edit"
3. Scroll to "Attachments"
4. Click "Add More Files"
5. Select files (respecting 5-file limit)
6. Click "Save"

### Downloading Files

1. Open request with files
2. Scroll to "Attachments" section
3. Click file to download
4. File saves with original filename

### Deleting Files

**Citizens**: Cannot delete (files are preserved)

**Operators/Supervisors/Admins**:
1. Open request
2. Scroll to "Attachments"
3. Click trash icon next to file
4. Confirm deletion
5. File removed from disk and database

### Naming Files

Best practices for file naming:
- Use descriptive names: `Invoice_2024_01.pdf`
- Avoid special characters: `@#$%^&`
- Use underscores or hyphens: `Report_Final.pdf`
- Include dates: `Meeting_Notes_2024-01-15.pdf`

### Troubleshooting File Issues

**File too large**:
- Reduce file size or compress before uploading
- Maximum is 10 MB per file

**Unsupported format**:
- Convert to PDF, JPEG, PNG, or GIF
- PDF is recommended for documents

**Upload fails**:
- Check disk space on server
- Try with smaller file
- Clear browser cache and retry

**Cannot download**:
- File may have been deleted
- Try another file first
- Check browser download settings

## Audit Log

### What is Audit Log?

The audit log records all significant system actions:
- User login/logout (not implemented but logged)
- User creation and modification
- Request creation, update, deletion
- File uploads and deletions
- Status changes
- Configuration changes

### Accessing Audit Log

**Supervisors & Admins**:
1. Click "Settings" → "Audit Log"
2. View chronological list of actions
3. See who did what and when

### Filtering Audit Log

Use filters to find specific actions:

```
Date Range: 2024-01-01 to 2024-01-31
User: john@example.com
Action: request_created
Entity: request
```

### Audit Log Fields

| Field | Description |
|-------|-------------|
| **Timestamp** | When action occurred |
| **User** | Who performed the action |
| **Action** | What was done (created, updated, deleted) |
| **Entity** | What was affected (request, file, user, config) |
| **Details** | Specific information about the change |

### Common Audit Actions

| Action | Meaning |
|--------|---------|
| `request_created` | New request created |
| `request_updated` | Request details changed |
| `status_changed` | Request status updated |
| `user_created` | New user added to system |
| `user_updated` | User role or status changed |
| `file_uploaded` | Attachment added to request |
| `file_deleted` | Attachment removed |
| `config_changed` | System configuration updated |

### Exporting Audit Log

1. Apply desired filters
2. Click "Export" button
3. Choose format (Excel or PDF)
4. Download file for records/compliance

### Compliance & Retention

- Audit log is permanent and cannot be deleted
- Recommended retention: 2+ years
- Export regularly for archival
- Use for security investigations

## FAQ

### How do I reset my password?

Click "Forgot Password?" on the login page and follow the email instructions.

### Can I delete my submitted request?

No, requests are permanent for audit purposes. Ask an operator to archive or cancel it instead.

### Why can't I edit a request?

Only operators can edit requests. Citizens can only view their own.

### How long does my request stay in the system?

Requests are archived after completion but never deleted. Supervisors can archive them as needed.

### When will I get a response to my request?

This depends on the organization's processes. Check the request status and deadline in the system.

### Can I add files to my request later?

Citizens cannot add files after creation. Operators can add files when editing.

### Who can see my request?

Citizens: only themselves. Operators and above: all requests (based on role).

### Is my information secure?

Yes, all data is encrypted and access controlled by roles. Passwords are hashed.

For additional help, contact your system administrator.
