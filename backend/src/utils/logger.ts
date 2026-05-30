import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack ? `${ts} [${level}]: ${message}\n${stack}` : `${ts} [${level}]: ${message}`,
  ),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.json());

const isDev = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'warn',
  format: isDev ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
});
