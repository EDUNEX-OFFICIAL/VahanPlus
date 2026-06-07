import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const epassQueryDuration = new client.Histogram({
  name: 'epass_query_duration_seconds',
  help: 'ePass reporting query duration',
  labelNames: ['route', 'scope'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const epassQueryRowsReturned = new client.Histogram({
  name: 'epass_query_rows_returned',
  help: 'Rows returned by ePass reporting queries',
  labelNames: ['route'],
  buckets: [0, 1, 10, 50, 100, 500, 1000, 5000, 10000, 25000],
  registers: [register],
});

export const epassQuerySnapshotsLoaded = new client.Gauge({
  name: 'epass_query_snapshots_loaded',
  help: 'Snapshots loaded for last reporting request (alert if > 1 on read-model routes)',
  labelNames: ['route'],
  registers: [register],
});

export const reportAggregateDuration = new client.Histogram({
  name: 'report_aggregate_duration_seconds',
  help: 'Report aggregate job duration',
  labelNames: ['trigger'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const reportAggregateEntitiesUpdated = new client.Counter({
  name: 'report_aggregate_entities_updated_total',
  help: 'Summary entities updated by aggregate jobs',
  labelNames: ['trigger'],
  registers: [register],
});

export const reportAggregateFailures = new client.Counter({
  name: 'report_aggregate_failures_total',
  help: 'Failed report aggregate jobs',
  labelNames: ['trigger'],
  registers: [register],
});

export function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    end({ status: String(res.statusCode) });
  });
  next();
}

export function observeEpassQuery(route, scope, durationSec, rowCount, snapshotsLoaded = 0) {
  epassQueryDuration.observe({ route, scope }, durationSec);
  epassQueryRowsReturned.observe({ route }, rowCount);
  epassQuerySnapshotsLoaded.set({ route }, snapshotsLoaded);
}
