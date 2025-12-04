# Reports Dashboard - Frontend Implementation

## Overview

The Reports Dashboard provides supervisors and administrators with interactive analytics and visualizations for request management data. Built with vanilla JavaScript and Chart.js, it offers real-time insights, filterable views, and export capabilities.

## Access Control

The Reports section is **only visible to users with supervisor or admin roles**. The navigation item is dynamically shown/hidden based on the authenticated user's role.

## Features

### 1. KPI Cards

Interactive cards displaying key performance indicators:
- **Total Requests**: Overall count of requests in the system
- **Status Breakdown**: Counts for New, In Progress, Completed, and Cancelled requests
- Each card shows:
  - Visual icon
  - Count value
  - Percentage of total (for status cards)
  - Color-coded borders

### 2. Interactive Charts

#### Status Distribution (Doughnut Chart)
- Visual breakdown of requests by status
- Color-coded segments:
  - New: Blue (#0ea5e9)
  - In Progress: Orange (#f59e0b)
  - Completed: Green (#10b981)
  - Cancelled: Red (#ef4444)
- Tooltips show count and percentage
- Responsive sizing for all screen sizes

#### Monthly Dynamics (Stacked Bar Chart)
- Time-series visualization of request trends
- Stacked bars show status breakdown per period
- Supports two grouping modes:
  - **Daily**: One bar per day
  - **Weekly**: One bar per week
- Interactive legend to toggle status visibility
- Responsive with proper scaling

### 3. Advanced Filters

Filter reports by multiple criteria:
- **Status**: Filter by request status
- **Type**: Filter by request type
- **Territory**: Text search by territory
- **Intake Form**: Filter by intake form type
- **Executor**: Text search by executor name
- **Date Range**: From/To date filters

Filters apply to all visualizations and can be combined for granular analysis.

### 4. Trends Table

Tabular view of time-series data showing:
- Period (date/week)
- Total requests
- Breakdown by status (New, In Progress, Completed, Cancelled)
- Easy-to-scan format for detailed analysis

### 5. Export Capabilities

Download comprehensive reports in two formats:

#### Excel Export
- Two worksheets:
  - **Overview**: Metadata, applied filters, and aggregated breakdowns
  - **Dynamics**: Time-series data with status breakdown
- Formatted and ready for further analysis
- Includes all filtered data

#### PDF Export
- Professional report layout
- Summary statistics and filters
- Breakdown tables (Status, Type, Territory, Executor)
- Time-series summary (first 20 periods)
- Suitable for printing and sharing

Both export formats respect applied filters and download with descriptive filenames.

## User Interface

### Layout

The Reports section follows a card-based layout:
1. **Header**: Title with export buttons
2. **Filters**: Collapsible filter panel
3. **KPI Cards**: Grid of metric cards
4. **Charts**: Side-by-side visualization panels
5. **Trends Table**: Detailed time-series data

### Responsive Design

#### Desktop (1200px+)
- 3-column KPI grid
- Side-by-side charts
- Full filter controls

#### Tablet (768px-1199px)
- 2-column KPI grid
- Stacked charts
- Compact filters

#### Mobile (<768px)
- Single-column layout
- Stacked KPI cards
- Touch-optimized controls
- Smaller chart heights
- Horizontal scroll for table

### Loading States

Visual feedback during data fetching:
- Animated spinner
- "Loading reports..." message
- Hidden content until data arrives

### Empty States

Graceful handling of no data scenarios:
- Clear messaging in charts
- "No data available" in tables
- Guidance to adjust filters

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────┐
│           Reports Section               │
│  (public/index.html)                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Application Logic                  │
│  (public/js/app.js)                     │
│  - loadReports()                        │
│  - applyReportFilters()                 │
│  - renderStatusChart()                  │
│  - renderDynamicsChart()                │
│  - handleExportReport()                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       API Integration                   │
│  (public/js/api.js)                     │
│  - reports.getOverview()                │
│  - reports.getDynamics()                │
│  - reports.exportReport()               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      UI Rendering                       │
│  (public/js/ui.js)                      │
│  - renderKpiCards()                     │
│  - renderTrendsTable()                  │
│  - showReportLoadingState()             │
└─────────────────────────────────────────┘
```

### Key Components

#### Chart Management
- Uses Chart.js 4.4.1 via CDN
- Proper instance cleanup (destroy before recreate)
- Responsive canvas sizing
- Color-consistent across visualizations

#### Data Flow
1. User selects filters and clicks "Apply Filters"
2. `applyReportFilters()` collects filter values
3. `loadReports()` fetches data from API in parallel
4. Charts and tables update with new data
5. User can adjust grouping or export results

#### Export Handling
```javascript
// Blob download with proper filename extraction
const blob = await response.blob();
const contentDisposition = response.headers.get('content-disposition');
// Parse filename and trigger download
```

### CSS Architecture

Modular styling with:
- **main.css**: Core report styles (cards, charts, tables)
- **responsive.css**: Breakpoint-specific adjustments
- CSS variables for consistent theming
- Transitions for smooth interactions

## Accessibility

### ARIA Support
- Canvas elements have `aria-label` attributes
- KPI cards use `role="article"`
- Loading indicators have appropriate labels
- Buttons have descriptive labels

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus states are clearly visible
- Tab order follows logical flow

### Screen Readers
- Semantic HTML structure
- Descriptive alt text and labels
- Status announcements for async operations

### Visual Accessibility
- Color contrast meets WCAG AA standards
- Charts use distinct colors
- Text labels complement color coding
- Icon + text for status indicators

## Performance Considerations

### Optimization Strategies
1. **Parallel Data Loading**: Overview and dynamics fetch simultaneously
2. **Chart Reuse**: Destroy and recreate to avoid memory leaks
3. **Debounced Filters**: Prevent excessive API calls
4. **Lazy Loading**: Charts render only when section is active
5. **Efficient DOM Updates**: Minimal repaints and reflows

### Network Efficiency
- Gzip compression (via backend)
- Minimal payloads (only requested data)
- JWT auth caching
- Blob streaming for exports

## Security

### Authentication
- JWT bearer token required for all endpoints
- Automatic token refresh on expiry
- Role-based access control (supervisor/admin only)

### Data Protection
- Input sanitization on backend
- Validated filter parameters
- Rate limiting on API endpoints
- Audit logging for all report actions

## Error Handling

### User-Facing Errors
- Network failures: "Failed to load reports" notification
- Export errors: "Failed to export report" with error message
- Empty data: Graceful empty state displays

### Developer Debugging
- Console logging for all errors
- Error context preservation
- Detailed error messages in development

## Browser Compatibility

### Supported Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

### Features Used
- ES6+ JavaScript (arrow functions, async/await, template literals)
- Fetch API
- Canvas API (via Chart.js)
- CSS Grid and Flexbox
- CSS Variables

### Polyfills
Not required for target browsers, but can be added if needed:
- Promise (for older browsers)
- Fetch (for IE11)

## Usage Examples

### Viewing Overall Statistics
1. Log in as supervisor or admin
2. Click "Reports" in navigation
3. View KPI cards and charts with default data
4. Explore status distribution and trends

### Filtering by Territory
1. Enter territory name in "Territory" filter
2. Click "Apply Filters"
3. Charts and table update to show filtered data
4. Export filtered results if needed

### Exporting Monthly Report
1. Set date range (e.g., 2025-01-01 to 2025-01-31)
2. Click "Apply Filters"
3. Click "Export PDF"
4. PDF downloads with filtered data

### Analyzing Weekly Trends
1. Select "Weekly" in dynamics grouping dropdown
2. Chart automatically refreshes with weekly data
3. Hover over bars to see detailed counts
4. Scroll trends table for full breakdown

## Troubleshooting

### Charts Not Displaying
- Check browser console for errors
- Verify Chart.js CDN is accessible
- Ensure user has supervisor/admin role
- Check network tab for API responses

### Export Not Working
- Verify JWT token is valid (check storage)
- Check backend server is running
- Review network tab for 403/401 errors
- Confirm supervisor/admin role

### Data Not Loading
- Check backend API is accessible
- Verify database has seeded data
- Review browser console for errors
- Check network tab for API responses

## Future Enhancements

Potential improvements for future versions:
- Real-time updates via WebSockets
- More chart types (line, radar, scatter)
- Custom date range presets
- Saved filter configurations
- Email scheduled reports
- Dashboard customization
- Comparison mode (period over period)
- Drill-down capabilities

## Support

For issues or questions:
1. Check browser console for errors
2. Review API documentation in `/docs/API_SPEC.md`
3. Verify role permissions
4. Check backend logs
5. Contact system administrator
