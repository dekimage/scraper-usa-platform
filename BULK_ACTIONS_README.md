# Bulk Actions and Web Closer Functionality

This document explains the new bulk actions feature that allows users to pass businesses to web closers.

## Overview

The system now supports:

1. **Bulk Selection**: Users can select multiple businesses in their table
2. **Pass to Web Closer**: Selected businesses can be passed to users with the "Web Closer" role
3. **Web Closer Dashboard**: Special users can view and manage received leads
4. **Lead Tracking**: Full tracking of who passed which businesses to whom

## Features

### For Regular Users

#### Bulk Selection

- Checkboxes appear in the business table for each row
- "Select All" checkbox in the table header
- Selected businesses are highlighted with a blue action bar

#### Pass to Web Closer

- When businesses are selected, a "Pass to Web Closer" button appears
- Clicking opens a modal with a dropdown of available web closers
- Businesses are marked as "Passed" and become read-only for the original user
- New filters allow viewing "Only Passed" or "Only Not Passed" businesses

### For Web Closers

#### Special Role

- Users can be created with the "Web Closer" role in the admin panel
- Web closers have a special badge and access to the Leads Dashboard

#### Leads Dashboard

- Accessible via `/web-closer/{userId}` or the "Leads Dashboard" button
- Shows overview of all received leads
- Dropdown to select which user's leads to view
- Full business management capabilities for received leads

## Database Structure

### User Document

```javascript
{
  id: "user-id",
  name: "User Name",
  email: "user@example.com",
  webCloser: true, // Only for web closers
  receivedLeads: {
    "user1": ["business-id-1", "business-id-2"],
    "user2": ["business-id-3", "business-id-4"]
  },
  // ... other fields
}
```

### Business Document

```javascript
{
  id: "business-id",
  name: "Business Name",
  // ... other business fields
  passedTo: "web-closer-id", // When passed to a web closer
  passedBy: "original-user-id", // Who passed it
  passedAt: "2025-01-XX", // When it was passed
}
```

## API Endpoints

### `/api/getWebClosers`

- **Method**: GET
- **Description**: Fetches all users with `webCloser: true`
- **Response**: `{ webClosers: [...] }`

### `/api/passToWebCloser`

- **Method**: POST
- **Body**: `{ fromUserId, toWebCloserId, businessIds }`
- **Description**: Passes businesses from one user to a web closer
- **Updates**: Business documents and web closer's receivedLeads map

### `/api/getReceivedLeads`

- **Method**: GET
- **Query**: `webCloserId`, optional `fromUserId`
- **Description**: Gets received leads for a web closer
- **Response**: Overview or specific user's businesses

## Usage Instructions

### Creating a Web Closer

1. Go to Admin Panel (`/admin`)
2. Click "Create User"
3. Fill in user details
4. Check "Web Closer Role" checkbox
5. Create the user

### Passing Businesses to Web Closer

1. Login as a regular user
2. Go to your business table
3. Select businesses using checkboxes
4. Click "Pass to Web Closer"
5. Select a web closer from the dropdown
6. Confirm the action

### Viewing Received Leads (Web Closer)

1. Login as a web closer
2. Click "Leads Dashboard" button or go to `/web-closer/{your-id}`
3. Select a user from the dropdown to view their passed businesses
4. Manage the businesses as needed

## Filtering Options

### New Filters for Regular Users

- **Show Only Passed**: View only businesses that have been passed to web closers
- **Show Only Not Passed**: View only businesses that haven't been passed

### Visual Indicators

- Passed businesses have a blue background tint
- "Passed" status is shown in the Status column
- Passed businesses are read-only (disabled editing)

## Security Notes

- Only users with `webCloser: true` can receive passed businesses
- API endpoints validate web closer status before processing
- Passed businesses maintain audit trail (who, when, to whom)
- Web closer dashboard requires authentication and role verification

## Future Enhancements

Potential improvements could include:

- Bulk actions for web closers (accept/reject leads)
- Lead assignment notifications
- Performance analytics for web closers
- Lead expiration and reassignment
- Advanced filtering and search for received leads
