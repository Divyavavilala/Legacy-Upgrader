# LegacyUpgrader

Production-grade Turborepo monorepo for the LegacyUpgrader platform.

## Stack

| Layer | Technology |
| --- | --- |
| Monorepo | [Turborepo](https://turbo.build) + [pnpm](https://pnpm.io) workspaces |
| Web | React 19, Vite 6, TypeScript |
| API | NestJS 11, TypeScript |
| Shared | `@legacyupgrader/shared-types`, `@legacyupgrader/rule-definitions` |

## Structure

```text
legacyupgrader/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── shared-types/
│   └── rule-definitions/
├── docker-compose.yml
└── turbo.json
```

## Prerequisites

- Node.js 20+
- pnpm 9 (`corepack enable` or `npm i -g pnpm`)

## Setup

```bash
pnpm install

# Copy environment templates
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start all apps in development (Turbo) |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm typecheck` | TypeScript project references check |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Verify formatting |

Run a single app:

```bash
pnpm --filter @legacyupgrader/web dev
pnpm --filter @legacyupgrader/api dev
```

## Authentication (API)

Email/password JWT auth with organization-scoped RBAC.

| Endpoint | Auth | Description |
| --- | --- | --- |
| `POST /api/auth/register` | Public | Create org + owner user |
| `POST /api/auth/login` | Public | Issue access + refresh tokens |
| `POST /api/auth/refresh` | Public | Rotate refresh token |
| `POST /api/auth/logout` | Public | Revoke refresh token |
| `GET /api/auth/me` | Bearer JWT | Current user profile |

**Roles:** `OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`

Protect routes with `@Roles()` + global `JwtAuthGuard` / `RolesGuard`. Mark public routes with `@Public()`. Use `@CurrentUser()` for the authenticated principal.

Apply auth migration: `pnpm --filter @legacyupgrader/api db:migrate`

## Job queues (Redis + BullMQ)

| Queue | Purpose |
| --- | --- |
| `repository-scan` | Repository scanning (placeholder worker) |
| `dependency-analysis` | Dependency analysis |
| `ai-modernization` | AI modernization pipeline |
| `report-generation` | Report generation |

Start Redis: `docker compose up redis -d`

Queue dashboard health: `GET /api/queues/health` (public)

Enqueue via injected `QueueService` in feature modules. Shared names/payloads live in `@legacyupgrader/queue-constants`.

## Database (PostgreSQL + Prisma)

Start Postgres locally:

```bash
docker compose up postgres -d
```

Configure `apps/api/.env` (see `.env.example`), then:

```bash
pnpm --filter @legacyupgrader/api db:migrate    # apply migrations (dev)
pnpm --filter @legacyupgrader/api db:generate   # regenerate client
pnpm --filter @legacyupgrader/api db:studio     # Prisma Studio
```

Production deploy: `pnpm --filter @legacyupgrader/api db:migrate:deploy`

Schema lives in `apps/api/prisma/schema.prisma`. NestJS uses a global `PrismaModule` with lifecycle hooks and graceful shutdown via `app.enableShutdownHooks()`.

## Environment variables

### Web (`apps/web/.env`)

| Variable | Description |
| --- | --- |
| `VITE_APP_NAME` | Display name in the UI |
| `VITE_API_URL` | Backend base URL (dev: `http://localhost:3000`) |
| `VITE_PORT` | Vite dev server port (default `5173`) |

### API (`apps/api/.env`)

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `APP_NAME` | Service name in health responses |
| `PORT` | HTTP port (default `3000`) |
| `CORS_ORIGIN` | Allowed browser origin for CORS |
| `DATABASE_URL` | PostgreSQL connection string (Prisma) |
| `JWT_ACCESS_SECRET` | Access token signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (32+ chars) |
| `JWT_REFRESH_PEPPER` | HMAC pepper for stored refresh token hashes |
| `JWT_ACCESS_EXPIRES_IN` | Access TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh TTL (e.g. `7d`) |
| `BCRYPT_ROUNDS` | Password hashing cost (10–15) |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port (default `6379`) |
| `REDIS_DB` | Redis database index (0–15) |
| `REDIS_PASSWORD` | Optional Redis password |

## Docker

```bash
docker compose build
docker compose up
```

- Web: http://localhost:8080
- API: http://localhost:3000/api/health

## TypeScript paths

Workspace packages are consumed via `@legacyupgrader/*` package names. The web app also maps those aliases in `vite.config.ts` for fast local development against package source.

### API build / `dist` missing?

Nest deletes `dist/` on each build (`deleteOutDir`). If TypeScript incremental cache (`.tsbuildinfo`) lives **outside** `dist/`, the compiler can skip emitting while `nest build` still exits 0. The API uses `tsBuildInfoFile: "./dist/.tsbuildinfo"` in `tsconfig.build.json` so the cache is cleared with `dist/`. Run `pnpm --filter @legacyupgrader/api clean` if you need a full reset.

## Production deployment

Production splits the **API** and **BullMQ workers** into separate containers for independent scaling.

```bash
cp .env.production.example .env.production
# Edit secrets, then:
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Includes Prometheus (9090) and Grafana (3002). See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

| Docs | Purpose |
| --- | --- |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Railway, Render, AWS, K8s |
| [docs/ONBOARDING.md](./docs/ONBOARDING.md) | Developer setup |
| [docs/OPERATIONS.md](./docs/OPERATIONS.md) | Monitoring & incidents |

CI runs on push/PR via GitHub Actions (lint, typecheck, test, Docker build).

## Run locally (full guide)

```bash
# 1. Install
pnpm install

# 2. Infrastructure
docker compose up -d postgres redis

# 3. Environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Set JWT_* secrets and DATABASE_URL in apps/api/.env

# 4. Database
pnpm --filter @legacyupgrader/api db:migrate

# 5. Start (API + workers + web)
pnpm dev
```

| URL | Service |
| --- | --- |
| http://localhost:5173 | Dashboard |
| http://localhost:3000/api | API |
| http://localhost:3000/api/docs | Swagger |
| http://localhost:3000/api/metrics | Prometheus metrics |

**API-only** (separate worker terminal):

```bash
API_ONLY=true pnpm --filter @legacyupgrader/api dev
pnpm --filter @legacyupgrader/api start:worker   # after build
```

## License

Private — all rights reserved.
