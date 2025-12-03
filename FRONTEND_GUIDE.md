# Frontend Development Guide

## Quick Start

1. **Serve the frontend**:
   ```bash
   # Using Python 3
   cd /home/engine/project
   python3 -m http.server 8000
   
   # Or using any HTTP server
   # Then open http://localhost:8000/public/index.html
   ```

2. **Backend requirements**:
   - Backend must be running at `http://localhost:3000/api`
   - CORS must be configured to allow requests from the frontend origin

3. **Open in browser**:
   - Visit `http://localhost:8000/public/index.html`
   - Register a new account or login
   - Start managing requests

## Module Architecture

### config.js
Centralized configuration:
- API base URL
- Storage keys for JWT tokens
- File upload configuration
- Role definitions
- Request statuses and types
- Deadline thresholds

### auth.js
JWT token management:
- Login/register functions
- Token refresh mechanism (5-minute intervals)
- In-memory + sessionStorage storage
- Automatic logout on token expiration

### api.js
Fetch helpers with:
- Automatic JWT header injection
- CSRF token support
- 401 error handling with token refresh
- Error standardization
- FormData support for file uploads

### utils.js
Helper functions:
- Date/time formatting
- File validation
- Email/password validation
- Form utilities (debounce, throttle, etc.)
- Text manipulation (escape, capitalize, etc.)

### ui.js
DOM manipulation:
- Notification system
- Modal dialogs
- Form rendering and population
- List rendering with role-based actions
- View switching and state display

### app.js
Main application logic:
- Initialization and event listeners
- Authentication flow
- Request CRUD operations
- Filter and search handling
- Statistics loading and display

## Common Tasks

### Adding a New Filter
1. Add filter UI to HTML (copy existing filter-group)
2. Add filter handler in `handleRequestListActions`
3. Include in `applyFilters()` function
4. Pass to `API.requests.list()`

### Adding a New Role
1. Add role to `CONFIG.ROLES` in config.js
2. Add CSS styles for `.badge-role-{newRole}`
3. Add conditional logic in UI rendering functions
4. Update permission checks in `app.js`

### Adding a New Request Status
1. Add to `CONFIG.REQUEST_STATUS` in config.js
2. Add CSS badge styles `.badge-status-{status}`
3. Update dropdown options in HTML
4. Test with the backend

### Customizing Styling
1. CSS variables are in `:root` (main.css)
2. Component styles in main.css
3. Responsive styles in responsive.css
4. For dark mode: update dark mode section in responsive.css

### Adding Notifications
```javascript
// Success
UI.showNotification('Success message', 'success');

// Error
UI.showNotification('Error message', 'error');

// Info (2 sec auto-dismiss)
UI.showNotification('Info', 'info', 2000);

// Manual dismiss (duration = 0)
UI.showNotification('Click to dismiss', 'warning', 0);
```

### Displaying Messages in Forms
```javascript
// In create/edit forms
UI.showMessage('create-message', 'Form submitted!', 'success');
UI.showMessage('create-message', 'Validation failed', 'error');
```

### Rendering Lists
```javascript
const userRole = Auth.getUserInfo()?.role;
UI.renderRequestList(requests, userRole);
```

### Switching Views
```javascript
// Switch between auth and dashboard
UI.switchView('dashboard-view');
UI.switchView('auth-view');

// Switch between dashboard sections
UI.switchSection('requests-section');
UI.switchSection('create-section');
UI.switchSection('overview-section');
```

## API Request Examples

### Custom API Request
```javascript
API.request('/custom-endpoint', {
    method: 'POST',
    body: { key: 'value' }
}).then(response => {
    console.log(response);
}).catch(error => {
    console.error(error);
});
```

### File Upload
```javascript
const file = document.getElementById('file-input').files[0];
const validation = Utils.validateFile(file);

if (validation.isValid) {
    API.requests.create(requestData, file);
}
```

### Token Management
```javascript
// Get current access token
const token = Auth.getAccessToken();

// Refresh token manually
await Auth.refreshAccessToken();

// Logout
Auth.logout();

// Check if authenticated
if (Auth.isAuthenticated()) {
    // User is logged in
}
```

## Debugging

### Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Look for API calls to `localhost:3000/api`
4. Check headers for `Authorization: Bearer ...`

### Check Storage
1. Open DevTools (F12)
2. Go to Application → Session Storage
3. Check for `access_token`, `refresh_token`, `user_info`

### Console Logging
The application logs errors to the console:
- API errors: `console.error('API Error...')`
- Auth issues: Check console for token refresh messages
- Form validation: Check for validation error messages

### Common Issues

**401 Unauthorized**
- Token expired: The app should auto-refresh
- Invalid token: Check if token is being sent correctly
- Backend issue: Verify backend returns proper JWT format

**CORS Error**
- Backend must allow requests from frontend origin
- Check backend CORS configuration
- Verify API_BASE_URL in config.js

**File Upload Fails**
- Check file size (max 10MB)
- Check file type (jpg, png, pdf)
- Verify backend accepts multipart/form-data

**Requests Not Loading**
- Check if backend is running
- Check API response format
- Open DevTools Network tab to see actual responses

## Performance Considerations

1. **Stats Auto-Refresh**: 30-second interval (configurable in app.js)
2. **Token Refresh**: 5-minute interval (configurable in config.js)
3. **Event Delegation**: Used for request list actions
4. **Debouncing**: Available via Utils.debounce()
5. **Image Optimization**: Frontend doesn't optimize images (backend responsibility)

## Security Considerations

1. **JWT Storage**: Uses sessionStorage (cleared on tab close)
2. **Password Validation**: Client-side strength check (not sufficient for backend)
3. **Input Sanitization**: Uses `escapeHtml()` for display
4. **CSRF Protection**: Includes CSRF token in headers if available
5. **File Validation**: Client-side only (backend must validate)

## Testing Checklist

- [ ] Login/register flow works
- [ ] Dashboard loads with statistics
- [ ] Can create request with all fields
- [ ] File upload validation works (reject oversized files)
- [ ] Filters work correctly
- [ ] Request list updates after create/edit/delete
- [ ] Role-based actions display correctly
- [ ] Deadline badges show correct status
- [ ] Responsive layout works on mobile/tablet
- [ ] Notifications appear and dismiss
- [ ] Modal dialogs open/close correctly
- [ ] Token refresh doesn't interrupt user actions
- [ ] Logout clears all data
- [ ] Page refresh maintains session (via sessionStorage)

## Deployment

For production deployment:

1. **Update API_BASE_URL** in config.js for production backend
2. **Enable HTTPS** for JWT token security
3. **Consider a build process** for minification (optional)
4. **Add CSRF token** meta tag if backend provides it
5. **Update file upload limits** if needed
6. **Test in production environment** before release

## Browser DevTools Tips

### Edit Token (for testing)
```javascript
// In Console:
sessionStorage.setItem('access_token', 'your_token_here');
```

### Force Token Refresh
```javascript
// In Console:
Auth.refreshAccessToken().then(result => console.log(result));
```

### Manually Load Data
```javascript
// In Console:
App.loadRequests();
App.loadStats();
```

### Simulate API Error
```javascript
// Modify API response handling for testing
API.request = async (endpoint) => {
    throw new Error('Simulated error');
};
```

## Contributing

- Follow existing code style
- Use module pattern for new modules
- Add comments for complex logic
- Test on multiple browsers
- Verify responsive layout
- Check accessibility (semantic HTML, ARIA labels)
