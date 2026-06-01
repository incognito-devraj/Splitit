import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

const isProd = env.NODE_ENV === 'production';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.MONGODB_URI, {
      // Production: larger pool, tighter timeouts
      maxPoolSize:              isProd ? 20 : 10,
      minPoolSize:              isProd ? 2  : 1,
      serverSelectionTimeoutMS: isProd ? 5_000  : 10_000,
      socketTimeoutMS:          isProd ? 30_000 : 45_000,
      connectTimeoutMS:         isProd ? 5_000  : 10_000,
      // Heartbeat keeps Atlas free-tier alive
      heartbeatFrequencyMS:     10_000,
    });

    logger.info(
      `✅  MongoDB connected — db: "${mongoose.connection.name}"  host: ${mongoose.connection.host}`,
    );

    mongoose.connection.on('error',        (e) => logger.error('MongoDB error:', e));
    mongoose.connection.on('disconnected', ()  => logger.warn('MongoDB disconnected — will auto-reconnect'));
    mongoose.connection.on('reconnected',  ()  => logger.info('MongoDB reconnected'));

  } catch (err) {
    logger.error('❌  MongoDB connection failed:', (err as Error).message);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected cleanly');
}
