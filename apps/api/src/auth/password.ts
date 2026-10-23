import { hash, verify, type Options } from '@node-rs/argon2';

// argon2id (el algoritmo por defecto de @node-rs/argon2) con los parámetros que recomienda
// OWASP. Los parámetros quedan escritos en cada hash, así que cambiarlos no rompe los viejos.
const options: Options = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

let decoyHash: Promise<string> | undefined;

// Gasta lo mismo que verifyPassword y siempre da false: un login con un mail que no existe
// tarda lo mismo que uno con la contraseña mal, y no delata qué cuentas existen.
export async function verifyDecoy(password: string): Promise<false> {
  decoyHash ??= hashPassword('akro-decoy-password');
  await verify(await decoyHash, password);
  return false;
}
