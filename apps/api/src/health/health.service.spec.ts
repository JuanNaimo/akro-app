import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { StorageService } from '../storage/storage.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const prisma = { $queryRaw: vi.fn() };
  const redis = { ping: vi.fn() };
  const storage = { ensureBucket: vi.fn() };
  let health: HealthService;

  beforeEach(async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue('PONG');
    storage.ensureBucket.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    health = moduleRef.get(HealthService);
  });

  it('reporta ok cuando responden todos los servicios', async () => {
    await expect(health.check()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up', storage: 'up' },
    });
  });

  it('reporta degraded y marca el servicio caído', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(health.check()).resolves.toEqual({
      status: 'degraded',
      checks: { database: 'up', redis: 'down', storage: 'up' },
    });
  });

  it('da por caído un servicio que no responde a tiempo', async () => {
    vi.useFakeTimers();
    prisma.$queryRaw.mockReturnValue(new Promise(() => {}));

    const report = health.check();
    await vi.advanceTimersByTimeAsync(3_000);

    await expect(report).resolves.toMatchObject({
      status: 'degraded',
      checks: { database: 'down' },
    });
    vi.useRealTimers();
  });
});
