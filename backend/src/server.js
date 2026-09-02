process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/loggerMiddleware.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081', // Expo web
  'http://localhost:19006'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('exp://')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow during local dev for mobile testing
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use('/public', express.static('public'));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  let supabaseConnected = false;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const { error } = await client.from('users').select('id').limit(1);
      supabaseConnected = !error;
    } catch (e) {}
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Video Downloader API',
    database: {
      supabaseConnected: supabaseConnected ? 'CONNECTED' : 'DISCONNECTED',
      supabaseUrl: process.env.SUPABASE_URL || 'Not Set'
    }
  });
});

// API Routes
app.use('/api', apiRateLimiter, apiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Video Downloader Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

export default app;
