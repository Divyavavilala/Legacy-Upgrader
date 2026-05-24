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

## License

Private — all rights reserved.
