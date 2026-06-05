#!/usr/bin/env node
/**
 * Bulk-load docs/rc_advance_mock_by_vrn.json into RcAdvanceVehicleData.
 *
 * Loads DATABASE_URL from repo .env (same as pnpm db:deploy).
 * Usage: pnpm seed:rc-advance-mock
 */
import './load-root-env.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrisma, disconnectPrisma } from '@vahanplus/db';
import { loadMockRcAdvanceMap, persistRcAdvanceRaw } from '@vahanplus/rc-advance-client';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Create /opt/vahanplus/.env or deploy/env/hostinger.env');
    process.exit(1);
  }

  const mockPath = process.env.RC_ADVANCE_MOCK_FILE
    ? path.resolve(process.env.RC_ADVANCE_MOCK_FILE)
    : path.join(repoRoot, 'docs/rc_advance_mock_by_vrn.json');

  await readFile(mockPath, 'utf8');
  const map = await loadMockRcAdvanceMap(mockPath);
  const prisma = getPrisma();

  let count = 0;
  for (const [vrn, response] of map.entries()) {
    await persistRcAdvanceRaw(prisma, vrn, response, 'mock');
    count += 1;
    if (count % 250 === 0) console.log(`Seeded ${count}...`);
  }

  console.log(`Seeded ${count} RC Advance mock rows`);
  await disconnectPrisma();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectPrisma();
  process.exit(1);
});
