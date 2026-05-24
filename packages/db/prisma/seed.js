import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedDefaults, CONFIG_ID } from '@vahanplus/khanan-config';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USER || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  const defaults = seedDefaults();
  await prisma.khananScraperConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: defaults,
  });

  console.log(`Seeded admin user: ${username}`);
  console.log('Seeded Khanan scraper config (default)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
