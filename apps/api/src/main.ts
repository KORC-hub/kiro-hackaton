import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ErrorFilter } from './http';
import { getHost, getPort, getWebOrigin } from './config';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: getWebOrigin() });
  app.useGlobalFilters(new ErrorFilter());
  await app.listen(getPort(), getHost());
}

if (require.main === module) void bootstrap();
