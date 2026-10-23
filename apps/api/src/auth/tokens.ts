import { createHash, randomBytes } from 'node:crypto';

// 256 bits al azar, para la cookie de sesión y los links de los mails. En la base se guarda
// su sha256: alcanza con un hash rápido, porque un token así no se adivina por fuerza bruta
// como una contraseña.
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
