import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/database.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/setup-db.ts'],
    // Los archivos comparten la base de test: de a uno por vez.
    fileParallelism: false,
    // Postgres es real (TEST_DATABASE_URL); Redis, MinIO y el mail se reemplazan en cada test.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      REDIS_URL: 'redis://localhost:6379',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'test',
      S3_BUCKET: 'akro-test',
      WEB_ORIGIN: 'http://localhost:3000',
    },
  },
});
