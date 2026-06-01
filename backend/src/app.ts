import express from 'express';
import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';

import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { publicLimiter, authLimiter, joinRequestLimiter } from './middleware/rateLimit.middleware';

import authRoutes        from './routes/auth.routes';
import groupRoutes       from './routes/group.routes';
import expenseRoutes     from './routes/expense.routes';
import balanceRoutes     from './routes/balance.routes';
import settlementRoutes  from './routes/settlement.routes';
import summaryRoutes     from './routes/summary.routes';
import joinRequestRoutes from './routes/joinRequest.routes';

const isProd = env.NODE_ENV === 'production';
const app = express();

// ── Trust proxy (required for correct IP behind Render/Railway/Vercel) ────────
app.set('trust proxy', 1);
app.set('etag', false);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Relax CSP in dev so Swagger UI works; tighten in prod
  contentSecurityPolicy: isProd ? undefined : false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = new Set<string>([
  env.FRONTEND_URL,
  // Production Vercel deployment — always allowed
  'https://mysplitit.vercel.app',
  ...(env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
  // Always allow localhost variants in dev
  ...(!isProd ? [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
  ] : []),
]);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and listed origins
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    callback(new Error(`Origin '${origin}' not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());

// ── HTTP logging (skip in test) ───────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Health check (no rate limit — used by uptime monitors) ───────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() } });
});

// ── API docs (dev only — never expose in production) ─────────────────────────
if (!isProd) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const swaggerUi = require('swagger-ui-express');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { swaggerSpec } = require('./config/swagger');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Splitit API',
    customCss: '.swagger-ui .topbar { display: none }',
  }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}

// ── Global API rate limit ─────────────────────────────────────────────────────
app.use('/api', publicLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter,        authRoutes);
app.use('/api/groups',                            groupRoutes);
app.use('/api/expenses',                          expenseRoutes);
app.use('/api/balances',                          balanceRoutes);
app.use('/api/settlements',                       settlementRoutes);
app.use('/api/summary',                           summaryRoutes);
app.use('/api/join-requests', joinRequestLimiter, joinRequestRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
