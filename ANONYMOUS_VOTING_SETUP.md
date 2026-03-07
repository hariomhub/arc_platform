# Anonymous Voting Feature - Setup Guide

## Overview
This feature allows users to vote for nominees either by logging in or anonymously with email verification and Google reCAPTCHA protection. Each user (logged-in or anonymous) can vote once per category, with all votes counting equally.

## Features
- ✅ **Dual Voting Modes**: Login to vote OR vote anonymously with email
- ✅ **Google reCAPTCHA v3**: Prevents spam and bot abuse for anonymous votes
- ✅ **One Vote Per Category**: Tracked by user_id (logged-in) or email (anonymous)
- ✅ **Email Verification**: Anonymous voters must provide a valid email address
- ✅ **Modal UI**: Clean interface offering both voting options
- ✅ **Database Schema**: Updated votes table to support anonymous voting

## Database Setup

### 1. Run the Migration
Execute the SQL migration to update your database schema:

```bash
# From the project root
mysql -u root -p arc_platform < Backend/db/migrations.sql
```

Or manually run the SQL in your MySQL client. The migration adds:
- `is_anonymous` BOOLEAN column (default: FALSE)
- `anonymous_email` VARCHAR(255) column for anonymous voter emails
- Makes `user_id` nullable (was NOT NULL)
- Creates indexes for `anonymous_email` and `is_anonymous`

### 2. Verify Migration
```sql
-- Check the votes table structure
DESCRIBE votes;

-- You should see:
-- user_id (int, nullable)
-- is_anonymous (tinyint, default 0)
-- anonymous_email (varchar(255), nullable)
```

## Google reCAPTCHA Setup

### 1. Get reCAPTCHA Keys
1. Visit: https://www.google.com/recaptcha/admin
2. Register a new site (use reCAPTCHA v3)
3. Add your domains:
   - `localhost` (for development)
   - Your production domain
4. You'll receive:
   - **Site Key** (public, used in frontend)
   - **Secret Key** (private, used in backend)

### 2. Configure Backend
Edit `Backend/.env`:
```env
# Google reCAPTCHA v3 Secret Key
RECAPTCHA_SECRET_KEY=your_actual_secret_key_here
```

### 3. Configure Frontend
Edit `frontend/.env`:
```env
# Google reCAPTCHA v3 Site Key
VITE_RECAPTCHA_SITE_KEY=your_actual_site_key_here
```

⚠️ **Important**: Never commit your actual reCAPTCHA keys to version control!

## Installation

### Backend Dependencies
```bash
cd Backend
npm install
# Installs axios for reCAPTCHA verification
```

### Frontend Dependencies
```bash
cd frontend
npm install
# Installs react-google-recaptcha
```

## How It Works

### For Users
1. **Logged-In Users**:
   - Click "Cast Your Vote" button
   - Vote submitted immediately with their user_id

2. **Anonymous Users**:
   - Click "Cast Your Vote" button
   - Modal appears with two options:
     - **Login to Vote**: Redirects to login page
     - **Vote Anonymously**: Shows email input + reCAPTCHA
   - Enter email and complete reCAPTCHA
   - Vote submitted with email (no account needed)

### For Developers

#### Backend Flow
1. `POST /api/nominations/nominees/:id/vote`
   - Uses `optionalAuth` middleware (sets req.user if token exists)
   - Controller checks `isAnonymous` flag in request body
   - For anonymous: validates email, verifies reCAPTCHA token
   - For logged-in: uses req.user.id
   - Checks for existing vote in category (by user_id OR email)
   - Inserts vote with appropriate fields

#### Frontend Flow
1. User clicks vote button on nominee card
2. If not logged in: shows `VoteOptionsModal`
3. Modal offers login OR anonymous voting
4. Anonymous vote: 
   - Collects email
   - Executes reCAPTCHA
   - Sends vote with `isAnonymous: true`, `anonymousEmail`, `recaptchaToken`
5. Success: shows confirmation and closes modal

## File Changes

### Backend Files Created/Modified
- ✅ `Backend/db/migrations.sql` - Database schema updates
- ✅ `Backend/middleware/verifyRecaptcha.js` - reCAPTCHA verification utility
- ✅ `Backend/middleware/optionalAuth.js` - Optional authentication middleware
- ✅ `Backend/controllers/nominationsController.js` - Updated vote controller
- ✅ `Backend/routes/nominations.js` - Changed vote route to use optionalAuth
- ✅ `Backend/.env` - Added RECAPTCHA_SECRET_KEY

### Frontend Files Created/Modified
- ✅ `frontend/src/pages/AllNominees.jsx` - Added VoteOptionsModal component
- ✅ `frontend/src/api/nominations.js` - Updated castVote to accept vote data
- ✅ `frontend/.env` - Added VITE_RECAPTCHA_SITE_KEY

## Testing

### Test Anonymous Voting
1. Make sure you're logged out
2. Navigate to `/nominees` page
3. Click "Cast Your Vote" on any nominee
4. Modal should appear with login and anonymous options
5. Enter a valid email in "Vote Anonymously" section
6. Complete reCAPTCHA
7. Click "Submit Anonymous Vote"
8. Should see success toast and vote recorded

### Test Duplicate Vote Prevention
1. Try voting for the same category twice (same email or user)
2. Should get error: "You have already voted in this category"

### Test Different Categories
1. Vote in multiple categories with same email/user
2. Should succeed (one vote per category allowed)

## Security Features

### reCAPTCHA v3
- Scores votes from 0.0 (bot) to 1.0 (human)
- Rejects scores below 0.5
- Operates invisibly in background

### Backend Validation
- Email format validation (regex)
- reCAPTCHA token verification with Google API
- Database unique constraint on category + (user_id OR email)
- IP address logging for forensics

### Rate Limiting
Consider adding rate limiting middleware to prevent abuse:
```javascript
import rateLimit from 'express-rate-limit';

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each IP to 10 vote requests per window
});

router.post('/nominees/:id/vote', voteLimiter, optionalAuth, ctrl.castVote);
```

## Troubleshooting

### "reCAPTCHA not configured" Error
- Check that `RECAPTCHA_SECRET_KEY` is set in `Backend/.env`
- Restart backend server after adding env variable

### reCAPTCHA Not Showing
- Verify `VITE_RECAPTCHA_SITE_KEY` in `frontend/.env`
- Check browser console for errors
- Make sure key is correct (site key, not secret key)
- Restart frontend dev server

### "Database error" When Voting
- Ensure migrations have been run
- Check `votes` table schema matches expected structure
- Verify `user_id` is nullable

### Anonymous Vote Not Working
- Check browser Network tab for API errors
- Verify email format is valid
- Complete reCAPTCHA before submitting
- Check backend logs for detailed errors

## Production Considerations

1. **Environment Variables**: Use proper secret management (AWS Secrets Manager, etc.)
2. **HTTPS**: reCAPTCHA requires HTTPS in production
3. **Domain Whitelist**: Add production domain to reCAPTCHA admin console
4. **Rate Limiting**: Implement rate limiting on vote endpoint
5. **Email Verification**: Consider adding email confirmation for anonymous votes
6. **GDPR Compliance**: Add privacy notice about email storage
7. **Database Indexes**: Ensure indexes on `anonymous_email` and `category_id` exist

## API Documentation

### POST /api/nominations/nominees/:id/vote

**Authentication**: Optional (works with or without token)

**Request Body (Logged-in)**:
```json
{}  // Empty body, uses token from cookie
```

**Request Body (Anonymous)**:
```json
{
  "isAnonymous": true,
  "anonymousEmail": "voter@example.com",
  "recaptchaToken": "03AGdBq25..."
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Vote cast successfully!"
}
```

**Error Response** (409 - Already Voted):
```json
{
  "success": false,
  "message": "You have already voted in this category."
}
```

**Error Response** (400 - Validation):
```json
{
  "success": false,
  "message": "Please provide a valid email address."
}
```

## Support

For issues or questions:
1. Check this README for setup instructions
2. Review browser console and backend logs
3. Verify all environment variables are set
4. Ensure database migration completed successfully

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Feature**: Anonymous Voting with reCAPTCHA
