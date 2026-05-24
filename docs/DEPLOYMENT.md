# Deployment Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+
- Docker (optional, recommended for production)

## Environment variables

Copy templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Production Docker:

```bash
cp .env.production.example .env.production
# Edit secrets, then:
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Required secrets (production)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Min 32 chars |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `JWT_REFRESH_PEPPER` | Min 32 chars |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `POSTGRES_PASSWORD` | DB password (Compose) |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin (Compose) |

## Docker Compose (production)

Services: `postgres`, `redis`, `migrate`, `api`, `worker`, `web`, `prometheus`, `grafana`

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml ps
```

- API: `http://localhost:3000/api`
- Web: `http://localhost:8080`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3002` (default admin / password from env)

Scale workers:

```bash
docker compose -f docker-compose.prod.yml up -d --scale worker=3
```

## Railway

1. Add PostgreSQL and Redis plugins
2. Deploy **API** service from `apps/api/Dockerfile`, set `API_ONLY=true`, `RUN_MIGRATIONS=true` on first deploy
3. Deploy **Worker** service (same image), command: `node dist/worker.main.js`
4. Deploy **Web** from `apps/web/Dockerfile`, set `VITE_API_URL` to public API URL or use reverse proxy

## Render

- **Web Service** — API Dockerfile, health check `/api/health/ready`
- **Background Worker** — same image, start command `node dist/worker.main.js`
- **PostgreSQL** + **Redis** — link via env vars

## AWS / VPS

1. Build and push images (see GitHub Actions `docker-publish.yml`)
2. Run with `docker-compose.prod.yml` on EC2, or
3. Apply `deploy/kubernetes/legacyupgrader.yaml` to EKS (update image registry + secrets)

Create Kubernetes secret:

```bash
kubectl create secret generic legacyupgrader-secrets \
  --from-literal=DATABASE_URL=... \
  --from-literal=JWT_ACCESS_SECRET=... \
  -n legacyupgrader
```

## Migrations

```bash
cd apps/api
pnpm db:migrate:deploy
```

Or set `RUN_MIGRATIONS=true` on the migrate/init container (Compose prod).

## Health checks

| Endpoint | Use |
|----------|-----|
| `GET /api/health/live` | Liveness |
| `GET /api/health/ready` | Readiness (DB + Redis) |
| `GET /api/metrics` | Prometheus scrape |

Worker health: port `WORKER_HEALTH_PORT` (default 3001), same paths under `/api/`.
