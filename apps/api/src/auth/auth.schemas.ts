import { z } from 'zod';

// Se compara y se guarda en minúsculas: Ana@Mail.com y ana@mail.com son la misma cuenta.
const email = z.string().trim().toLowerCase().pipe(z.email());

// Sin reglas de composición (NIST 800-63B): lo que importa es el largo. El máximo evita
// gastar CPU hasheando contraseñas gigantes.
const newPassword = z.string().min(8).max(128);

const token = z.string().min(1).max(128);

export const registerSchema = z.object({ email, password: newPassword });
export type RegisterInput = z.infer<typeof registerSchema>;

// Al entrar no se aplica la política de contraseñas: si cambia, las cuentas viejas siguen
// pudiendo entrar.
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const emailSchema = z.object({ email });
export type EmailInput = z.infer<typeof emailSchema>;

export const tokenSchema = z.object({ token });
export type TokenInput = z.infer<typeof tokenSchema>;

export const resetPasswordSchema = z.object({ token, password: newPassword });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
