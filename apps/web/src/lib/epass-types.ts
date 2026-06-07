export interface EpassSnapshotDto {
  id: string;
  reportDate: string;
  reportGeneratedOn: string;
  scrapedAt: string;
  rowCount: number;
  jobId: string | null;
}

export type OperatorType = 'lessee' | 'dealer';

export type OperatorTypeFilter = OperatorType | 'all';

/** @deprecated Use OperatorTypeFilter */
export type DistrictOperatorFilter = OperatorTypeFilter;

export interface OperatorSlotStats {
  mineral: string | null;
  users: number;
  passes: number;
  dispatchedQty: number;
  passDetailUrl: string | null;
}

export interface EpassDistrictRowDto {
  id: string;
  snapshotId: string;
  slNo: number;
  dmoName: string;
  dmoId: string | null;
  operators: {
    lessee: OperatorSlotStats;
    dealer: OperatorSlotStats;
  };
  lesseeMineral: string | null;
  lesseeUsers: number;
  lesseePasses: number;
  lesseeDispatchedQty: number;
  dealerMineral: string | null;
  dealerUsers: number;
  dealerPasses: number;
  dealerDispatchedQty: number;
  totalUsers: number;
  totalPasses: number;
  lesseeMineralId: string | null;
  dealerMineralId: string | null;
  lesseePassDetailUrl: string | null;
  dealerPassDetailUrl: string | null;
  lesseeConsignerScrapeStatus?: ConsignerScrapeStatus;
  dealerConsignerScrapeStatus?: ConsignerScrapeStatus;
}

export type ConsignerScrapeStatus = 'pending' | 'partial' | 'complete' | 'n/a';

export interface EpassConsignerRowDto {
  id: string;
  districtRowId: string;
  snapshotId: string;
  operatorType: OperatorType;
  /** @deprecated Use operatorType */
  role?: OperatorType;
  slNo: number;
  consignerName: string;
  mineral: string | null;
  mineralType: string | null;
  challanCount: number;
  challanDetailUrl: string | null;
  scrapedAt: string;
  challanLineCount: number;
  ghatNumber: string | null;
  ghatChallanId: string | null;
}

export interface EpassChallanRowDto {
  id: string;
  consignerRowId: string;
  slNo: number;
  reportDate: string;
  consigneeName: string;
  mineral: string | null;
  mineralCategory: string | null;
  challanCount: number;
  storedPassCount?: number;
  scrapeComplete?: boolean;
  dispatchedQty: number;
  unit: string | null;
  ghatNumber: string | null;
  operatorType: OperatorType | null;
  detailUrl: string | null;
  scrapedAt: string;
}

export interface EpassBrowseFilterValues {
  operator: OperatorTypeFilter;
  minerals: string[];
  dateMode: import('@/lib/epass-report-date').EpassDateMode;
  dateFrom: string;
  dateTo: string;
  reportDate: string;
  snapshotId: string;
  reportScope?: 'all' | 'specific';
  districts: string[];
  consignerSearch: string;
  hideZeroChallans: boolean;
  consigneeSearch: string;
  hideZeroPasses: boolean;
  consignerRowId: string;
  destination: string;
  challanSearch: string;
}

export type ConsigneeSortKey = 'date' | 'consignee' | 'mineral' | 'passes' | 'qty' | 'slNo';

export type ConsigneeSortDir = 'asc' | 'desc';

export interface ConsigneeViewFilters {
  consigneeSearch?: string;
  hideZeroPasses?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface DistrictConsignersResponse {
  districtRow: EpassDistrictRowDto;
  snapshot: { reportDate: string; reportGeneratedOn: string };
  operatorType: OperatorType;
  /** @deprecated Use operatorType */
  role?: OperatorType;
  items: EpassConsignerRowDto[];
}

export interface ConsignerChallansResponse {
  consigner: EpassConsignerRowDto;
  districtRow: { dmoName: string; slNo: number };
  snapshot: { reportDate: string };
  truncated?: boolean;
  incompleteScrape?: boolean;
  items: EpassChallanRowDto[];
}

export interface LatestEpassResponse {
  snapshot: EpassSnapshotDto | null;
  rows: EpassDistrictRowDto[];
}

export interface EpassSnapshotListItemDto {
  id: string;
  reportDate: string;
  reportGeneratedOn: string;
  scrapedAt: string;
  rowCount: number;
  jobId: string | null;
}

export interface EpassSnapshotListResponse {
  items: EpassSnapshotListItemDto[];
}

export interface EpassSnapshotReportDateItemDto {
  id: string;
  reportDate: string;
  scrapedAt: string;
  sourceUrl: string | null;
}

export interface EpassSnapshotReportDatesResponse {
  items: EpassSnapshotReportDateItemDto[];
}

export interface SnapshotDistrictRowsResponse {
  snapshot: EpassSnapshotDto;
  rows: EpassDistrictRowDto[];
}

export interface EpassAllScopeMeta {
  entityCount?: number;
  snapshotCount: number;
  totalSnapshotCount?: number;
  snapshotsTruncated?: boolean;
}

export interface DistrictRowsBrowseResponse {
  snapshot: null;
  reportScope: 'all';
  entityCount?: number;
  snapshotCount: number;
  totalSnapshotCount?: number;
  snapshotsTruncated?: boolean;
  latestScrapedAt: string | null;
  rows: EpassDistrictRowDto[];
}

export type DistrictSortKey = 'district' | 'totalUsers' | 'mineral' | 'passes' | 'quantity';

export type DistrictSortDir = 'asc' | 'desc';

export interface DistrictFlatRow {
  district: string;
  slNo: number;
  districtRowIds: string[];
  totalUsers: number;
  mineralLabel: string;
  minerals: string[];
  passes: number;
  quantity: number;
  scrapeStatus?: ConsignerScrapeStatus;
}

export interface DistrictViewFilters {
  minerals?: string[];
  districts?: string[];
  hideZeroPasses?: boolean;
}

export interface EpassConsignerListItemDto extends EpassConsignerRowDto {
  dmoName: string;
  districtSlNo: number;
}

export interface ConsignerListResponse {
  snapshot: { id: string; reportDate: string; scrapedAt: string } | null;
  reportScope?: 'all';
  entityCount?: number;
  snapshotCount?: number;
  totalSnapshotCount?: number;
  snapshotsTruncated?: boolean;
  latestScrapedAt?: string | null;
  total: number;
  limit: number;
  offset: number;
  items: EpassConsignerListItemDto[];
}

export interface ConsignerOptionDto {
  id: string;
  consignerName: string;
  dmoName: string;
  operatorType: OperatorType;
  /** @deprecated Use operatorType */
  role?: OperatorType;
  challanCount: number;
  challanLineCount: number;
  ghatNumber?: string | null;
}

export interface ConsignerOptionsResponse {
  snapshot: { id: string; reportDate: string; scrapedAt: string } | null;
  items: ConsignerOptionDto[];
}

export interface ConsignerOptionsParams {
  snapshotId?: string;
  reportScope?: 'all';
  dateMode?: 'specific' | 'range';
  dateFrom?: string;
  dateTo?: string;
  operator?: OperatorType;
  /** @deprecated Use operator */
  role?: OperatorType;
  district?: string;
  mineral?: string;
  consigner?: string;
  hideZeroChallans?: boolean;
}

export interface ConsignerChallansParams {
  snapshotId?: string;
  reportScope?: 'all';
  dateMode?: 'specific' | 'range';
  dateFrom?: string;
  dateTo?: string;
  consignee?: string;
  hideZeroPasses?: boolean;
}

export type ConsignerSortKey =
  | 'district'
  | 'consigner'
  | 'mineral'
  | 'operator'
  | 'role'
  | 'challans'
  | 'slNo';

export type ConsignerSortDir = 'asc' | 'desc';

export interface ConsignerViewFilters {
  minerals?: string[];
  districts?: string[];
  hideZeroChallans?: boolean;
  consignerSearch?: string;
}

export interface ConsignerListParams {
  snapshotId?: string;
  reportScope?: 'all';
  operator?: OperatorType;
  /** @deprecated Use operator */
  role?: OperatorType;
  dmo?: string;
  district?: string;
  mineral?: string;
  consigner?: string;
  hideZeroChallans?: boolean;
  sort?: ConsignerSortKey;
  dir?: ConsignerSortDir;
  limit?: number;
  offset?: number;
}

export interface ConsignerDistrictGroup {
  key: string;
  dmoName: string;
  operatorType: OperatorType;
  districtSlNo: number;
  rows: EpassConsignerListItemDto[];
}

export interface EpassChallanPassDto {
  id: string;
  challanRowId: string;
  slNo: number;
  consigneeName: string;
  challanNo: string;
  portalPassId: string | null;
  mineral: string | null;
  mineralCategory: string | null;
  vehicleRegNo: string | null;
  destination: string | null;
  transportedDate: string | null;
  quantity: number;
  unit: string | null;
  checkStatus: string | null;
  portalChallanUrl: string | null;
  scrapedAt: string;
}

export interface ChalaanPassesResponse {
  challan: EpassChallanRowDto;
  snapshot: { id: string; reportDate: string; scrapedAt: string } | null;
  items: EpassChallanPassDto[];
}

export interface EpassChalaanListItemDto extends EpassChallanRowDto {
  consignerName: string;
  operatorType: OperatorType;
  /** @deprecated Use operatorType */
  role?: OperatorType;
  dmoName: string;
  districtSlNo: number;
}

export interface EpassChalaanPassListItemDto extends EpassChallanPassDto {
  consignerRowId: string;
  consignerName: string;
  operatorType: OperatorType;
  /** @deprecated Use operatorType */
  role?: OperatorType;
  dmoName: string;
  summaryDetailUrl: string | null;
}

export interface ChalaanListResponse {
  snapshot: { id: string; reportDate: string; scrapedAt: string } | null;
  total: number;
  limit: number;
  offset: number;
  items: EpassChalaanListItemDto[];
}

export interface ChalaanPassListResponse {
  snapshot: { id: string; reportDate: string; scrapedAt: string } | null;
  reportScope?: 'range' | 'all';
  entityCount?: number;
  snapshotCount?: number;
  totalSnapshotCount?: number;
  snapshotsTruncated?: boolean;
  latestScrapedAt?: string | null;
  total: number;
  totalQuantity?: number;
  truncated?: boolean;
  portalPassTotal?: number | null;
  incompleteScrape?: boolean;
  limit: number;
  offset: number;
  items: EpassChalaanPassListItemDto[];
}

export type ChalaanSortKey =
  | 'consignee'
  | 'challanNo'
  | 'mineral'
  | 'vehicle'
  | 'destination'
  | 'date'
  | 'qty'
  | 'status'
  | 'slNo';

export type ChalaanSortDir = 'asc' | 'desc';

export interface ChalaanListParams {
  snapshotId?: string;
  reportScope?: 'all';
  dateMode?: 'specific' | 'range';
  dateFrom?: string;
  dateTo?: string;
  operator?: OperatorType;
  district?: string;
  dmo?: string;
  mineral?: string;
  consigner?: string;
  consignee?: string;
  destination?: string;
  challan?: string;
  hideZeroPasses?: boolean;
  sort?: ChalaanSortKey;
  dir?: ChalaanSortDir;
  limit?: number;
  offset?: number;
}

export interface MineralRoleStats {
  users: number;
  passes: number;
  dispatchedQty: number;
}

export interface MineralAggregateRow {
  mineral: string;
  lessee: MineralRoleStats;
  dealer: MineralRoleStats;
  totalPasses: number;
}

export interface EpassVehicleStatusListItemDto {
  id: string;
  vehicleRegNo: string;
  ksRegNo: string | null;
  vehicleClass: string | null;
  rcFitUpTo: string | null;
  rcTaxUpTo: string | null;
  insuranceUpTo: string | null;
  puccUpTo: string | null;
  imeiNo: string | null;
  esimValidity: string | null;
  grossWeightMt: number | null;
  unladenWeightMt: number | null;
  found: boolean;
  insuranceDaysLeft: number | null;
  rcDaysLeft: number | null;
  fitnessDaysLeft: number | null;
  scrapedAt: string;
  inCrm?: boolean;
}

export interface VehicleStatusStatsDto {
  total: number;
  found: number;
  notFound: number;
  lastScrapedAt: string | null;
}

export interface VehicleStatusListResponse {
  total: number;
  limit: number;
  offset: number;
  items: EpassVehicleStatusListItemDto[];
  stats: VehicleStatusStatsDto;
}

export type VehicleStatusFoundFilter = 'all' | 'found' | 'notFound';

export interface VehicleStatusFilterValues {
  search: string;
  found: VehicleStatusFoundFilter;
  insuranceExpiryDays: string;
  rcExpiryDays: string;
  fitnessExpiryDays: string;
  grossWeightMin: string;
  grossWeightMax: string;
  vehicleClass: string;
  esimValidity: string;
}

export type VehicleStatusSortKey =
  | 'serialNo'
  | 'vehicleRegNo'
  | 'ksRegNo'
  | 'vehicleClass'
  | 'rcFitUpTo'
  | 'rcTaxUpTo'
  | 'insuranceUpTo'
  | 'puccUpTo'
  | 'imeiNo'
  | 'esimValidity'
  | 'insuranceDaysLeft'
  | 'rcDaysLeft'
  | 'fitnessDaysLeft'
  | 'grossWeightMt'
  | 'unladenWeightMt'
  | 'scrapedAt';

export type VehicleStatusSortDir = 'asc' | 'desc';

export interface VehicleStatusListParams {
  q?: string;
  found?: boolean;
  insuranceExpiryDays?: number;
  rcExpiryDays?: number;
  fitnessExpiryDays?: number;
  grossWeightMin?: number;
  grossWeightMax?: number;
  vehicleClass?: string;
  esimValidity?: string;
  sort?: VehicleStatusSortKey;
  dir?: VehicleStatusSortDir;
  limit?: number;
  offset?: number;
  includeCrm?: boolean;
}

export interface VehicleStatusScrapeMissingResponse {
  passRowsWithVehicle: number;
  existingStatusRows: number;
  limit: number | null;
  enqueued: number;
  skipped?: boolean;
  skippedExisting?: number;
}

export type McvPortalStatus = 'on_portal' | 'no_portal_data' | 'not_checked';

export interface VehicleDataListItemDto {
  vehicleRegNo: string;
  passCount: number;
  totalQuantity: number | null;
  quantityByUnit: Record<string, number>;
  minerals: string[];
  dmoNames: string[];
  consignerNames: string[];
  destinations: string[];
  lastTransportedDate: string | null;
  lastScrapedAt: string | null;
  /** True when MCV scrape found this VRN on the portal (`mcvPortalStatus === 'on_portal'`). */
  hasVehicleStatus: boolean;
  mcvPortalStatus: McvPortalStatus;
  grossWeightMt: number | null;
  unladenWeightMt: number | null;
}

export interface VehicleDataListResponse {
  snapshot: { id: string; reportDate: string; scrapedAt: string } | null;
  reportScope?: 'all';
  snapshotCount?: number;
  totalSnapshotCount?: number;
  snapshotsTruncated?: boolean;
  total: number;
  limit: number;
  offset: number;
  items: VehicleDataListItemDto[];
}

export interface EpassFilterOptionsResponse {
  districts: string[];
  minerals: string[];
  latestScrapedAt: string | null;
  entityCount?: number;
  snapshotCount?: number;
  totalSnapshotCount?: number;
  snapshotsTruncated?: boolean;
}

export interface VehicleStatusEnqueueResponse {
  vehicleRegNo: string;
  enqueued: number;
  skipped?: boolean;
  skippedExisting?: number;
}

export interface VehicleDataDetailResponse {
  vehicleRegNo: string;
  snapshot: { id: string; reportDate: string; scrapedAt: string } | null;
  reportScope?: 'all';
  summary: VehicleDataListItemDto | null;
  passes: EpassChalaanPassListItemDto[];
  vehicleStatus: EpassVehicleStatusListItemDto | null;
}

export type VehicleDataSortKey =
  | 'vehicle'
  | 'passes'
  | 'qty'
  | 'lastDate'
  | 'grossWeight'
  | 'unladen';

export type VehicleDataSortDir = 'asc' | 'desc';

export interface VehicleDataListParams {
  snapshotId?: string;
  reportScope?: 'all';
  dateMode?: 'specific' | 'range';
  dateFrom?: string;
  dateTo?: string;
  operator?: OperatorType;
  district?: string;
  dmo?: string;
  mineral?: string;
  consigner?: string;
  consignee?: string;
  hideZeroPasses?: boolean;
  portalStatus?: McvPortalStatus;
  q?: string;
  sort?: VehicleDataSortKey;
  dir?: VehicleDataSortDir;
  limit?: number;
  offset?: number;
}

export interface VehicleDataFilterValues {
  epass: EpassBrowseFilterValues;
  vehicleSearch: string;
  reportScope: 'all' | 'specific';
  portalStatus: McvPortalStatus | 'all';
}
