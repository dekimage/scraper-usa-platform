# Admin Authentication Setup

## Environment Variables Required

Create a `.env.local` file in your project root with the following variables:

```env
# Admin Authentication
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

## Features Implemented

### 1. Admin Authentication

- **Home page (/)**: Now requires admin login to access cities view
- **Admin page (/admin)**: Requires admin login to access user management
- **Session Management**: 24-hour admin sessions stored in localStorage

### 2. Navigation Updates

- **Scraper link**: Only visible when running on localhost
- **User Management**: Always visible in admin navigation

### 3. User Portal

- **User authentication**: Separate from admin authentication
- **Default preferences**: Automatically applied on login/refresh
- **Category optimization**: Only fetches user's default category first

## Usage

1. **Set up environment variables** in `.env.local`
2. **Admin access**: Visit `/` or `/admin` and login with admin credentials
3. **User access**: Visit `/user/[userId]` and login with user credentials
4. **Development**: Scraper features only available on localhost

## Security Notes

- Admin credentials are stored in environment variables (server-side only)
- User credentials are stored in Firebase (should be hashed in production)
- Sessions expire after 24 hours
- Admin and user authentication are completely separate systems
