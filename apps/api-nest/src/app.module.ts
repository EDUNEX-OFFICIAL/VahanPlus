import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { ReadsModule } from './reads/reads.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, ReadsModule],
})
export class AppModule {}
