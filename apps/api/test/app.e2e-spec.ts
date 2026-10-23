import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import {
  HealthService,
  type HealthReport,
} from './../src/health/health.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { RedisService } from './../src/redis/redis.service.js';
import { StorageService } from './../src/storage/storage.service.js';

// Los servicios externos se reemplazan: este test cubre el ruteo y los códigos HTTP,
// no la conexión real con Postgres, Redis y MinIO.
describe('GET /api/health (e2e)', () => {
  let app: NestExpressApplication;
  let report: HealthReport;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RedisService)
      .useValue({})
      .overrideProvider(StorageService)
      .useValue({})
      .overrideProvider(HealthService)
      .useValue({ check: () => Promise.resolve(report) })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde 200 cuando todo está arriba', () => {
    report = {
      status: 'ok',
      checks: { database: 'up', redis: 'up', storage: 'up' },
    };
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(report);
  });

  it('responde 503 cuando algún servicio está caído', () => {
    report = {
      status: 'degraded',
      checks: { database: 'down', redis: 'up', storage: 'up' },
    };
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(503)
      .expect(report);
  });
});
