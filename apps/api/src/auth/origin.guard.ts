import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Contra CSRF, junto con la cookie SameSite=Lax: un pedido que cambia algo y viene de otro
// origen se rechaza. Si no hay header Origin se deja pasar: los navegadores siempre lo mandan
// en un pedido cross-site que no es GET, así que no lo disparó una página ajena.
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly webOrigin: string;

  constructor(config: ConfigService<Env, true>) {
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin === undefined || origin === this.webOrigin) return true;
    throw new ForbiddenException('Origen no permitido');
  }
}
