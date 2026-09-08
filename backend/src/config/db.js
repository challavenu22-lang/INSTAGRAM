import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDatabaseUrl() {
  let rawUrl = process.env.DATABASE_URL || 'file:./dev.db';

  // Support remote databases if configured (e.g. PostgreSQL, Supabase)
  if (rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://') || rawUrl.startsWith('mysql://')) {
    return rawUrl;
  }

  const candidatePaths = [
    path.resolve(__dirname, '../../prisma/template.db'),
    path.resolve(__dirname, '../../prisma/dev.db'),
    path.resolve(process.cwd(), 'backend', 'prisma', 'template.db'),
    path.resolve(process.cwd(), 'backend', 'prisma', 'dev.db'),
    path.resolve(process.cwd(), 'prisma', 'template.db'),
    path.resolve(process.cwd(), 'prisma', 'dev.db'),
    path.resolve('/var/task/backend/prisma', 'template.db'),
    path.resolve('/var/task/backend/prisma', 'dev.db'),
    path.resolve('/var/task/prisma', 'template.db'),
    path.resolve('/var/task/prisma', 'dev.db')
  ];

  let sourcePath = candidatePaths.find(p => fs.existsSync(p) && fs.statSync(p).size > 0);

  const tmpDbPath = '/tmp/dev.db';

  if (sourcePath) {
    try {
      fs.copyFileSync(sourcePath, tmpDbPath);
      try {
        fs.chmodSync(tmpDbPath, 0o777);
      } catch (chmodErr) {}
      return `file://${tmpDbPath}`;
    } catch (e) {
      console.error('Failed to copy database file to /tmp:', e.message);
    }
  }

  if (fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 0) {
    return `file://${tmpDbPath}`;
  }

  const finalPath = sourcePath || path.resolve(__dirname, '../../prisma/dev.db');
  return finalPath.startsWith('/') ? `file://${finalPath}` : `file:${finalPath}`;
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
