import type { EpassDistrictRow, EpassReportMeta } from './types.js';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateMvpFixtures(meta: EpassReportMeta): ValidationResult {
  const errors: string[] = [];
  const bySl = new Map<number, EpassDistrictRow>(meta.rows.map((r) => [r.slNo, r]));

  const arwal = bySl.get(2);
  if (!arwal) {
    errors.push('Missing slNo 2 (ARWAL)');
  } else {
    if (!arwal.dmoName.includes('ARWAL')) errors.push(`slNo 2 dmoName expected ARWAL, got ${arwal.dmoName}`);
    if (arwal.lessee.mineral !== 'SAND') errors.push(`slNo 2 lessee.mineral expected SAND, got ${arwal.lessee.mineral}`);
    if (arwal.lessee.passes !== 1839) errors.push(`slNo 2 lessee.passes expected 1839, got ${arwal.lessee.passes}`);
    if (Math.abs(arwal.lessee.dispatchedQty - 53386.07) > 0.01) {
      errors.push(`slNo 2 lessee.dispatchedQty expected ~53386.07, got ${arwal.lessee.dispatchedQty}`);
    }
  }

  const aurangabad3 = bySl.get(3);
  const aurangabad4 = bySl.get(4);
  if (!aurangabad3 || !aurangabad4) {
    errors.push('Missing slNo 3 or 4 (AURANGABAD)');
  } else {
    if (!aurangabad3.dmoName.includes('AURANGABAD')) {
      errors.push(`slNo 3 dmoName expected AURANGABAD, got ${aurangabad3.dmoName}`);
    }
    if (!aurangabad4.dmoName.includes('AURANGABAD')) {
      errors.push(`slNo 4 dmoName expected inherited AURANGABAD, got ${aurangabad4.dmoName}`);
    }
    if (aurangabad3.dealer.mineral !== 'STONE') {
      errors.push(`slNo 3 dealer.mineral expected STONE, got ${aurangabad3.dealer.mineral}`);
    }
    if (aurangabad4.dealer.mineral !== 'SAND') {
      errors.push(`slNo 4 dealer.mineral expected SAND, got ${aurangabad4.dealer.mineral}`);
    }
  }

  const darbhanga10 = bySl.get(10);
  if (!darbhanga10) {
    errors.push('Missing slNo 10 (DARBHANGA)');
  } else if (!darbhanga10.dmoName.includes('DARBHANGA')) {
    errors.push(`slNo 10 dmoName expected DARBHANGA, got ${darbhanga10.dmoName}`);
  }

  if (meta.rowCount < 10) {
    errors.push(`Expected at least 10 rows, got ${meta.rowCount}`);
  }

  return { ok: errors.length === 0, errors };
}
