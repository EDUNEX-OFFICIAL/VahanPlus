import express from 'express';
import { CrmConfigPatchSchema } from '@vahanplus/contracts';
import { getPrisma } from '@vahanplus/db';
import { requireAuth } from '../middleware/auth.js';
import { CRM_CONFIG_ID, clearCrmConfigCache, loadCrmConfig } from '../services/crmConfig.js';

const router = express.Router();

router.use(requireAuth);

router.get('/config', async (_req, res) => {
  const prisma = getPrisma();
  const config = await loadCrmConfig(prisma);
  res.json({ config });
});

router.patch('/config', async (req, res) => {
  const parsed = CrmConfigPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid config', details: parsed.error.flatten() });
  }

  const prisma = getPrisma();
  const existing = await prisma.crmConfig.findUnique({ where: { id: CRM_CONFIG_ID } });
  if (!existing) {
    return res.status(404).json({ error: 'CRM config not seeded. Run db:seed or db:deploy.' });
  }

  const updated = await prisma.crmConfig.update({
    where: { id: CRM_CONFIG_ID },
    data: {
      ...parsed.data,
      configVersion: { increment: 1 },
    },
  });

  clearCrmConfigCache();
  const config = await loadCrmConfig(prisma);

  res.json({
    config,
    configVersion: updated.configVersion,
  });
});

export default router;
