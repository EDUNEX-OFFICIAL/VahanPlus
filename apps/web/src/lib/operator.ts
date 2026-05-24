import type { OperatorType, OperatorTypeFilter } from '@/lib/epass-types';

export function operatorTypeLabel(type: OperatorType): string {
  return type === 'lessee' ? 'Lessee' : 'Dealer';
}

export function formatOperatorType(type: OperatorType | string | null | undefined): string {
  if (type === 'lessee' || type === 'dealer') return operatorTypeLabel(type);
  return '—';
}

export function operatorFilterLabel(op: OperatorTypeFilter): string {
  if (op === 'lessee') return 'Lessee';
  if (op === 'dealer') return 'Dealer';
  return 'All';
}

export function parseOperatorParam(
  operator: string | null,
  legacyRole: string | null,
): OperatorTypeFilter {
  const raw = operator ?? legacyRole;
  if (raw === 'lessee' || raw === 'dealer') return raw;
  return 'all';
}
