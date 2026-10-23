import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client.js';

// Traduce los errores de Prisma que son culpa del pedido y no del servidor. Por ejemplo, dos
// registros simultáneos con el mismo mail terminan en 409 y no en 500. El resto sigue como
// error desconocido: 500 genérico y al log.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      // Restricción unique.
      case 'P2002':
        return super.catch(
          new ConflictException('Ya existe un registro con esos datos'),
          host,
        );
      // El registro que la operación necesitaba no existe.
      case 'P2025':
        return super.catch(
          new NotFoundException('No se encontró el registro'),
          host,
        );
      default:
        return super.catch(exception, host);
    }
  }
}
