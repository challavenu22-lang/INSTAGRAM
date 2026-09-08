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
    path.resolve('/var/task/backend/prisma', 'dev.db'),
    path.resolve('/var/task/prisma', 'dev.db'),
    path.resolve(process.cwd(), rawPath)
  ];

  let existingPath = candidatePaths.find(p => fs.existsSync(p) && fs.statSync(p).size > 0);

  const tmpDbPath = '/tmp/dev.db';
  if (existingPath && existingPath !== tmpDbPath) {
    try {
      const needCopy = !fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size === 0;
      if (needCopy) {
        fs.copyFileSync(existingPath, tmpDbPath);
      }
      try {
        fs.chmodSync(tmpDbPath, 0o666);
      } catch (chmodErr) {}
      existingPath = tmpDbPath;
    } catch (e) {
      console.error('Failed to copy database file to /tmp:', e.message);
    }
  } else if (fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 0) {
    try {
      fs.chmodSync(tmpDbPath, 0o666);
    } catch (chmodErr) {}
    existingPath = tmpDbPath;
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
