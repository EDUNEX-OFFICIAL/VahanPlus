import type { ChipTone } from '@/components/ui/Chip';

/** MCV portal scrape outcome for a VRN (Vehicle Data / detail). */
export type McvPortalStatus = 'on_portal' | 'no_portal_data' | 'not_checked';

export function mcvPortalStatusFromFound(found: boolean | undefined): McvPortalStatus {
  if (found === true) return 'on_portal';
  if (found === false) return 'no_portal_data';
  return 'not_checked';
}

export function mcvPortalStatusLabel(status: McvPortalStatus): string {
  switch (status) {
    case 'on_portal':
      return 'On portal';
    case 'no_portal_data':
      return 'No data on portal';
    case 'not_checked':
      return 'Not checked';
  }
}

export function mcvPortalStatusChipTone(status: McvPortalStatus): ChipTone {
  switch (status) {
    case 'on_portal':
      return 'cyan';
    case 'no_portal_data':
      return 'amber';
    case 'not_checked':
      return 'default';
  }
}

/** Matches warnings from {@link buildDuplicateVrnWarnings}. */
export const VRN_REPEAT_WARNING_MARK = 'appear on more than one row';
