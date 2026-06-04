#!/usr/bin/env node
/**
 * Stream-import Khanan passes from JSON array or JSON Lines (no browser upload).
 *
 * Usage:
 *   node scripts/khanan-bulk-import.js --file /data/khanan.jsonl [--replace-existing] [--refresh-vehicle-status]
 */
import '../src/loadEnv.js';
import fs from 'node:fs';
import path from 'node:path';
import { getPrisma, disconnectPrisma } from '@vahanplus/db';
import {
  assembleChunks,
  batchDir,
  chunkPath,
  detectBulkFormat,
  ensureDir,
  removeBatchDir,
  runKhananBulkImport,
} from '@vahanplus/khanan-import';

const CHUNK_BYTES = 16 * 1024 * 1024;

function parseArgs(argv) {
  const out = { file: '', replaceExisting: false, refreshVehicleStatus: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) {
      out.file = argv[++i];
    } else if (a === '--replace-existing') {
      out.replaceExisting = true;
    } else if (a === '--refresh-vehicle-status') {
      out.refreshVehicleStatus = true;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.file) {
    console.error('Missing --file <path>');
    process.exit(1);
  }

  const abs = path.resolve(args.file);
  const stat = await fs.promises.stat(abs);
  const fileName = path.basename(abs);
  const format = detectBulkFormat(fileName);
  const prisma = getPrisma();

  const batch = await prisma.khananImportBatch.create({
    data: {
      fileName,
      storagePath: '',
      format,
      totalBytes: BigInt(stat.size),
      expectedChunks: Math.ceil(stat.size / CHUNK_BYTES) || 1,
      chunkSize: CHUNK_BYTES,
      options: {
        replaceExisting: args.replaceExisting,
        refreshVehicleStatus: args.refreshVehicleStatus,
      },
      status: 'pending',
    },
  });

  const batchId = batch.id;
  await ensureDir(batchDir(batchId));

  const handle = await fs.promises.open(abs, 'r');
  let index = 0;
  let offset = 0;

  try {
    while (offset < stat.size) {
      const buf = Buffer.alloc(Math.min(CHUNK_BYTES, stat.size - offset));
      const { bytesRead } = await handle.read(buf, 0, buf.length, offset);
      if (bytesRead <= 0) break;
      await fs.promises.writeFile(chunkPath(batchId, index), buf.subarray(0, bytesRead));
      offset += bytesRead;
      index += 1;
      process.stdout.write(`\rUploaded chunk ${index}`);
    }
  } finally {
    await handle.close();
  }

  console.log('\nAssembling…');
  const storagePath = await assembleChunks(batchId, fileName, index);
  await prisma.khananImportBatch.update({
    where: { id: batchId },
    data: { storagePath, status: 'active' },
  });

  console.log('Importing…');
  const updated = await prisma.khananImportBatch.findUnique({ where: { id: batchId } });
  const result = await runKhananBulkImport(prisma, updated);

  console.log(JSON.stringify(result, null, 2));
  await removeBatchDir(batchId);
  await disconnectPrisma();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectPrisma().catch(() => {});
  process.exit(1);
});
