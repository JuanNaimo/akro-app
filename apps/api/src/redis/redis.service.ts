import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { describeError } from '../common/describe-error.js';
import type { Env } from '../config/env.js';

// Cliente de Redis para caché. Con lazyConnect se conecta con el primer comando, y si
// Redis se cae ioredis reintenta solo: el aviso se loguea una vez por caída, no por intento.
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private available = true;

  constructor(config: ConfigService<Env, true>) {
    super(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.on('error', (err: Error) => {
      if (this.available)
        this.logger.warn(`Redis no disponible: ${describeError(err)}`);
      this.available = false;
    });
    this.on('ready', () => {
      this.available = true;
    });
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
