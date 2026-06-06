import { z } from 'zod';

export const EpassDistrictRowSchema = z.object({
  slNo: z.number().int().positive(),
  dmoName: z.string().min(1),
  lessee: z.object({
    mineral: z.string().nullable(),
    users: z.number().int().nonnegative(),
    passes: z.number().int().nonnegative(),
    dispatchedQty: z.number().nonnegative(),
  }),
  dealer: z.object({
    mineral: z.string().nullable(),
    users: z.number().int().nonnegative(),
    passes: z.number().int().nonnegative(),
    dispatchedQty: z.number().nonnegative(),
  }),
  total: z.object({
    users: z.number().int().nonnegative(),
    passes: z.number().int().nonnegative(),
  }),
  dmoId: z.string().optional(),
  lesseeMineralId: z.string().optional(),
  dealerMineralId: z.string().optional(),
  lesseePassDetailUrl: z.string().url().nullable().optional(),
  dealerPassDetailUrl: z.string().url().nullable().optional(),
});

export const EpassConsignerRowSchema = z.object({
  slNo: z.number().int().positive(),
  consignerName: z.string().min(1),
  mineral: z.string().nullable(),
  mineralType: z.string().nullable(),
  challanCount: z.number().int().nonnegative(),
  challanDetailUrl: z.string().url().nullable().optional(),
  leaseId: z.string().optional(),
  mineralId: z.string().optional(),
});

export type EpassConsignerRow = z.infer<typeof EpassConsignerRowSchema>;

export const EpassChallanLineSchema = z.object({
  slNo: z.number().int().positive(),
  consigneeName: z.string().min(1),
  mineral: z.string().nullable(),
  mineralCategory: z.string().nullable(),
  challanCount: z.number().int().nonnegative(),
  dispatchedQty: z.number().nonnegative(),
  unit: z.string().nullable(),
  detailUrl: z.string().url().nullable().optional(),
});

export type EpassChallanLine = z.infer<typeof EpassChallanLineSchema>;

const PaginatedReportMetaSchema = z.object({
  portalTotal: z.number().int().nonnegative().nullable().optional(),
  complete: z.boolean().optional(),
  pagesFetched: z.number().int().positive().optional(),
});

export const EpassConsignerReportSchema = z.object({
  sourceUrl: z.string().url(),
  scrapedAt: z.string(),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(EpassConsignerRowSchema),
  ...PaginatedReportMetaSchema.shape,
});

export type EpassConsignerReport = z.infer<typeof EpassConsignerReportSchema>;

export const EpassChallanReportSchema = z.object({
  sourceUrl: z.string().url(),
  scrapedAt: z.string(),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(EpassChallanLineSchema),
  ...PaginatedReportMetaSchema.shape,
});

export type EpassChallanReport = z.infer<typeof EpassChallanReportSchema>;

export const EpassChallanPassLineSchema = z.object({
  slNo: z.number().int().positive(),
  consigneeName: z.string().min(1),
  challanNo: z.string().min(1),
  portalPassId: z.string().optional(),
  mineral: z.string().nullable(),
  mineralCategory: z.string().nullable(),
  vehicleRegNo: z.string().nullable(),
  destination: z.string().nullable(),
  transportedDate: z.string().nullable(),
  quantity: z.number().nonnegative(),
  unit: z.string().nullable(),
  checkStatus: z.string().nullable(),
  portalChallanUrl: z.string().url().nullable().optional(),
});

export type EpassChallanPassLine = z.infer<typeof EpassChallanPassLineSchema>;

export const EpassChallanPassReportSchema = z.object({
  sourceUrl: z.string().url(),
  scrapedAt: z.string(),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(EpassChallanPassLineSchema),
  ...PaginatedReportMetaSchema.shape,
});

export type EpassChallanPassReport = z.infer<typeof EpassChallanPassReportSchema>;

export const McvVehicleStatusLineSchema = z.object({
  ksRegNo: z.string().nullable(),
  vehicleRegNo: z.string().min(1),
  vehicleClass: z.string().nullable(),
  rcFitUpTo: z.string().nullable(),
  rcTaxUpTo: z.string().nullable(),
  insuranceUpTo: z.string().nullable(),
  puccUpTo: z.string().nullable(),
  imeiNo: z.string().nullable(),
  esimValidity: z.string().nullable(),
  grossWeightMt: z.number().nullable(),
  unladenWeightMt: z.number().nullable(),
});

export type McvVehicleStatusLine = z.infer<typeof McvVehicleStatusLineSchema>;

export const McvVehicleStatusReportSchema = z.object({
  sourceUrl: z.string().url(),
  scrapedAt: z.string(),
  vehicleRegNo: z.string().min(1),
  found: z.boolean(),
  row: McvVehicleStatusLineSchema.nullable(),
});

export type McvVehicleStatusReport = z.infer<typeof McvVehicleStatusReportSchema>;

export type EpassDistrictRow = z.infer<typeof EpassDistrictRowSchema>;

export const EpassReportMetaSchema = z.object({
  reportDate: z.string(),
  reportGeneratedOn: z.string(),
  sourceUrl: z.string().url(),
  scrapedAt: z.string(),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(EpassDistrictRowSchema),
});

export type EpassReportMeta = z.infer<typeof EpassReportMetaSchema>;

export const DEFAULT_REPORT_URL =
  'https://khanansoft.bihar.gov.in/portal/CitizenRpt/epassreportAllDist.aspx';

export interface FetchOptions {
  date?: string;
  timeoutMs?: number;
  retries?: number;
  postDelayMs?: number;
}

export interface ParseOptions {
  limit?: number;
  sourceUrl?: string;
}
