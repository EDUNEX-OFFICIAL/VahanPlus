import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USER || 'admin';
  const expectedPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.log(JSON.stringify({ username, exists: false, passwordMatches: false }));
    return;
  }

  const passwordMatches = await bcrypt.compare(expectedPassword, user.passwordHash);
  console.log(
    JSON.stringify({
      username: user.username,
      exists: true,
      passwordMatches,
      userId: user.id,
      updatedAt: user.updatedAt.toISOString(),
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
