import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('reads')
export class ReadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ingest-jobs')
  async ingestJobs() {
    const jobs = await this.prisma.scrapeJob.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        target: true,
        status: true,
        createdAt: true,
      },
    });
    return { items: jobs };
  }

  @Get('ops-snapshot')
  async opsSnapshot() {
    const [pending, completed, failed] = await Promise.all([
      this.prisma.scrapeJob.count({ where: { status: 'pending' } }),
      this.prisma.scrapeJob.count({ where: { status: 'completed' } }),
      this.prisma.scrapeJob.count({ where: { status: 'failed' } }),
    ]);
    return { pending, completed, failed };
  }

  @Get('districts')
  async districts() {
    const latest = await this.prisma.epassSnapshot.findFirst({
      orderBy: { scrapedAt: 'desc' },
    });
    if (!latest) {
      return { items: [], stub: true };
    }
    const rows = await this.prisma.epassDistrictRow.findMany({
      where: { snapshotId: latest.id },
      distinct: ['dmoName'],
      select: { dmoName: true },
      orderBy: { dmoName: 'asc' },
    });
    return {
      items: rows.map((r) => r.dmoName),
      snapshotId: latest.id,
      reportDate: latest.reportDate,
    };
  }

  @Get('epass-snapshots')
  async epassSnapshots() {
    const items = await this.prisma.epassSnapshot.findMany({
      take: 20,
      orderBy: { scrapedAt: 'desc' },
      include: { _count: { select: { rows: true } } },
    });
    return {
      items: items.map((s) => ({
        id: s.id,
        reportDate: s.reportDate,
        reportGeneratedOn: s.reportGeneratedOn,
        scrapedAt: s.scrapedAt,
        rowCount: s._count.rows,
      })),
    };
  }
}
