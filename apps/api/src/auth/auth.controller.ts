import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
  type EmailInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type TokenInput,
} from './auth.schemas.js';
import {
  AuthService,
  toPublicUser,
  type PublicUser,
  type SignedIn,
} from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { SessionsService, type AuthUser } from './sessions.service.js';

// Los pedidos que mandan un mail tienen un límite más bajo que el resto.
const MAIL_THROTTLE = { default: { limit: 5, ttl: 60 * 60 * 1000 } };

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    return this.signIn(res, await this.auth.register(body));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body({ schema: loginSchema }) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const signedIn = await this.auth.login(body);
    // La sesión que traía la cookie se reemplaza por la nueva.
    const previous = this.sessions.tokenFrom(req);
    if (previous) await this.sessions.invalidate(previous);
    return this.signIn(res, signedIn);
  }

  // Pública e idempotente: sin sesión, igual limpia la cookie y responde 204.
  @Public()
  @SkipThrottle()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = this.sessions.tokenFrom(req);
    if (token) await this.sessions.invalidate(token);
    this.sessions.clearCookie(res);
  }

  @SkipThrottle()
  @Get('me')
  me(@CurrentUser() user: AuthUser): PublicUser {
    return toPublicUser(user);
  }

  // Pública: el link del mail se puede abrir en otro dispositivo, sin sesión.
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(
    @Body({ schema: tokenSchema }) { token }: TokenInput,
  ): Promise<void> {
    await this.auth.verifyEmail(token);
  }

  @Throttle(MAIL_THROTTLE)
  @Post('verify-email/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.resendVerification(user);
  }

  @Public()
  @Throttle(MAIL_THROTTLE)
  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body({ schema: emailSchema }) { email }: EmailInput,
  ): Promise<void> {
    await this.auth.forgotPassword(email);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordInput,
  ): Promise<void> {
    await this.auth.resetPassword(body);
  }

  private signIn(res: Response, { user, session }: SignedIn): PublicUser {
    this.sessions.writeCookie(res, session.token, session.expiresAt);
    return toPublicUser(user);
  }
}
