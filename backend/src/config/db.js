import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDatabaseUrl() {
  let rawUrl = process.env.DATABASE_URL || '';

  // Support remote databases if configured (e.g. PostgreSQL, Supabase)
  if (rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://') || rawUrl.startsWith('mysql://')) {
    return rawUrl;
  }

  const isServerless = Boolean(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_EXECUTION_ENV);
  const tmpDbPath = '/tmp/dev.db';

  if (isServerless) {
    if (fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 0) {
      return `file://${tmpDbPath}`;
    }

    const candidatePaths = [
      path.resolve(__dirname, '../../prisma/template.db'),
      path.resolve(__dirname, '../../prisma/dev.db'),
      path.resolve(process.cwd(), 'backend', 'prisma', 'template.db'),
      path.resolve(process.cwd(), 'backend', 'prisma', 'dev.db'),
      path.resolve('/var/task/backend/prisma', 'template.db'),
      path.resolve('/var/task/backend/prisma', 'dev.db')
    ];

    let sourcePath = candidatePaths.find(p => fs.existsSync(p) && fs.statSync(p).size > 0);
    if (sourcePath) {
      try {
        fs.copyFileSync(sourcePath, tmpDbPath);
        try { fs.chmodSync(tmpDbPath, 0o777); } catch (e) {}
        return `file://${tmpDbPath}`;
      } catch (e) {
        console.error('Failed to initialize /tmp database:', e.message);
      }
    }
  }

  // Persistent local development database path
  const localDbPath = path.resolve(__dirname, '../../prisma/dev.db');
  return `file:${localDbPath}`;
}

const dbUrl = getDatabaseUrl();

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
