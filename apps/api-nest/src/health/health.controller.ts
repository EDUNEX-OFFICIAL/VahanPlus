import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'api-nest' };
  }

  @Get('ready')
  async ready() {
    return { ready: true };
  }
}
