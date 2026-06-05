import type { CrmConfigDto, CrmConfigPatch } from '@vahanplus/contracts';

export type { CrmConfigDto, CrmConfigPatch };

export interface CrmConfigResponse {
  config: CrmConfigDto;
  configVersion?: number;
}

export const CRM_CONFIG_QUERY_KEY = ['crm', 'config'] as const;

export interface CrmExpiryThresholdDefaults {
  insuranceExpiryDays: string;
  rcExpiryDays: string;
  fitnessExpiryDays: string;
}

export const FALLBACK_CRM_EXPIRY_DAYS = '30';

export function crmConfigToExpiryDefaults(
  config: CrmConfigDto | undefined,
): CrmExpiryThresholdDefaults {
  return {
    insuranceExpiryDays: String(config?.insuranceExpiryDays ?? FALLBACK_CRM_EXPIRY_DAYS),
    rcExpiryDays: String(config?.rcExpiryDays ?? FALLBACK_CRM_EXPIRY_DAYS),
    fitnessExpiryDays: String(config?.fitnessExpiryDays ?? FALLBACK_CRM_EXPIRY_DAYS),
  };
}
