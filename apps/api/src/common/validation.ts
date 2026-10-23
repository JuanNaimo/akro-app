import {
  BadRequestException,
  StandardSchemaValidationPipe,
  type StandardSchemaValidationPipeOptions,
} from '@nestjs/common';

// El tipo de issue de Standard Schema, sacado de Nest: @standard-schema/spec no es dependencia directa.
type Issues = Parameters<
  NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>
>[0];

export interface ValidationIssue {
  path: string;
  message: string;
}

// Valida los parámetros que declaran un schema: @Body({ schema }), @Query({ schema }),
// @Param('id', { schema }). Si falla, responde 400 con un issue por campo para que la web
// pueda marcar cada uno.
export function createValidationPipe() {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Datos inválidos',
        issues: toValidationIssues(issues),
      }),
  });
}

function toValidationIssues(issues: Issues): ValidationIssue[] {
  return issues.map((issue) => ({
    path: (issue.path ?? [])
      .map((segment) =>
        String(typeof segment === 'object' ? segment.key : segment),
      )
      .join('.'),
    message: issue.message,
  }));
}
