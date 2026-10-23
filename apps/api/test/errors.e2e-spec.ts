import { Body, Controller, Param, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { z } from 'zod';
import { configureApp } from './../src/app.setup.js';
import { Prisma } from './../src/generated/prisma/client.js';

const probeSchema = z.object({
  username: z.string().trim().min(3),
  email: z.email(),
  tags: z.array(z.string()).optional(),
});

// Rutas de prueba: todavía no hay rutas de producción con body. Cubren la validación y el
// manejo de errores que arma configureApp.
@Controller('probe')
class ProbeController {
  @Post('validate')
  validate(@Body({ schema: probeSchema }) body: z.infer<typeof probeSchema>) {
    return body;
  }

  @Post('prisma/:code')
  prisma(@Param('code') code: string) {
    throw new Prisma.PrismaClientKnownRequestError(`Error de Prisma ${code}`, {
      code,
      clientVersion: Prisma.prismaVersion.client,
    });
  }

  @Post('crash')
  crash() {
    throw new Error('detalle interno');
  }
}

describe('Validación y errores (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();

    // Sin logger: los 500 de estos tests son esperados.
    app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('devuelve el body ya transformado por el schema', () => {
    return request(app.getHttpServer())
      .post('/api/probe/validate')
      .send({ username: '  ana  ', email: 'ana@akro.app' })
      .expect(201)
      .expect({ username: 'ana', email: 'ana@akro.app' });
  });

  it('responde 400 con un issue por campo, en español', () => {
    return request(app.getHttpServer())
      .post('/api/probe/validate')
      .send({ username: ' a ', email: 'no', tags: ['ok', 3] })
      .expect(400)
      .expect({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Datos inválidos',
        issues: [
          {
            path: 'username',
            message:
              'Demasiado pequeño: se esperaba que texto tuviera >=3 caracteres',
          },
          {
            path: 'email',
            message: 'Inválido dirección de correo electrónico',
          },
          {
            path: 'tags.1',
            message: 'Entrada inválida: se esperaba texto, recibido número',
          },
        ],
      });
  });

  it('responde 400 si el JSON está mal formado', () => {
    return request(app.getHttpServer())
      .post('/api/probe/validate')
      .set('Content-Type', 'application/json')
      .send('{"username":')
      .expect(400);
  });

  it('traduce un unique de Prisma (P2002) a 409', () => {
    return request(app.getHttpServer())
      .post('/api/probe/prisma/P2002')
      .expect(409)
      .expect({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya existe un registro con esos datos',
      });
  });

  it('traduce un registro inexistente de Prisma (P2025) a 404', () => {
    return request(app.getHttpServer())
      .post('/api/probe/prisma/P2025')
      .expect(404)
      .expect({
        statusCode: 404,
        error: 'Not Found',
        message: 'No se encontró el registro',
      });
  });

  it.each([
    ['otro error de Prisma', '/api/probe/prisma/P2003'],
    ['un error común', '/api/probe/crash'],
  ])('responde 500 sin detalles ante %s', async (_, path) => {
    await request(app.getHttpServer())
      .post(path)
      .expect(500)
      .expect({ statusCode: 500, message: 'Internal server error' });
  });
});
