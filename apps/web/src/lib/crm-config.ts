import { apiFetch } from '@/lib/api';
import type { CrmConfigPatch, CrmConfigResponse } from '@/lib/crm-config-types';

export {
  CRM_CONFIG_QUERY_KEY,
  crmConfigToExpiryDefaults,
  FALLBACK_CRM_EXPIRY_DAYS,
} from '@/lib/crm-config-types';
export type { CrmConfigDto, CrmConfigPatch, CrmConfigResponse } from '@/lib/crm-config-types';

export function fetchCrmConfig() {
  return apiFetch<CrmConfigResponse>('/crm/config');
}

export function patchCrmConfig(patch: CrmConfigPatch) {
  return apiFetch<CrmConfigResponse>('/crm/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}
