# Video Downloader - Backend API

The REST API backend for the Video Downloader application.

## Tech Stack
- **Node.js** & **Express**
- **Prisma ORM** (SQLite default, PostgreSQL supported)
- **Zod** Validation
- **Helmet**, **CORS**, **Express Rate Limit**
- **Bcryptjs** & **JWT** Authentication

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Generate Prisma Client & Migrate DB
npx prisma generate
npx prisma migrate dev --name init

# 4. Run Development Server
npm run dev
```

The API server will run on `http://localhost:5000`.

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/verify-email` - Verify email token
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Revoke current session
- `POST /api/auth/logout-all` - Revoke all user sessions
- `POST /api/auth/forgot-password` - Request reset link
- `POST /api/auth/reset-password` - Update password via token
- `GET /api/auth/me` - Get active authenticated user details

### Video
- `POST /api/video/search` - Validate & preview authorized video metadata
- `POST /api/video/download` - Stream authorized media file & log history

### History
- `GET /api/history?page=1&limit=20` - Paginated user download history
- `GET /api/history/:id` - Fetch single history item
- `DELETE /api/history/:id` - Delete single history record
- `DELETE /api/history` - Clear user download history

### Settings
- `GET /api/settings` - Retrieve account metadata & download preferences
- `PATCH /api/settings` - Save preferences
- `PATCH /api/settings/password` - Change password
- `DELETE /api/settings/account` - Delete user account permanently
