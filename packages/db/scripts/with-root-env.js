/**
 * Loads repo root .env, then runs Prisma CLI from packages/db.
 * Usage: node scripts/with-root-env.js migrate deploy
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const dbRoot = resolve(__dirname, '..');
const repoRoot = resolve(dbRoot, '../..');

/** @param {string} envPath */
function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Root .env (local dev), then VPS deploy/env/hostinger.env (Hostinger k3s)
loadEnvFile(resolve(repoRoot, '.env'));
loadEnvFile(resolve(repoRoot, 'deploy/env/hostinger.env'));

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/with-root-env.js <prisma-args...>');
  process.exit(1);
}

const result = spawnSync('npx', ['prisma', ...args], {
  cwd: dbRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
