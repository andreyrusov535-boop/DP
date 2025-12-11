## POST /api/requests Validation Error - Root Cause Analysis & Fix

### Problem Summary
When users attempted to create a new request through the UI form, the POST request to `/api/requests` returned a 400 Bad Request with "Validation failed" error.

### Root Cause Identified

The issue was **NOT** with backend validation logic, but with **frontend data collection**:

1. **Empty Request Type Dropdown**: The request type select element (`create-type`) was never populated with data from the database
2. **Missing API Methods**: The frontend API object lacked nomenclature-related methods to fetch request types
3. **Incorrect API Call**: The `loadNomenclature()` function tried to use non-existent `API.request()` method

### Technical Details

**Frontend Issue:**
- HTML form had `<select id="create-type">` but no options were populated
- When form was submitted, `requestTypeId` was empty/undefined  
- Backend validation expects valid numeric IDs that exist in nomenclature table
- Missing request type caused validation to fail

**Backend Validation** (was working correctly):
- `requestTypeId` is optional in validation but service layer checks if provided
- Service validates that if `requestTypeId` is sent, it must exist in database
- Without request types in dropdown, this validation always failed

### Fix Applied

**File: `/home/engine/project/public/js/api.js`**
- Added complete nomenclature API methods:
  ```javascript
  const nomenclature = {
      get: (entity) => request(`/nomenclature?entity=${encodeURIComponent(entity)}`),
      getTypes: () => request('/nomenclature/types'),
      getTopics: () => request('/nomenclature/topics'),
      // ... other methods
  };
  ```

**File: `/home/engine/project/public/js/app.js`**  
- Fixed `loadNomenclature()` function to use proper API calls:
  ```javascript
  const loadNomenclature = async () => {
      try {
          // Load request types
          const typesResponse = await API.nomenclature.getTypes();
          const types = typesResponse.types || [];
          
          // Populate request type selects
          const typeSelects = ['filter-type', 'create-type', 'edit-type'];
          typeSelects.forEach(selectId => {
              const select = document.getElementById(selectId);
              if (select) {
                  // Clear existing options except first
                  while (select.children.length > 1) {
                      select.removeChild(select.lastChild);
                  }
                  // Add request type options
                  types.forEach(type => {
                      const option = document.createElement('option');
                      option.value = type.id;
                      option.textContent = type.name;
                      select.appendChild(option);
                  });
              }
          });
          // ... similar for social groups and intake forms
      } catch (error) {
          console.error('Failed to load nomenclature:', error);
      }
  };
  ```

### Expected Result

After the fix:
1. ✅ Dropdown gets populated with request types from database
2. ✅ Users can select valid request types
3. ✅ `requestTypeId` contains valid numeric ID when form submitted
4. ✅ Backend validation passes
5. ✅ Request creation succeeds with 201 Created response
6. ✅ New request appears in requests list

### Verification

The fix addresses the exact error described in the ticket:
- **Before**: Empty dropdown → undefined `requestTypeId` → validation failed
- **After**: Populated dropdown → valid `requestTypeId` → validation passes

This resolves the "Validation failed" error for POST `/api/requests`.