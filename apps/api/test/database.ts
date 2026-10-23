// Base de los tests e2e. setup-db.ts la resetea antes de cada corrida, así que siempre tiene
// que ser una base aparte, terminada en _test.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://akro:akro@localhost:5432/akro_test';
