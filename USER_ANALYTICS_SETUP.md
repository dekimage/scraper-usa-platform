# User Analytics System

## Overview

The user analytics system tracks individual user performance and daily activities. Each user has their own analytics subcollection with documents organized by date (YYYY-MM-DD format).

## Database Structure

```
users/
  {userId}/
    analytics/
      2025-05-27/
        - userId: string
        - date: string (YYYY-MM-DD)
        - created: timestamp
        - lastUpdated: timestamp
        - totalInteractions: number
        - statusChanges: number
        - notesUpdates: number
        - statusCounts: object
        - categoryCounts: object
        - cityCounts: object
        - interactions: array of interaction objects
```

## Tracked Interactions

### 1. Status Changes

- **Action Type**: `status_change`
- **Tracked Data**: Previous status → New status
- **Triggers**: When user changes pipeline status in UserBusinessTable

### 2. Notes Updates

- **Action Type**: `notes_update`
- **Tracked Data**: Notes content and length
- **Triggers**: When user saves notes in UserBusinessTable

## Analytics Dashboard Features

### Admin Access

- **URL**: `/user-analytics`
- **Authentication**: Requires admin login
- **Navigation**: Available in admin sidebar

### Dashboard Components

#### 1. User Selection

- Dropdown with all system users
- Shows user name and email

#### 2. Date Selection

- Calendar component with date picker
- Highlights dates with available data
- Defaults to today

#### 3. Statistics Cards

- **Total Interactions**: All business interactions
- **Status Changes**: Pipeline status updates
- **Notes Updates**: Notes added/updated
- **Categories Worked**: Number of different categories

#### 4. Detailed Tables

- **Status Changes**: Time, business, status transition
- **Notes Updates**: Time, business, notes content

#### 5. Breakdown Charts

- **Category Breakdown**: Interactions by business category
- **City Breakdown**: Interactions by city

## Implementation Details

### Automatic Tracking

- All user interactions are automatically tracked
- No manual intervention required
- Non-blocking (analytics failures don't affect main functionality)

### Data Organization

- Each user has their own analytics subcollection
- Documents are organized by date for easy querying
- Counters are incremented for performance
- Full interaction details are stored for detailed analysis

### Performance Optimizations

- Uses Firebase increment operations
- Minimal read operations
- Efficient date-based document structure
- Cached available dates for calendar highlighting

## Usage Workflow

1. **Admin Access**: Login as admin and navigate to User Analytics
2. **Select User**: Choose user from dropdown
3. **Select Date**: Pick date using calendar (today by default)
4. **View Analytics**: See comprehensive breakdown of user's daily activities
5. **Navigate Dates**: Use calendar to view historical data

## Benefits

- **Individual Performance Tracking**: See exactly what each user accomplished
- **Daily Activity Monitoring**: Track daily productivity and engagement
- **Historical Analysis**: Review past performance and trends
- **Category/City Insights**: Understand which areas users are working on
- **Time-based Analysis**: See when users are most active during the day

## Future Enhancements

- Weekly/monthly summary views
- Performance comparison between users
- Goal setting and tracking
- Export functionality for reports
- Real-time activity monitoring
