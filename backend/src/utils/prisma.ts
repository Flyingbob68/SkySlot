/**
 * Singleton PrismaClient instance.
 *
 * Re-uses the same client across hot-reloads in development by attaching it
 * to `globalThis`.  In production a fresh client is created once per process.
 */

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env.js';

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });

  return new PrismaClient({
    adapter,
    log:
      config.nodeEnv === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}
