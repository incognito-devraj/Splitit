import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';

import authRoutes       from './routes/auth.routes';
import groupRoutes      from './routes/group.routes';
import expenseRoutes    from './routes/expense.routes';
import balanceRoutes    from './routes/balance.routes';
import settlementRoutes from './routes/settlement.routes';
import summaryRoutes    from './routes/summary.routes';

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());

// ─── Logging ──────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

// ─── Rate Limit ───────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() } });
});

// ─── Docs ─────────────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'PG Splito API',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/groups',      groupRoutes);
app.use('/api/expenses',    expenseRoutes);
app.use('/api/balances',    balanceRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/summary',     summaryRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
