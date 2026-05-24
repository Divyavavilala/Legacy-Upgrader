# LegacyUpgrader Architecture

## Overview

LegacyUpgrader is a Turborepo monorepo for legacy codebase discovery, scanning, and AI-assisted modernization.

| Component | Technology |
|-----------|------------|
| API | NestJS 11, Express, Prisma |
| Workers | BullMQ on Redis |
| Database | PostgreSQL |
| Frontend | React 19, Vite, TanStack Query |
| Queue contracts | `@legacyupgrader/queue-constants` |

## Process model

**Development** — single API process (`main.ts` + `AppModule`) runs HTTP and embedded BullMQ workers.

**Production** — split processes:

- **API** (`dist/main.js`, `API_ONLY=true`) — REST, auth, enqueue jobs
- **Worker** (`dist/worker.main.js`) — consumes BullMQ queues, scan/AI pipeline

## Request flow

```
Browser → Web (nginx) → API → PostgreSQL
                      ↘ Redis → Workers → Scan pipeline → AI agents
```

1. User triggers scan via `POST /api/repositories/:id/scan`
2. API creates `Scan` + `QueuedJob`, enqueues `repository-scan`
3. Worker clones repo, runs analyzer pipeline, persists findings
4. Optional AI jobs run on dedicated queues after scan completion
5. Frontend polls `/api/scans/:id/progress` until complete

## Multi-tenancy

- Organization-scoped data via `organizationId` on JWT and queries
- RBAC: OWNER, ADMIN, DEVELOPER, VIEWER
- Quotas enforced per plan (repos, scans/month, AI tokens)

## Observability

- Structured JSON logs (`LOG_FORMAT=json`)
- Request ID header: `X-Request-Id`
- Prometheus metrics at `/api/metrics`
- Health: `/api/health/live`, `/api/health/ready`

## Deployment artifacts

- `docker-compose.yml` — local full stack
- `docker-compose.prod.yml` — production + Prometheus + Grafana
- `deploy/kubernetes/` — K8s manifests
- `.github/workflows/` — CI/CD
