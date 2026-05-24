import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v2');
  const port = Number(process.env.NEST_PORT) || 3002;
  await app.listen(port);
  console.log(`api-nest listening on :${port}`);
}

bootstrap();
