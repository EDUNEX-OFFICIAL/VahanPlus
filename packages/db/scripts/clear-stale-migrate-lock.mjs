/**
 * Release idle Prisma migrate advisory locks left by crashed migrate pods.
 * Safe to run before `prisma migrate deploy` in CI/K8s hooks.
 */
import { createPrismaClient } from '@vahanplus/db';

const prisma = createPrismaClient();

try {
  const stale = await prisma.$queryRaw`
    SELECT DISTINCT l.pid
    FROM pg_locks l
    JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.locktype = 'advisory'
      AND a.state = 'idle'
      AND a.query_start < NOW() - INTERVAL '30 seconds'
  `;

  for (const { pid } of stale) {
    await prisma.$executeRawUnsafe(`SELECT pg_terminate_backend(${pid})`);
    console.log(`[migrate-lock] terminated stale backend pid=${pid}`);
  }

  if (stale.length === 0) {
    console.log('[migrate-lock] no stale advisory lock holders');
  }
} finally {
  await prisma.$disconnect();
}
