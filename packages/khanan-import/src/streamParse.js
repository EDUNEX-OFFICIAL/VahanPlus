import fs from 'node:fs';
import readline from 'node:readline';
import Parser from 'stream-json/Parser.js';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import { normalizeKhananMongoRecord } from './mongoNormalize.js';

const PROGRESS_EVERY = 500;

/**
 * @param {string} filePath
 * @param {'json_array' | 'ndjson'} format
 * @param {(record: Record<string, string>) => Promise<void>} onRecord
 * @param {{ onProgress?: (rowsProcessed: number, rowsSkipped: number) => Promise<void> }} [hooks]
 */
export async function streamKhananRecords(filePath, format, onRecord, hooks = {}) {
  let rowsProcessed = 0;
  let rowsSkipped = 0;

  const tick = async () => {
    if (hooks.onProgress && rowsProcessed % PROGRESS_EVERY === 0 && rowsProcessed > 0) {
      await hooks.onProgress(rowsProcessed, rowsSkipped);
    }
  };

  if (format === 'ndjson') {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        rowsSkipped += 1;
        continue;
      }
      const m = normalizeKhananMongoRecord(obj);
      if (!m) {
        rowsSkipped += 1;
        continue;
      }
      await onRecord(m);
      rowsProcessed += 1;
      await tick();
    }
  } else {
    const arrayStream = fs
      .createReadStream(filePath)
      .pipe(Parser.parser())
      .pipe(StreamArray.streamArray());

    for await (const { value } of arrayStream) {
      const m = normalizeKhananMongoRecord(value);
      if (!m) {
        rowsSkipped += 1;
        continue;
      }
      await onRecord(m);
      rowsProcessed += 1;
      await tick();
    }
  }

  if (hooks.onProgress) {
    await hooks.onProgress(rowsProcessed, rowsSkipped);
  }

  return { rowsProcessed, rowsSkipped };
}
