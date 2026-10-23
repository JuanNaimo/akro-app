# Pantallas de auth en la web (rama `feat/auth-api`, PR #1)

## Contexto
El API de auth ya está hecho: register, login, logout, me, verify-email (+resend), password/forgot y reset.
Está en `feat/auth-api`, con el PR #1 abierto. En el roadmap, `auth` figura `in_progress` porque le faltan las
pantallas. La web (`apps/web`, Next 16.4 + React 19.3 + Tailwind v4) es todavía un cascarón: no tiene
componentes ni tests.

Lo que pidió el usuario:
- Mismo PR y misma rama.
- Antes de cualquier commit o push, corregir el secreto que marcó GitGuardian.
- Rutas en inglés.
- Tests con Vitest y con Playwright.
- Después del registro, una pantalla de «revisá tu mail».
- Sumar a `CLAUDE.local.md` la forma de encarar features grandes de Alacena, adaptada a Akro.

Esta feature tiene más de 3 etapas, así que se arma con ese mismo flujo. Al empezar, este plan se copia a
`plans/auth-web.md` y se commitea con el trabajo. Cada fase es el brief de un subagente.

## Fase 0: secreto, directiva y plan (agente principal)
1. **GitGuardian, incidente 38900436.** Marcó «Generic Password» en `apps/api/test/auth.e2e-spec.ts:11`
   (commit a55bf00). Es un falso positivo: es la contraseña de prueba de los e2e y no hay nada que rotar.
   - Cambiar todos los literales de contraseña de ese archivo por valores que se generan al correr el test con
     `randomBytes` de `node:crypto`: `credentials.password`, `newPassword`, `'no es esta'` y `'corta'`. La
     corta se genera de menos de 8 caracteres, para el caso de 400.
   - Buscar en el repo `password\s*[:=]\s*['"]` por si queda alguno.
   - Correr lint, typecheck, test y test:e2e del API.
   - `git commit --amend` sobre a55bf00, `git push --force-with-lease origin feat/auth-api` (nunca a main) y
     `gh pr checks 1` para confirmar que GitGuardian queda en verde.
2. **Directiva en `CLAUDE.local.md`.** Agregar una sección «Features grandes», adaptada del CLAUDE.md de
   Alacena:
   - Es grande la feature que se divide en 3 etapas o más. Lo chico se hace directo.
   - Pasos:
     1. Análisis y plan del agente principal, sin supuestos: toda duda va como pregunta. El plan se guarda en
        `plans/<feature>.md`, commiteado. Cada fase es el brief autocontenido de un subagente: archivos,
        invariantes, qué no tocar y cómo verificar.
     2. Revisión del plan con el usuario. No se implementa nada sin su aprobación.
     3. Implementación con subagentes, con el modelo según el riesgo:
        - Migraciones de Prisma, auth y seguridad (sesiones, tokens, guards, cookies) y todo lo que pueda
          filtrar datos sin avisar: lo escribe el agente principal o un subagente Opus, siempre con tests e2e.
        - UI y trabajo mecánico: Sonnet.
        - Lo trivial: Haiku.
        Las fases van en serie, y en paralelo solo si tocan archivos disjuntos. Los subagentes solo tocan los
        archivos de su fase, no commitean ni pushean, y si el plan no cierra se frenan y avisan.
     4. Revisión del agente principal: lee el diff, vuelve a correr el chequeo de la fase (`pnpm lint`,
        `typecheck`, `test`, `test:e2e`, `roadmapper check`) y cierra cada fase aceptada con su propio commit en
        la rama.
     5. Resultados, separando lo verificado de lo pendiente, con una guía concreta de qué probar a mano. Cierre:
        ROADMAP.md, memoria y borrar el plan.
   - Git: los commits van en la rama de la feature y el push y el PR, como dicen las directivas de arriba.
     Nunca push a main.
3. Copiar este plan a `plans/auth-web.md`.

## Fase 1: links de los mails del API (Haiku)
- En `apps/api/src/auth/auth.service.ts`, `link('/verificar', …)` pasa a `link('/verify-email', …)` y
  `link('/restablecer', …)` pasa a `link('/reset-password', …)`.
- Actualizar las URLs esperadas en `apps/api/test/auth.e2e-spec.ts`, cerca de las líneas 168 y 238.
- Si los templates de `src/mail/mail-templates.ts` nombran las rutas, también.
- No tocar nada más.
- Verificación: `pnpm --filter api lint typecheck test test:e2e`.

## Fase 1b: magic link en el API (agente principal; es auth)
Decisiones del usuario: es una opción extra en `/login` y la contraseña se mantiene. Un mail sin cuenta no
recibe nada, pero la respuesta es 204 igual. El link se puede canjear desde cualquier dispositivo.
- **Prisma:** agregar `MAGIC_LINK` a `enum EmailTokenKind` (`apps/api/prisma/schema.prisma`), con su
  migración.
- **Endpoints** en `auth.controller.ts` y `auth.service.ts`:
  - `POST /api/auth/magic-link`, con `{ email }` (reusa `emailSchema`). Es público y responde **204**
    siempre. Throttle de 5 por hora, como forgot. Si la cuenta existe, crea el token con
    `createEmailToken` (TTL de **15 minutos**: hoy `createEmailToken` recibe horas, así que se pasa a
    minutos o se le suma un parámetro, y se ajustan los usos existentes) y manda el mail
    `magicLinkMail(link('/magic-link', token), …)`. Como en el resto, el envío no se espera.
  - `POST /api/auth/magic-link/verify`, con `{ token }` (reusa `tokenSchema`). Es público y responde
    **200** con `PublicUser`, y pone la cookie igual que login. Throttle de 10 por minuto. Canjea el token
    con `consumeEmailToken`, que es de un solo uso; si vence, da el mismo 400 «El link venció o no es
    válido». Además marca el mail como verificado: tener acceso al mail lo prueba.
  - Pedir un link nuevo invalida los anteriores, igual que los otros tokens.
- **Template** en `src/mail/mail-templates.ts`: «Tu link para entrar a Akro», que dice que vence en 15
  minutos y que si no lo pediste, lo ignores.
- **Tests e2e** en `auth.e2e-spec.ts`:
  - Pedir el link y canjearlo: 200, cookie, `/me` y `emailVerified` en true.
  - Un mail sin cuenta: 204 y ningún mail.
  - Un token reusado, vencido o reemplazado por uno más nuevo: 400.
  - Throttle: 429.
  - Origin ajeno: 403.
- Verificación: `pnpm --filter api lint typecheck test test:e2e`.

## Fase 2: base de la web (Sonnet)
Antes de escribir código, leer `apps/web/AGENTS.md` y las guías de `apps/web/node_modules/next/dist/docs/`:
Next 16 usa `proxy.ts` y tiene `cacheComponents`.
- **Estilos** (`app/globals.css`):
  - Tokens de marca en `@theme`: `--color-brand` (#6b4fd8) con su variante para hover/oscuro y los tokens de
    superficie, texto, borde y peligro, con modo oscuro.
  - Sacar el `font-family: Arial`, que pisa a Geist.
  - En los componentes se usan solo los tokens, nada de hex sueltos.
- **Componentes** (`components/ui/`), mobile-first, con touch targets de 44px o más:
  - `Button`: primario y secundario, con estado de carga.
  - `TextField`: label, error por campo, `aria-invalid` y `aria-describedby`.
  - `FormError`: con `role="alert"`.
  - `Notice`: banner.
  - `TextLink`.
- **Cliente del API** (`lib/api.ts`):
  - `apiFetch` usa `fetch` same-origin.
  - Si la respuesta no es ok, tira `ApiError { status, message, fieldErrors }`, con los `fieldErrors` armados
    desde `issues[].path` y `issues[].message`.
  - Si no llega un JSON, usa un mensaje genérico en español.
- **Funciones de auth** (`lib/auth.ts`): `login`, `signup` (POST `/api/auth/register`), `logout`, `me`,
  `verifyEmail`, `resendVerification`, `forgotPassword`, `resetPassword`, `requestMagicLink` y
  `verifyMagicLink`. El tipo `PublicUser`
  (`{ id, email, emailVerified }`) va escrito a mano, con un comentario de que replica a
  `apps/api/src/auth`, como hace `api-status.tsx`.
- **Vitest** en `apps/web`:
  - Dependencias: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`,
    `@testing-library/user-event` y `@testing-library/jest-dom`.
  - Un `vitest.config.ts` con el alias `@/` y el script `"test": "vitest run"`, así entra en el `pnpm test`
    de la raíz. Que excluya `e2e/`.
  - Tests de `lib/api.test.ts`: los issues pasan a `fieldErrors`, un 429 trae su mensaje y un 500 o una
    respuesta que no es JSON dan el mensaje genérico.
- Verificación: `pnpm --filter web lint typecheck test`.

## Fase 3: pantallas (Sonnet)
Las rutas van en el route group `app/(auth)/`, con un layout común: tarjeta centrada, mobile-first, y el
título «Akro». Los textos de la UI van en español rioplatense y el código en inglés.

| Ruta | Comportamiento |
|---|---|
| `/login` | Mail y contraseña. Si sale bien, va a `next` si es seguro y si no a `/`. Tiene links a `/signup` y `/forgot-password`, y un botón secundario «Mandame un link para entrar» que usa el mail cargado y llama a `requestMagicLink`. Ese botón siempre responde «Si hay una cuenta con ese mail, te mandamos un link (vence en 15 minutos)». |
| `/magic-link?token=` | Al montarse, hace POST `magic-link/verify`. Si sale bien, va a `/`. Si el token es inválido, muestra «El link venció o no es válido» con un link a `/login`. Queda siempre abierta en `proxy.ts`. |
| `/signup` | Mail y contraseña (8 a 128 caracteres). Si sale bien, va a `/check-email`. |
| `/check-email` | «Te mandamos un link a {mail}». Botón «Reenviar» (`resendVerification`, que muestra el 429 si toca) y «Seguir a Akro» → `/`. Si no hay sesión, va a `/login`. |
| `/verify-email?token=` | Al montarse, hace POST `verify-email` (sin pedir sesión). Muestra «Mail verificado» con un link a `/`, o «El link venció o no es válido» con un botón para reenviar si hay sesión. Sin token, muestra ese mismo error. |
| `/forgot-password` | Pide el mail. Siempre responde «Si hay una cuenta con ese mail, te mandamos un link». |
| `/reset-password?token=` | Pide la nueva contraseña. Si sale bien, muestra «Listo» con un link a `/login`. Si el token es inválido, muestra el error con un link a `/forgot-password`. |
| `/` | Llama a `me()`. Muestra el mail, el `Notice` «Confirmá tu mail» con reenviar si `emailVerified` es false, y «Salir» (`logout` → `/login`). Si da 401, va a `/login`. |

- **Formularios:** client components con `useActionState`.
  - En el cliente valida solo el HTML: `type="email"`, `required`, `minLength` y `maxLength`.
  - Los errores del API se muestran en su campo (`fieldErrors`) o en `FormError`, y los mensajes del API ya
    vienen en español.
  - El botón queda deshabilitado mientras se envía.
- **`proxy.ts`:** solo mira si está la cookie `akro_session`.
  - Sin cookie, `/` y `/check-email` van a `/login?next=<path>`.
  - Con cookie, `/login` y `/signup` van a `/`.
  - `/verify-email`, `/forgot-password` y `/reset-password` quedan siempre abiertas.
  - Que el matcher no agarre `/api`, `/_next`, `/serwist`, `/~offline` ni los íconos.
- **Invariante de seguridad:** `next` solo se acepta si empieza con `/` y no con `//` ni con `/\`. Si no, se
  va a `/`, para que no haya un open redirect. Esto va con su test.
- **Tests de Vitest** con `fetch` mockeado:
  - Login: error por campo, 401 general y redirect a `next`, incluido un `next` malicioso.
  - Signup: 409 y redirect a `/check-email`.
  - Verify-email: el éxito y el token vencido.
  - Reset-password: el éxito.
  - El helper de `next` seguro.
- Verificación: `pnpm --filter web lint typecheck test`.

## Fase 4: Playwright (Sonnet)
- Dependencia: `@playwright/test`, con `pnpm exec playwright install chromium`. Script `"test:e2e"`, fuera
  del `pnpm test` de la raíz, igual que los e2e del API.
- **Requisitos**, documentados en el README:
  - Postgres con la base `akro_test`, Redis y MinIO, como los e2e del API.
  - Mailpit en `1025`/`8025`. Corre como binario suelto, sin Docker.
- **`playwright.config.ts`:**
  - `webServer` levanta el API con `DATABASE_URL=akro_test`, `SMTP_URL=smtp://localhost:1025` y
    `WEB_ORIGIN=http://localhost:3000`, y la web en `:3000`.
  - El proyecto usa el viewport de un celular, `devices['Pixel 7']`.
  - Antes de correr, `globalSetup` aplica las migraciones a `akro_test`, reusando el chequeo de nombre
    `_test` de `apps/api/test/setup-db.ts`.
- **`e2e/auth.spec.ts`:** borra los mensajes de Mailpit (`DELETE /api/v1/messages`) y usa un mail único por
  corrida. Saca los tokens de la API de Mailpit (`/api/v1/messages` y `/api/v1/message/{id}`). Recorre:
  1. signup → `/check-email`
  2. link de verificación → «Mail verificado»
  3. `/`, ya sin el banner
  4. salir → `/login`
  5. `/forgot-password` → link de reset → nueva contraseña
  6. login con la nueva contraseña → `/`
  7. login con la contraseña vieja → error
  8. salir → «Mandame un link» en `/login` → abrir el link de Mailpit → `/` con sesión
  Las contraseñas se generan al correr el test, nunca literales, por GitGuardian.
- Verificación: `pnpm --filter web test:e2e` con los servicios levantados. Si acá no se pueden levantar sin
  Docker, se avisa y queda como pendiente.

## Fase 5: cierre (agente principal)
- **ROADMAP.md:**
  - `auth` pasa a `status=done`, con un `why` que dice que las pantallas están hechas y que Google queda para
    más adelante. También suma el magic link: es una opción extra, el link vence en 15 minutos y verifica el
    mail.
  - `web_app` pasa a `done`, con un `why` que dice que el sistema de diseño mínimo existe y crece con cada
    pantalla.
  - En la tabla de decisiones, sumar «Rutas de la web en inglés; textos en español» con fecha 2026-10-23.
  - Validar con `roadmapper check`.
- Volver a correr todo: `pnpm lint typecheck test` y los dos `test:e2e`.
- Probar a mano con `pnpm dev`, con el navegador a 390px.
- Un commit por fase aceptada. Al final, push de `feat/auth-api` y `gh pr edit 1` para actualizar el título y
  la descripción con las pantallas.
- Borrar `plans/auth-web.md` en el último commit y actualizar la memoria `akro-project`.

## Verificación global
Root `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde. Los `test:e2e` del API y de la web, en verde, o
informados como pendientes si los servicios no levantan. GitGuardian, en verde en el PR #1. Y el recorrido
manual completo en el navegador.
