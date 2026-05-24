import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
  Gauge,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDuration: Histogram<string>;
  readonly workerJobsTotal: Counter<string>;
  readonly workerJobDuration: Histogram<string>;
  readonly scanDuration: Histogram<string>;
  readonly queueDepth: Gauge<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: 'legacyupgrader_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'legacyupgrader_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.workerJobsTotal = new Counter({
      name: 'legacyupgrader_worker_jobs_total',
      help: 'Total worker jobs processed',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.workerJobDuration = new Histogram({
      name: 'legacyupgrader_worker_job_duration_seconds',
      help: 'Worker job duration in seconds',
      labelNames: ['queue', 'status'],
      buckets: [1, 5, 15, 30, 60, 120, 300, 600, 1200],
      registers: [this.registry],
    });

    this.scanDuration = new Histogram({
      name: 'legacyupgrader_scan_duration_seconds',
      help: 'Repository scan duration in seconds',
      labelNames: ['status'],
      buckets: [10, 30, 60, 120, 300, 600, 1200, 1800],
      registers: [this.registry],
    });

    this.queueDepth = new Gauge({
      name: 'legacyupgrader_queue_depth',
      help: 'BullMQ queue depth by state',
      labelNames: ['queue', 'state'],
      registers: [this.registry],
    });
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordHttp(method: string, route: string, status: number, durationMs: number): void {
    const labels = { method, route, status: String(status) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs / 1000);
  }

  recordWorkerJob(queue: string, status: 'completed' | 'failed', durationMs: number): void {
    const labels = { queue, status };
    this.workerJobsTotal.inc(labels);
    this.workerJobDuration.observe(labels, durationMs / 1000);
  }

  recordScan(status: 'completed' | 'failed', durationMs: number): void {
    this.scanDuration.observe({ status }, durationMs / 1000);
  }

  setQueueDepth(queue: string, state: string, count: number): void {
    this.queueDepth.set({ queue, state }, count);
  }
}
