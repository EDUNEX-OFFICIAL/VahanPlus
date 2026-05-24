import { loadKhananConfig, scheduleReportDateIso } from '@vahan360/khanan-config';

import { isoToPortalDate } from '@vahan360/scraper-bihar-epass';

import { getScrapeQueue } from '../queues/scrapeQueue.js';



const REPEATABLE_JOB_ID = 'bihar-epass-repeatable';



/**

 * @param {Record<string, unknown>} cfg

 */

function scheduledDistrictMetadata(cfg) {

  const mode = cfg.scheduleReportDateMode || 'yesterday';

  const tz = cfg.scheduleTimezone || 'Asia/Kolkata';

  const iso = scheduleReportDateIso(mode, tz);

  const metadata = { limit: cfg.districtRowLimit };

  if (iso) {

    metadata.date = isoToPortalDate(iso);

    metadata.reportDateIso = iso;

  }

  return metadata;

}



/**

 * Sync Bull repeatable district scrape job from DB config.

 * @param {import('@vahan360/db').PrismaClient} prisma

 */

export async function syncEpassSchedule(prisma) {

  const cfg = await loadKhananConfig(prisma);

  const queue = getScrapeQueue();



  const repeatables = await queue.getRepeatableJobs();

  for (const job of repeatables) {

    if (job.id === REPEATABLE_JOB_ID || job.name === 'bihar-epass-scheduled') {

      await queue.removeRepeatableByKey(job.key);

    }

  }



  if (!cfg.scheduleCron) {

    console.log('Bihar ePass schedule: off (no cron in Khanan config)');

    return { registered: false };

  }



  const metadata = scheduledDistrictMetadata(cfg);



  await queue.add(

    'bihar-epass-scheduled',

    {

      type: 'bihar_epass',

      target: cfg.districtReportUrl,

      metadata,

    },

    {

      repeat: {

        pattern: cfg.scheduleCron,

        tz: cfg.scheduleTimezone || 'Asia/Kolkata',

      },

      jobId: REPEATABLE_JOB_ID,

    },

  );



  console.log(

    `Bihar ePass schedule registered: ${cfg.scheduleCron} (${cfg.scheduleTimezone || 'Asia/Kolkata'})`,

  );

  return { registered: true, cron: cfg.scheduleCron, timezone: cfg.scheduleTimezone };

}



export async function registerEpassSchedule() {

  const { getPrisma } = await import('@vahan360/db');

  return syncEpassSchedule(getPrisma());

}


