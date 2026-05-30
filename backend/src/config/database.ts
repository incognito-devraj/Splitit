import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    logger.info(`✅  MongoDB connected — db: "${mongoose.connection.name}"  host: ${mongoose.connection.host}`);

    mongoose.connection.on('error',        (e) => logger.error('MongoDB error:', e));
    mongoose.connection.on('disconnected', ()  => logger.warn('MongoDB disconnected'));
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
