# Video Downloader - Web & Mobile Full-Stack Application

A production-structured full-stack application for managing and downloading user-authorized videos, complete with a Node.js Express backend, Prisma ORM database schema, React Vite Web frontend, and Expo React Native mobile app.

---

## 🌟 Key Features

- 🔒 **Security-First Architecture**: Email verification, hashed session tokens, Argon2/Bcrypt password hashing, strict CORS, Helmet security headers, rate limiting, and server-side URL validation (SSRF protection).
- 📜 **Authorized Video Downloader**: Allows users to preview and download videos they own or have permission to access. Strictly prevents unauthorized scraping, DRM bypass, rate limit bypass, and watermark removal.
- 🎨 **Modern SaaS Interface**: Built with Tailwind CSS on Web and custom touch-optimized UI components on Mobile. Features top-right account dropdown navigation, responsive layout, dark subtle shadows, dynamic loading states, and accessible dialogs.
- 📊 **Download History**: Scoped to the authenticated user with server-side pagination (20 records per page), single item deletion, and clear-all confirmation dialogs.
- ⚙️ **Account & Security Settings**: Change password, manage download preferences, logout from current or all active sessions, and safely delete account with confirmation steps.
- 📱 **Cross-Platform**: React single-page web app and Expo React Native mobile app sharing a unified backend API.

---

## 📂 Repository Structure

```
video-downloader/
│
├── backend/                  # Node.js + Express REST API Server
│   ├── src/                  # Controllers, Middleware, Models, Routes, Services, Utils
│   ├── prisma/               # Prisma Schema & Database Migrations
│   ├── .env.example          # Backend Environment Template
│   └── package.json
│
├── web/                      # React + Vite + Tailwind CSS Web Frontend
│   ├── src/                  # Components, Pages, Layouts, Hooks, Services
│   ├── .env.example          # Web Environment Template
│   └── package.json
│
├── mobile/                   # Expo React Native Mobile Application
│   ├── app/                  # Expo Router Screens & Navigation
│   ├── components/           # Touch-Friendly Mobile Components
│   └── package.json
│
├── README.md                 # System Documentation & Guide
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**
- **PostgreSQL** or **SQLite** (Default configuration supports both via Prisma)

---

## 🛠️ Step-by-Step Installation & Setup

### 1. Backend Setup

```bash
cd video-downloader/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma Client & Run Database Migration
npx prisma generate
npx prisma migrate dev --name init

# Start Development Server (Runs on http://localhost:5000)
npm run dev
```

### 2. Web Frontend Setup

```bash
cd video-downloader/web

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start Web Development Server (Runs on http://localhost:5173)
npm run dev
```

### 3. Mobile Setup

```bash
cd video-downloader/mobile

# Install dependencies
npm install

# Start Expo Development Server
npx expo start
```

---

## 🔒 Security Best Practices

1. **Secrets Isolation**: Secrets (JWT, DB URL, SMTP credentials) are never exposed to client bundles.
2. **SSRF & URL Filtering**: Video download URLs are strictly validated server-side. Private subnets (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, etc.) and non-http(s) protocols are rejected.
3. **Streamed Processing**: File downloads are streamed directly through the backend server, enforcing max size limits (e.g. 500MB) without loading whole files into memory.
4. **Sanitized Output**: Filenames are sanitized before header attachment (`Content-Disposition`) to prevent header injection or directory traversal attacks.

---

## 📄 License

MIT License. Designed and built with production standards.
