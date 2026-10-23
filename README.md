# Akro

Pasito, pero de estudio: una app social que convierte estudiar en una actividad compartida y gamificada.
El plan está en [`ROADMAP.md`](ROADMAP.md).

| Carpeta | Qué hay |
|---|---|
| `apps/api` | API en NestJS 12 + Prisma 7 sobre Postgres, Redis para caché y MinIO (S3) para archivos. |
| `apps/web` | PWA en Next.js 16 (React 19), con Serwist para el service worker. |
| `docker-compose.yml` | Entorno de desarrollo completo. |

## Desarrollo con Docker

Requiere Docker con Compose.

```sh
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/health
- Consola de MinIO: http://localhost:9001 (usuario `akro`, clave `akro-dev-secret`)

El código entra al contenedor por bind mount, así que los cambios se recargan solos. `node_modules` vive en
volúmenes del contenedor (los binarios nativos son distintos en cada sistema): si cambian las dependencias,
correr `docker compose up deps` y después `docker compose restart api web`.

Migraciones: `docker compose exec api pnpm db:migrate`.

En Windows, el hot reload anda bien con el repo clonado dentro de WSL 2. Si el repo está en un disco de
Windows y los cambios no se ven, activar polling copiando `.env.example` a `.env`.

## Desarrollo sin Docker

Requiere Node 22+ y pnpm 12. Postgres, Redis y MinIO tienen que estar disponibles en algún lado (las URLs van
en `apps/api/.env`).

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

Si falta algún servicio, el API arranca igual y `/api/health` (también visible en la home) muestra cuál.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | API y web con recarga automática. |
| `pnpm build` | Build de producción de las dos apps. |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Lint, tipos y tests. Los e2e del API: `pnpm --filter api test:e2e`. |
| `pnpm --filter api db:migrate` | Crea y aplica migraciones de Prisma. |
| `pnpm roadmap` | Abre el roadmap con [Roadmapper](https://github.com/SantiagoBaezDuic/roadmapper) (repo privado: hace falta acceso). |

## PWA

En desarrollo el service worker está apagado para que no sirva versiones viejas. Para probar la app
instalable: `pnpm --filter web build && pnpm --filter web start`. En iOS se instala desde Safari →
Compartir → Agregar a inicio, y solo instalada recibe notificaciones push.
