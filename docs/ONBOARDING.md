# Developer Onboarding

## Quick start (local)

```bash
# Install dependencies
pnpm install

# Start Postgres + Redis (Docker)
docker compose up -d postgres redis

# Configure API
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL, JWT_* secrets

# Migrate database
cd apps/api && pnpm db:migrate && cd ../..

# Start dev servers (API + web + workers in one API process)
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

## Repository layout

```
apps/api          NestJS backend + workers
apps/web          React dashboard
packages/         shared-types, queue-constants, rule-definitions
deploy/           prometheus, grafana, kubernetes
docs/             architecture & operations
```

## Common tasks

| Task | Command |
|------|---------|
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Test | `pnpm test` |
| API tests only | `cd apps/api && pnpm test` |
| Prisma Studio | `cd apps/api && pnpm db:studio` |

## API-only vs worker mode

| Mode | How |
|------|-----|
| Dev (default) | `pnpm dev` — workers embedded |
| API only | `API_ONLY=true pnpm --filter @legacyupgrader/api dev` |
| Worker only | `pnpm --filter @legacyupgrader/api start:worker` |

## Register & scan flow

1. Open `/register` — creates org + owner user
2. Add repository under **Repositories**
3. Trigger scan — watch progress on scan detail page
4. Review findings and AI report when complete

## Settings (SaaS)

`/settings` — organization, team, usage/quota, API keys, audit logs

## Getting help

- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Operations: [OPERATIONS.md](./OPERATIONS.md)
