# Operations Handbook

## Monitoring

### Prometheus

Scrape targets (Compose prod):

- `api:3000/api/metrics`
- `worker:3001/api/metrics`

Key metrics:

| Metric | Description |
|--------|-------------|
| `legacyupgrader_http_requests_total` | HTTP traffic |
| `legacyupgrader_http_request_duration_seconds` | API latency |
| `legacyupgrader_worker_jobs_total` | Job completions/failures |
| `legacyupgrader_worker_job_duration_seconds` | Job duration |
| `legacyupgrader_scan_duration_seconds` | Scan pipeline duration |
| `legacyupgrader_queue_depth` | BullMQ queue depth |

### Grafana

Default URL (Compose): http://localhost:3002

Provisioned Prometheus datasource. Import dashboards for HTTP rate, queue depth, and scan duration.

### Logs

Production uses `LOG_FORMAT=json`. Each log line includes `requestId` for HTTP requests.

Correlate with `X-Request-Id` response header.

## Alerts (recommended)

- Readiness probe failing > 2 min
- `legacyupgrader_queue_depth{state="failed"}` increasing
- Worker job failure rate > 10% over 15 min
- API p95 latency > 5s

## Incident response

### API unhealthy

1. Check `GET /api/health/ready` — database vs Redis
2. Verify `DATABASE_URL`, `REDIS_HOST`
3. Review API logs for Prisma/Redis errors

### Workers stalled

1. Check worker health: `GET :3001/api/health/ready`
2. Inspect `GET /api/queues/health` for queue backlog
3. Scale workers: `docker compose ... up -d --scale worker=N`
4. Review dead-letter jobs in `queued_jobs` table (`status = DEAD_LETTER`)

### Scan failures

1. Open scan detail — error message
2. Check worker logs for clone/analyzer errors
3. Verify `SCAN_WORKSPACE_ROOT` disk space
4. Audit log: `GET /api/audit-logs?action=SCAN_FAILED`

## Graceful shutdown

API and workers call `enableShutdownHooks()`:

- BullMQ workers close on SIGTERM
- Prisma disconnects cleanly
- In-flight jobs respect BullMQ lock duration

Kubernetes: set `terminationGracePeriodSeconds: 120` for worker pods.

## Backups

- **PostgreSQL**: daily logical backups (`pg_dump`) or managed service snapshots
- **Redis**: AOF enabled in Compose; persistence optional for queue recovery
- **Scan workspaces**: ephemeral under `SCAN_WORKSPACE_ROOT`; safe to purge if disk full

## Security operations

- Rotate JWT secrets and API keys periodically
- Revoke compromised API keys in Settings
- Review audit logs for member/role changes
- Keep `SWAGGER_ENABLED=false` in production

## Upgrades

```bash
git pull
pnpm install
cd apps/api && pnpm db:migrate:deploy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Run migrations before rolling out new API/worker images.
