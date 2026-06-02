import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '../../..');

function parseEnvFile(content) {
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

for (const file of ['.env', '.env.local']) {
  const path = resolve(repoRoot, file);
  if (existsSync(path)) {
    parseEnvFile(readFileSync(path, 'utf8'));
  }
}

const devDefaults = {
  DATABASE_URL: 'postgresql://vahanplus:vahanplus@localhost:5434/vahanplus?schema=public',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'dev-secret-change-me',
  PORT: '3001',
};

for (const [key, value] of Object.entries(devDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
