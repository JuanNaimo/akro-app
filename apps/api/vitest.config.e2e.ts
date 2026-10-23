import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Valores de prueba para que pase la validación del entorno; los servicios se reemplazan en cada test.
    env: {
      DATABASE_URL: 'postgresql://akro:akro@localhost:5432/akro_test',
      REDIS_URL: 'redis://localhost:6379',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'test',
      S3_BUCKET: 'akro-test',
    },
  },
});
