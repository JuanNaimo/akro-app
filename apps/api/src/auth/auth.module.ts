import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { OriginGuard } from './origin.guard.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [
    // Límite de intentos por IP, en memoria: alcanza mientras haya un solo proceso de API.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage: 'Demasiados intentos: probá de nuevo en un rato',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    // Guards globales, en este orden: primero el origen del pedido y después la sesión.
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
