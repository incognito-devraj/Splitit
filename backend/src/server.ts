import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import app from './app';

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(parseInt(env.PORT, 10), () => {
    logger.info(`🚀  Server  →  http://localhost:${env.PORT}  [${env.NODE_ENV}]`);
    logger.info(`📚  Docs    →  http://localhost:${env.PORT}/api/docs`);
    logger.info(`❤️   Health  →  http://localhost:${env.PORT}/health`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} — shutting down…`);
    server.close(async () => {
      const { disconnectDatabase } = await import('./config/database');
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('unhandledRejection', (r) => { logger.error('UnhandledRejection:', r); process.exit(1); });
  process.on('uncaughtException',  (e) => { logger.error('UncaughtException:',  e); process.exit(1); });
}

bootstrap();
