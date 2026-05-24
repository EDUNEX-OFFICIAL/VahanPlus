import './loadEnv.js';
import { initOtel } from './otel.js';
initOtel();

import { config } from './config.js';
import { createApp } from './app.js';
import { disconnectPrisma } from '@vahanplus/db';
import { registerEpassSchedule } from './scheduler/epassSchedule.js';

const app = createApp();

const server = app.listen(config.port, async () => {
  console.log(`api-express listening on :${config.port}`);
  try {
    await registerEpassSchedule();
  } catch (err) {
    console.error('Failed to register ePass schedule:', err);
  }
});

async function shutdown() {
  server.close();
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
