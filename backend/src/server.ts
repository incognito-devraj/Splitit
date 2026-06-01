import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import app from './app';

async function bootstrap() {
  await connectDatabase();

  const port = parseInt(env.PORT, 10);
  const server = app.listen(port, () => {
    logger.info(`🚀  Server  →  http://localhost:${port}  [${env.NODE_ENV}]`);
    if (env.NODE_ENV !== 'production') {
      logger.info(`📚  Docs    →  http://localhost:${port}/api/docs`);
    }
    logger.info(`❤️   Health  →  http://localhost:${port}/health`);
  });

  // Keep-alive timeout > load balancer idle timeout (Render/Railway default 60s)
  server.keepAliveTimeout = 65_000;
  server.headersTimeout   = 66_000;

  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received — graceful shutdown…`);

    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (e) {
        logger.error('Error during shutdown:', e);
        process.exit(1);
      }
    });

    // Force-kill after 10 s if connections don't drain
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('UnhandledRejection:', reason);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error('UncaughtException:', err);
    shutdown('uncaughtException');
  });
}

bootstrap();
