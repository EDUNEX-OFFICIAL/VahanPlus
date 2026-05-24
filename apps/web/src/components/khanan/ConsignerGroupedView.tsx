'use client';

import { ConsignerTable } from '@/components/khanan/ConsignerTable';
import { formatOperatorType } from '@/lib/operator';
import type {
  ConsignerDistrictGroup,
  ConsignerSortDir,
  ConsignerSortKey,
  OperatorType,
} from '@/lib/epass-types';

interface ConsignerGroupedViewProps {
  groups: ConsignerDistrictGroup[];
  sortKey: ConsignerSortKey | null;
  sortDir: ConsignerSortDir;
  onSort: (key: ConsignerSortKey) => void;
  linkSearchParams?: URLSearchParams;
}

function operatorColor(type: OperatorType): string {
  return type === 'lessee' ? 'text-indigo-300' : 'text-emerald-300';
}

export function ConsignerGroupedView({
  groups,
  sortKey,
  sortDir,
  onSort,
  linkSearchParams,
}: ConsignerGroupedViewProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold text-white">{group.dmoName}</h2>
            <span className={`text-sm font-medium ${operatorColor(group.operatorType)}`}>
              ({formatOperatorType(group.operatorType)})
            </span>
            <span className="text-xs text-text-secondary tabular-nums">
              {group.rows.length} consigner{group.rows.length === 1 ? '' : 's'}
            </span>
          </div>
          <ConsignerTable
            rows={group.rows}
            hideDistrictColumns
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            compact
            linkSearchParams={linkSearchParams}
          />
        </section>
      ))}
    </div>
  );
}
