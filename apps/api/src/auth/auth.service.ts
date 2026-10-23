import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { EmailTokenKind } from '../generated/prisma/client.js';
import { resetPasswordMail, verifyEmailMail } from '../mail/mail-templates.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.schemas.js';
import { hashPassword, verifyDecoy, verifyPassword } from './password.js';
import {
  SessionsService,
  type AuthUser,
  type NewSession,
} from './sessions.service.js';
import { generateToken, hashToken } from './tokens.js';

const HOUR_MS = 60 * 60 * 1000;
const VERIFY_EMAIL_HOURS = 48;
const RESET_PASSWORD_HOURS = 1;

// Lo que la web ve de un usuario. emailVerified sirve para el aviso de «confirmá tu mail»:
// sin verificar se puede usar la app igual.
export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

export interface SignedIn {
  user: AuthUser;
  session: NewSession;
}

@Injectable()
export class AuthService {
  private readonly webOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  async register({ email, password }: RegisterInput): Promise<SignedIn> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    // Si dos registros con el mismo mail llegan a la vez, el unique de la base da 409 igual.
    if (existing) throw new ConflictException('Ya hay una cuenta con ese mail');

    const user = await this.prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
      omit: { passwordHash: true },
    });
    await this.sendVerification(user);
    return { user, session: await this.sessions.create(user.id) };
  }

  async login({ email, password }: LoginInput): Promise<SignedIn> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = user
      ? await verifyPassword(user.passwordHash, password)
      : await verifyDecoy(password);
    // El mismo mensaje en los dos casos: no delata qué mails tienen cuenta.
    if (!user || !valid)
      throw new UnauthorizedException('Mail o contraseña incorrectos');
    return { user, session: await this.sessions.create(user.id) };
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.consumeEmailToken(token, 'VERIFY_EMAIL');
    // Si ya estaba verificado, se conserva la fecha original.
    await this.prisma.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async resendVerification(user: AuthUser): Promise<void> {
    if (user.emailVerifiedAt) return;
    await this.sendVerification(user);
  }

  // No avisa si el mail tiene cuenta: la respuesta es la misma en los dos casos.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) return;
    const token = await this.createEmailToken(
      user.id,
      'RESET_PASSWORD',
      RESET_PASSWORD_HOURS,
    );
    void this.mail.send({
      to: user.email,
      ...resetPasswordMail(
        this.link('/reset-password', token),
        RESET_PASSWORD_HOURS,
      ),
    });
  }

  // Cambia la contraseña y cierra todas las sesiones: si alguien más tenía la cuenta, la
  // pierde. El mail queda verificado, porque el link demostró que la persona tiene acceso.
  async resetPassword({ token, password }: ResetPasswordInput): Promise<void> {
    const userId = await this.consumeEmailToken(token, 'RESET_PASSWORD');
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.emailToken.deleteMany({
        where: { userId, kind: 'RESET_PASSWORD' },
      }),
    ]);
  }

  private async sendVerification(user: { id: string; email: string }) {
    const token = await this.createEmailToken(
      user.id,
      'VERIFY_EMAIL',
      VERIFY_EMAIL_HOURS,
    );
    void this.mail.send({
      to: user.email,
      ...verifyEmailMail(this.link('/verify-email', token), VERIFY_EMAIL_HOURS),
    });
  }

  // Un token nuevo reemplaza a los anteriores del mismo tipo: solo sirve el último link.
  private async createEmailToken(
    userId: string,
    kind: EmailTokenKind,
    hours: number,
  ): Promise<string> {
    const token = generateToken();
    await this.prisma.$transaction([
      this.prisma.emailToken.deleteMany({ where: { userId, kind } }),
      this.prisma.emailToken.create({
        data: {
          id: hashToken(token),
          userId,
          kind,
          expiresAt: new Date(Date.now() + hours * HOUR_MS),
        },
      }),
    ]);
    return token;
  }

  // Devuelve el usuario del token y lo borra. El borrado es lo que lo hace de un solo uso: si
  // llegan dos pedidos con el mismo token, solo uno lo consigue.
  private async consumeEmailToken(
    token: string,
    kind: EmailTokenKind,
  ): Promise<string> {
    const id = hashToken(token);
    const found = await this.prisma.emailToken.findUnique({ where: { id } });
    if (!found || found.kind !== kind) throw invalidLink();
    const { count } = await this.prisma.emailToken.deleteMany({
      where: { id },
    });
    if (count === 0 || found.expiresAt.getTime() <= Date.now())
      throw invalidLink();
    return found.userId;
  }

  private link(path: string, token: string): string {
    return `${this.webOrigin}${path}?token=${token}`;
  }
}

function invalidLink() {
  return new BadRequestException('El link venció o no es válido');
}
