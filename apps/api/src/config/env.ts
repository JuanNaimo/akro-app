import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  // Origen de la web: el único que puede mandar pedidos con la cookie de sesión, y la base
  // de los links de los mails. Si es https, la cookie sale con Secure. Se normaliza (sin barra
  // final) para compararlo tal cual con el header Origin.
  WEB_ORIGIN: z
    .url()
    .default('http://localhost:3000')
    .transform((url) => new URL(url).origin),
  // Sin SMTP, los mails se loguean en la consola.
  SMTP_URL: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).default('Akro <no-reply@akro.local>'),
});

export type Env = z.infer<typeof envSchema>;
