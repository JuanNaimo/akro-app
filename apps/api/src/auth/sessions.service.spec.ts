import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  REFRESH_BELOW_MS,
  SESSION_TTL_MS,
  SessionsService,
} from './sessions.service.js';
import { hashToken } from './tokens.js';

describe('SessionsService.validate', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const user = { id: 'u1', email: 'ana@akro.app', emailVerifiedAt: null };
  const prisma = {
    session: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  let sessions: SessionsService;

  function storedSession(expiresInMs: number) {
    return { user, expiresAt: new Date(now.getTime() + expiresInMs) };
  }

  beforeEach(async () => {
    vi.useFakeTimers({ now });
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
      ],
    }).compile();
    sessions = moduleRef.get(SessionsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('busca la sesión por el hash del token', async () => {
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(sessions.validate('token')).resolves.toBeNull();
    expect(prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: hashToken('token') } }),
    );
  });

  it('borra una sesión vencida', async () => {
    prisma.session.findUnique.mockResolvedValue(storedSession(-1));

    await expect(sessions.validate('token')).resolves.toBeNull();
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: hashToken('token') },
    });
  });

  it('deja como está una sesión con tiempo de sobra', async () => {
    const stored = storedSession(REFRESH_BELOW_MS);
    prisma.session.findUnique.mockResolvedValue(stored);

    await expect(sessions.validate('token')).resolves.toEqual({
      user,
      expiresAt: stored.expiresAt,
      refreshed: false,
    });
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  it('extiende una sesión que está por vencer', async () => {
    prisma.session.findUnique.mockResolvedValue(
      storedSession(REFRESH_BELOW_MS - 1),
    );
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    await expect(sessions.validate('token')).resolves.toEqual({
      user,
      expiresAt,
      refreshed: true,
    });
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { id: hashToken('token') },
      data: { expiresAt },
    });
  });
});
