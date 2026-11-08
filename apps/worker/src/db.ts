import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

/**
 * Shared Prisma client generated from apps/api/prisma/schema.prisma.
 * Run from repo root: `pnpm db:generate` (or `pnpm --filter @dekanat/worker prisma:generate`).
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
