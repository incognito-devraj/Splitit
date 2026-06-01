import mongoose, { type ClientSession } from 'mongoose';
import { logger } from './logger';

function isTransactionUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /transaction numbers are only allowed|transaction is not supported|topology does not support sessions|replica set/i.test(message);
}

export async function withMongoTransaction<T>(
  label: string,
  work: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  if (mongoose.connection.readyState !== 1) {
    return work(undefined);
  }

  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result!;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      logger.warn(`${label}: Mongo transactions unavailable, falling back to single-write mode`);
      return work(undefined);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
