import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './sessions.service.js';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

// El usuario de la sesión, que deja el AuthGuard. Solo en rutas que no son @Public().
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
