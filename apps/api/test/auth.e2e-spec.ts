import { randomBytes } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { MailService, type Mail } from './../src/mail/mail.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { RedisService } from './../src/redis/redis.service.js';
import { StorageService } from './../src/storage/storage.service.js';

// Las contraseñas se generan en cada corrida: un literal en el repo lo marcan los escáneres de
// secretos (GitGuardian) aunque sea de prueba.
const randomPassword = (bytes = 18) => randomBytes(bytes).toString('base64url');
const credentials = { email: 'ana@akro.app', password: randomPassword() };
const newPassword = randomPassword();
const wrongPassword = randomPassword();
// 6 caracteres: menos de los 8 que pide el registro.
const shortPassword = randomBytes(3).toString('hex');

// Contra el Postgres de test (lo prepara setup-db.ts). Los mails no salen: quedan en `mails`
// y de ahí se sacan los tokens de los links.
describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const mails: Mail[] = [];

  beforeEach(async () => {
    mails.length = 0;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        send: (mail: Mail) => {
          mails.push(mail);
          return Promise.resolve();
        },
      })
      .overrideProvider(RedisService)
      .useValue({})
      .overrideProvider(StorageService)
      .useValue({})
      .compile();

    // Una app nueva por test: el límite de intentos arranca de cero.
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRaw`TRUNCATE users CASCADE`;
  });

  afterEach(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());
  // Guarda las cookies entre pedidos, como un navegador.
  const browser = () => request.agent(app.getHttpServer());

  function sessionCookie(res: Response): string {
    const cookie = res
      .get('Set-Cookie')
      ?.find((c) => c.startsWith('akro_session='));
    if (!cookie) throw new Error('La respuesta no trae la cookie de sesión');
    return cookie;
  }

  function tokenFrom(subject: string): string {
    const mail = mails.findLast((m) => m.subject === subject);
    const token = mail && /\?token=([\w-]+)/.exec(mail.text)?.[1];
    if (!token) throw new Error(`No hay un mail «${subject}» con token`);
    return token;
  }
  const verifyToken = () => tokenFrom('Confirmá tu mail en Akro');
  const resetToken = () => tokenFrom('Restablecé tu contraseña de Akro');

  it('registra, mantiene la sesión y la cierra', async () => {
    const agent = browser();
    const registered = await agent
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    expect(registered.body).toEqual({
      id: expect.any(String),
      email: 'ana@akro.app',
      emailVerified: false,
    });
    const cookie = sessionCookie(registered);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Secure');

    await agent.get('/api/auth/me').expect(200).expect(registered.body);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
    // El token viejo tampoco sirve: la sesión se borró en el servidor.
    await api().get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('pide sesión en las rutas privadas', () => {
    return api().get('/api/auth/me').expect(401).expect({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Tenés que iniciar sesión',
    });
  });

  it('normaliza el mail y no deja registrarlo dos veces', async () => {
    await api()
      .post('/api/auth/register')
      .send({ ...credentials, email: '  Ana@Akro.APP ' })
      .expect(201)
      .expect((res) => expect(res.body.email).toBe('ana@akro.app'));

    await api()
      .post('/api/auth/register')
      .send(credentials)
      .expect(409)
      .expect((res) =>
        expect(res.body.message).toBe('Ya hay una cuenta con ese mail'),
      );
  });

  it('valida el registro con un issue por campo', () => {
    return api()
      .post('/api/auth/register')
      .send({ email: 'no-es-un-mail', password: shortPassword })
      .expect(400)
      .expect((res) =>
        expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual([
          'email',
          'password',
        ]),
      );
  });

  it('entra con la contraseña correcta y responde igual a cualquier error', async () => {
    await api().post('/api/auth/register').send(credentials).expect(201);

    const wrongPasswordRes = await api()
      .post('/api/auth/login')
      .send({ ...credentials, password: wrongPassword })
      .expect(401);
    const unknownEmail = await api()
      .post('/api/auth/login')
      .send({ ...credentials, email: 'nadie@akro.app' })
      .expect(401);
    expect(wrongPasswordRes.body.message).toBe('Mail o contraseña incorrectos');
    expect(unknownEmail.body).toEqual(wrongPasswordRes.body);

    const agent = browser();
    await agent
      .post('/api/auth/login')
      .send({ ...credentials, email: 'ANA@akro.app' })
      .expect(200);
    await agent.get('/api/auth/me').expect(200);
  });

  it('al volver a entrar reemplaza la sesión de la cookie', async () => {
    const agent = browser();
    await agent.post('/api/auth/register').send(credentials).expect(201);
    await agent.post('/api/auth/login').send(credentials).expect(200);

    expect(await prisma.session.count()).toBe(1);
  });

  it('verifica el mail con el link, que sirve una sola vez', async () => {
    const agent = browser();
    await agent.post('/api/auth/register').send(credentials).expect(201);
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe('ana@akro.app');
    const token = verifyToken();
    expect(mails[0].text).toContain(
      `http://localhost:3000/verify-email?token=${token}`,
    );

    // Sin sesión: el link se puede abrir en otro dispositivo.
    await api().post('/api/auth/verify-email').send({ token }).expect(204);
    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect((res) => expect(res.body.emailVerified).toBe(true));
    await api()
      .post('/api/auth/verify-email')
      .send({ token })
      .expect(400)
      .expect((res) =>
        expect(res.body.message).toBe('El link venció o no es válido'),
      );
  });

  it('reenviar la verificación anula el link anterior', async () => {
    const agent = browser();
    await agent.post('/api/auth/register').send(credentials).expect(201);
    const first = verifyToken();
    await agent.post('/api/auth/verify-email/resend').expect(204);
    const second = verifyToken();
    expect(second).not.toBe(first);

    await api()
      .post('/api/auth/verify-email')
      .send({ token: first })
      .expect(400);
    await api()
      .post('/api/auth/verify-email')
      .send({ token: second })
      .expect(204);

    // Ya verificado, no manda otro mail.
    await agent.post('/api/auth/verify-email/resend').expect(204);
    expect(mails).toHaveLength(2);
  });

  it('no acepta un link vencido', async () => {
    await api().post('/api/auth/register').send(credentials).expect(201);
    await prisma.emailToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1) },
    });

    await api()
      .post('/api/auth/verify-email')
      .send({ token: verifyToken() })
      .expect(400);
  });

  it('no delata si un mail tiene cuenta al pedir el reset', async () => {
    await api()
      .post('/api/auth/password/forgot')
      .send({ email: 'nadie@akro.app' })
      .expect(204);

    expect(mails).toHaveLength(0);
  });

  it('restablece la contraseña y cierra todas las sesiones', async () => {
    const agent = browser();
    await agent.post('/api/auth/register').send(credentials).expect(201);
    await api()
      .post('/api/auth/password/forgot')
      .send({ email: credentials.email })
      .expect(204);
    const token = resetToken();
    expect(mails.at(-1)?.text).toContain(
      `http://localhost:3000/reset-password?token=${token}`,
    );

    // Cada link sirve solo para lo suyo.
    await api()
      .post('/api/auth/password/reset')
      .send({ token: verifyToken(), password: newPassword })
      .expect(400);

    await api()
      .post('/api/auth/password/reset')
      .send({ token, password: newPassword })
      .expect(204);

    await agent.get('/api/auth/me').expect(401);
    await api().post('/api/auth/login').send(credentials).expect(401);
    await api()
      .post('/api/auth/login')
      .send({ ...credentials, password: newPassword })
      .expect(200)
      // El link llegó a su casilla: el mail queda verificado.
      .expect((res) => expect(res.body.emailVerified).toBe(true));
    await api()
      .post('/api/auth/password/reset')
      .send({ token, password: newPassword })
      .expect(400);
  });

  it('rechaza los pedidos que cambian algo desde otro origen', async () => {
    await api()
      .post('/api/auth/register')
      .set('Origin', 'https://otro-sitio.example')
      .send(credentials)
      .expect(403)
      .expect((res) => expect(res.body.message).toBe('Origen no permitido'));

    await api()
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:3000')
      .send(credentials)
      .expect(201);
  });

  it('limita los intentos de login', async () => {
    for (let attempt = 0; attempt < 10; attempt++)
      await api().post('/api/auth/login').send(credentials).expect(401);

    await api()
      .post('/api/auth/login')
      .send(credentials)
      .expect(429)
      .expect((res) =>
        expect(res.body.message).toBe(
          'Demasiados intentos: probá de nuevo en un rato',
        ),
      );
  });
});
