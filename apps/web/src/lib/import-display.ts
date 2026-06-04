import type { ImportDetectedType } from '@/lib/epass-import';
import type { ChipTone } from '@/components/ui/Chip';

export function importTypeLabel(type: ImportDetectedType | null | undefined): string {
  switch (type) {
    case 'district_snapshot':
      return 'District snapshot';
    case 'khanan_pass':
      return 'Khanan pass';
    case 'vehicle_status':
      return 'Vehicle status';
    default:
      return 'Unknown';
  }
}

export function importTypeChipTone(type: ImportDetectedType | null | undefined): ChipTone {
  switch (type) {
    case 'district_snapshot':
      return 'cyan';
    case 'khanan_pass':
      return 'indigo';
    case 'vehicle_status':
      return 'emerald';
    default:
      return 'default';
  }
}
