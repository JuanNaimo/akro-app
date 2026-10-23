import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { startMailSink } from "./mail-sink";

// La misma base que los e2e del API (apps/api/test/database.ts), con el mismo override.
export const E2E_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://akro:akro@localhost:5432/akro_test";

// Aplica las migraciones a la base de test (con el mismo chequeo de nombre que
// apps/api/test/setup-db.ts) y levanta el buzón de mails. Devuelve el teardown.
export default async function globalSetup() {
  const name = new URL(E2E_DATABASE_URL).pathname.slice(1);
  if (!name.endsWith("_test"))
    throw new Error(
      `La base de los e2e tiene que terminar en _test, no en "${name}"`,
    );

  execSync("pnpm exec prisma migrate deploy", {
    cwd: resolve(__dirname, "../../api"),
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "inherit",
  });

  return await startMailSink();
}
