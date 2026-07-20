import { PrismaClient } from '../generated/prisma/client';
import { logger } from '../config/logger.js';


export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
} as ConstructorParameters<typeof PrismaClient>[0]);

logger.info('Prisma client initialized');