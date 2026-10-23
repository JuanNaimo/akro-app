import type { INestApplication } from '@nestjs/common';

// Lo comparten main.ts y los tests e2e, para que prueben la app tal como se sirve.
export function configureApp(app: INestApplication) {
  // La web y el API van bajo el mismo dominio: el proxy (o el rewrite de Next en
  // desarrollo) manda /api a Nest, así la cookie de sesión es de primera parte.
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
