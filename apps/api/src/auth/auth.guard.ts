import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './current-user.decorator.js';
import { IS_PUBLIC } from './public.decorator.js';
import { SessionsService } from './sessions.service.js';

// Guard global: toda ruta pide una sesión válida, salvo las @Public().
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const token = this.sessions.tokenFrom(req);
    const session = token ? await this.sessions.validate(token) : null;
    if (!token || !session) {
      // Una cookie que ya no sirve se borra, así la web no la sigue mandando.
      if (token) this.sessions.clearCookie(res);
      throw new UnauthorizedException('Tenés que iniciar sesión');
    }

    if (session.refreshed)
      this.sessions.writeCookie(res, token, session.expiresAt);
    (req as AuthenticatedRequest).user = session.user;
    return true;
  }
}
