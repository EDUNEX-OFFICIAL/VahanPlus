import { Module } from '@nestjs/common';
import { ReadsController } from './reads.controller';

@Module({
  controllers: [ReadsController],
})
export class ReadsModule {}
