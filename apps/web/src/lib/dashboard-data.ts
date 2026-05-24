export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  accent?: string;
}

export const kpis: KpiMetric[] = [
  {
    id: 'ingest',
    label: 'Ingest jobs',
    value: '1,284',
    delta: '+12%',
    trend: 'up',
    accent: 'indigo',
  },
  {
    id: 'vehicle',
    label: 'Vehicles processed',
    value: '8,420',
    delta: '+8%',
    trend: 'up',
    accent: 'cyan',
  },
  {
    id: 'khanan',
    label: 'Khanan records',
    value: '2,156',
    delta: '+3%',
    trend: 'up',
    accent: 'lime',
  },
  {
    id: 'failed',
    label: 'Failed jobs',
    value: '14',
    delta: '-4%',
    trend: 'down',
    accent: 'rose',
  },
];
