import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import type { SinkMessage } from "./mail-sink";

const SINK = "http://localhost:2526/messages";

const SUBJECTS = {
  verify: "Confirmá tu mail en Akro",
  reset: "Restablecé tu contraseña de Akro",
  magic: "Tu link para entrar a Akro",
};

const email = `e2e-${Date.now()}@akro.test`;
// Generadas al correr: nunca literales.
const password = randomBytes(12).toString("base64url");
const newPassword = randomBytes(12).toString("base64url");

async function inbox(): Promise<SinkMessage[]> {
  return (await (await fetch(SINK)).json()) as SinkMessage[];
}

// Espera el mail más nuevo con ese asunto para ese destinatario (de los que llegaron después
// de `after` mails) y devuelve el link que apunta a `path`.
async function linkFromMail(
  subject: string,
  path: string,
  after: number,
): Promise<string> {
  const pattern = new RegExp(`https?://\\S+${path}\\?token=[\\w-]+`);
  let link = "";
  await expect
    .poll(
      async () => {
        const found = (await inbox())
          .slice(after)
          .filter((m) => m.subject === subject && m.to.includes(email))
          .at(-1);
        link = found?.text.match(pattern)?.[0] ?? "";
        return link;
      },
      { message: `mail «${subject}»`, timeout: 20_000 },
    )
    .not.toBe("");
  return link;
}

async function login(page: Page, pass: string) {
  await page.goto("/login");
  await page.getByLabel("Mail").fill(email);
  await page.getByLabel("Contraseña").fill(pass);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test.describe.configure({ mode: "serial" });

test("registro, verificación, reset de contraseña y magic link", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await fetch(SINK, { method: "DELETE" });

  // 1. signup
  await page.goto("/signup");
  await page.getByLabel("Mail").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/check-email$/);
  await expect(page.getByText(email)).toBeVisible();

  // 2. link de verificación
  const verifyLink = await linkFromMail(SUBJECTS.verify, "/verify-email", 0);
  await page.goto(verifyLink);
  await expect(page.getByText("Mail verificado")).toBeVisible();

  // 3. home, sin el banner
  await page.getByRole("link", { name: "Seguir a Akro" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Entraste como")).toContainText(email);
  await expect(page.getByText("Confirmá tu mail")).toHaveCount(0);

  // 4. salir
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);

  // 5. olvidé mi contraseña
  const beforeReset = (await inbox()).length;
  await page.goto("/forgot-password");
  await page.getByLabel("Mail").fill(email);
  await page.getByRole("button", { name: "Mandar link" }).click();
  await expect(
    page.getByText("Si hay una cuenta con ese mail, te mandamos un link."),
  ).toBeVisible();
  const resetLink = await linkFromMail(
    SUBJECTS.reset,
    "/reset-password",
    beforeReset,
  );
  await page.goto(resetLink);
  await page.getByLabel("Contraseña nueva").fill(newPassword);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(
    page.getByText("Listo, ya cambiaste tu contraseña."),
  ).toBeVisible();

  // 6. login con la contraseña nueva
  await login(page, newPassword);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Entraste como")).toContainText(email);
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);
  // Salir no deja el mail de la cuenta anterior precargado en el formulario.
  await expect(page.getByLabel("Mail")).toHaveValue("");

  // 7. login con la contraseña vieja
  await login(page, password);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  // 8. magic link
  const beforeMagic = (await inbox()).length;
  await page
    .getByRole("button", { name: "Mandame un link para entrar" })
    .click();
  await expect(
    page.getByText(/te mandamos un link \(vence en 15/),
  ).toBeVisible();
  const magicLink = await linkFromMail(
    SUBJECTS.magic,
    "/magic-link",
    beforeMagic,
  );
  await page.goto(magicLink);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Entraste como")).toContainText(email);
});
