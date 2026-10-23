import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './database.js';

// Antes de los e2e: aplica las migraciones que falten en la base de test. Los datos no se
// borran acá: cada test vacía las tablas antes de correr.
export default function setup() {
  const name = new URL(TEST_DATABASE_URL).pathname.slice(1);
  // Los tests vacían las tablas: nunca contra una base que no sea de test.
  if (!name.endsWith('_test'))
    throw new Error(
      `TEST_DATABASE_URL tiene que apuntar a una base terminada en _test, no a "${name}"`,
    );

  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
