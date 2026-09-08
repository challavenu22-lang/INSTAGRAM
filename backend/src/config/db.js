import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

function getDatabaseUrl() {
  let url = process.env.DATABASE_URL || 'file:./dev.db';
  if (!url.startsWith('file:')) return url;

  const rawPath = url.replace('file:', '');
  const candidatePaths = [
    path.resolve(process.cwd(), 'backend', 'prisma', 'dev.db'),
    path.resolve(process.cwd(), 'prisma', 'dev.db'),
    path.resolve(process.cwd(), rawPath),
    path.resolve('/tmp', 'dev.db')
  ];

  let existingPath = candidatePaths.find(p => fs.existsSync(p));

  // In Vercel serverless environment, copy DB to /tmp/dev.db for read/write access
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const tmpDbPath = '/tmp/dev.db';
    if (existingPath && existingPath !== tmpDbPath && !fs.existsSync(tmpDbPath)) {
      try {
        fs.copyFileSync(existingPath, tmpDbPath);
        existingPath = tmpDbPath;
      } catch (e) {
        console.error('Failed to copy database file to /tmp:', e.message);
      }
    } else if (fs.existsSync(tmpDbPath)) {
      existingPath = tmpDbPath;
    }
  }

  if (existingPath) {
    return `file:${existingPath}`;
  }

  return url;
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
