import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_CHUNK_BYTES = 16 * 1024 * 1024;

export function getImportRoot() {
  return process.env.KHANAN_IMPORT_DIR?.trim() || '/var/lib/vahanplus/imports';
}

export function getExportRoot() {
  return process.env.KHANAN_EXPORT_DIR?.trim() || '/var/lib/vahanplus/exports';
}

export function batchDir(batchId) {
  return path.join(getImportRoot(), batchId);
}

export function chunkPath(batchId, index) {
  return path.join(batchDir(batchId), `chunk-${String(index).padStart(6, '0')}`);
}

export function assembledFilePath(batchId, fileName) {
  const safe = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(batchDir(batchId), safe || 'upload.json');
}

export function exportFilePath(exportId, fileName) {
  return path.join(getExportRoot(), exportId, fileName);
}

export async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

/**
 * @param {string} batchId
 * @param {string} fileName
 * @param {number} expectedChunks
 */
export async function assembleChunks(batchId, fileName, expectedChunks) {
  const dir = batchDir(batchId);
  await ensureDir(dir);
  const outPath = assembledFilePath(batchId, fileName);
  const handle = await fs.promises.open(outPath, 'w');

  try {
    for (let i = 0; i < expectedChunks; i += 1) {
      const cp = chunkPath(batchId, i);
      const data = await fs.promises.readFile(cp);
      await handle.write(data);
    }
  } finally {
    await handle.close();
  }

  return outPath;
}

/**
 * @param {string} batchId
 */
export async function removeBatchDir(batchId) {
  await fs.promises.rm(batchDir(batchId), { recursive: true, force: true });
}
