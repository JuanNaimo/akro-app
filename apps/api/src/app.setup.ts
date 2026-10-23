import { HttpAdapterHost } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';
import { createValidationPipe } from './common/validation.js';

// Lo comparten main.ts y los tests e2e, para que prueben la app tal como se sirve.
//
// Formato de los errores (el de Nest): { statusCode, message, error? }. Los de validación suman
// issues: [{ path, message }]. Los 500 responden un mensaje genérico y el detalle va al log.
export function configureApp(app: NestExpressApplication) {
  // La web y el API van bajo el mismo dominio: el proxy (o el rewrite de Next en
  // desarrollo) manda /api a Nest, así la cookie de sesión es de primera parte.
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.use(cookieParser());

  // Los pedidos llegan a través de un proxy: el rewrite de Next en desarrollo y Caddy en
  // producción. Se confía en el X-Forwarded-For que agregan los proxies de la red local, así
  // req.ip es la IP del cliente y el límite de intentos no es uno solo para todos.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  // Los mensajes de Zod llegan a la web en los errores de validación: en español.
  z.config(z.locales.es());
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(
    new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
  );
}
