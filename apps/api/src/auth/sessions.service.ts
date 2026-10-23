import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import type { Env } from '../config/env.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateToken, hashToken } from './tokens.js';

// El usuario que viaja en el request, sin el hash de la contraseña.
export type AuthUser = Omit<User, 'passwordHash'>;

export interface NewSession {
  token: string;
  expiresAt: Date;
}

export interface ValidSession {
  user: AuthUser;
  expiresAt: Date;
  // Se extendió el vencimiento: hay que volver a mandar la cookie.
  refreshed: boolean;
}

const SESSION_COOKIE = 'akro_session';
const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * DAY_MS;
// Con menos que esto por delante, la sesión se extiende otros 30 días: quien usa la app
// seguido no tiene que volver a entrar.
export const REFRESH_BELOW_MS = 15 * DAY_MS;

// Sesiones propias: el token vive solo en una cookie httpOnly y en Postgres se guarda su hash.
@Injectable()
export class SessionsService {
  private readonly secureCookie: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config
      .get('WEB_ORIGIN', { infer: true })
      .startsWith('https://');
  }

  async create(userId: string): Promise<NewSession> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: { id: hashToken(token), userId, expiresAt },
    });
    return { token, expiresAt };
  }

  async validate(token: string): Promise<ValidSession | null> {
    const id = hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { user: { omit: { passwordHash: true } } },
    });
    if (!session) return null;

    const now = Date.now();
    const remaining = session.expiresAt.getTime() - now;
    // Las vencidas se borran al encontrarlas. La limpieza del resto queda para los jobs.
    if (remaining <= 0) {
      await this.prisma.session.deleteMany({ where: { id } });
      return null;
    }
    if (remaining >= REFRESH_BELOW_MS) {
      return {
        user: session.user,
        expiresAt: session.expiresAt,
        refreshed: false,
      };
    }
    const expiresAt = new Date(now + SESSION_TTL_MS);
    // updateMany y no update: si un logout simultáneo ya la borró, no es un error.
    await this.prisma.session.updateMany({
      where: { id },
      data: { expiresAt },
    });
    return { user: session.user, expiresAt, refreshed: true };
  }

  async invalidate(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: hashToken(token) } });
  }

  async invalidateAll(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  tokenFrom(req: Request): string | undefined {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    return typeof token === 'string' && token !== '' ? token : undefined;
  }

  writeCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(SESSION_COOKIE, token, {
      ...this.cookieOptions(),
      expires: expiresAt,
    });
  }

  clearCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  // SameSite=Lax es la primera defensa contra CSRF; la segunda es el OriginGuard.
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secureCookie,
      path: '/',
    };
  }
}
