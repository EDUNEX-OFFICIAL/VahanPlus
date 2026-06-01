export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  accent?: string;
  href: string;
}

export const kpis: KpiMetric[] = [
  {
    id: 'ingest',
    label: 'Ingest jobs',
    value: '1,284',
    delta: '+12%',
    trend: 'up',
    accent: 'indigo',
    href: '/khanan/config',
  },
  {
    id: 'vehicle',
    label: 'Vehicles processed',
    value: '8,420',
    delta: '+8%',
    trend: 'up',
    accent: 'cyan',
    href: '/khanan/vehicle-status',
  },
  {
    id: 'khanan',
    label: 'Khanan records',
    value: '2,156',
    delta: '+3%',
    trend: 'up',
    accent: 'lime',
    href: '/khanan/district',
  },
  {
    id: 'failed',
    label: 'Failed jobs',
    value: '14',
    delta: '-4%',
    trend: 'down',
    accent: 'rose',
    href: '/khanan/config',
  },
];
