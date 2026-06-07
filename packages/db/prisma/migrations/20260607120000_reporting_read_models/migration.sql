-- CQRS reporting read models (summary tables + aggregation bookkeeping)

CREATE TABLE "processed"."ReportDistrictSummary" (
    "id" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "dmoName" TEXT NOT NULL,
    "dmoId" TEXT,
    "slNo" INTEGER NOT NULL,
    "lesseeMineral" TEXT,
    "lesseeUsers" INTEGER NOT NULL,
    "lesseePasses" INTEGER NOT NULL,
    "lesseeDispatchedQty" DECIMAL(18,3) NOT NULL,
    "dealerMineral" TEXT,
    "dealerUsers" INTEGER NOT NULL,
    "dealerPasses" INTEGER NOT NULL,
    "dealerDispatchedQty" DECIMAL(18,3) NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "totalPasses" INTEGER NOT NULL,
    "lesseeMineralId" TEXT,
    "dealerMineralId" TEXT,
    "lesseePassDetailUrl" TEXT,
    "dealerPassDetailUrl" TEXT,
    "lastSnapshotId" TEXT NOT NULL,
    "lastReportDate" TEXT NOT NULL,
    "lastScrapedAt" TIMESTAMP(3) NOT NULL,
    "sourceRowId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDistrictSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportDistrictSummary_entityKey_key" ON "processed"."ReportDistrictSummary"("entityKey");
CREATE INDEX "ReportDistrictSummary_lastReportDate_dmoName_idx" ON "processed"."ReportDistrictSummary"("lastReportDate", "dmoName");
CREATE INDEX "ReportDistrictSummary_totalPasses_idx" ON "processed"."ReportDistrictSummary"("totalPasses");
CREATE INDEX "ReportDistrictSummary_lesseeMineral_idx" ON "processed"."ReportDistrictSummary"("lesseeMineral");
CREATE INDEX "ReportDistrictSummary_dealerMineral_idx" ON "processed"."ReportDistrictSummary"("dealerMineral");

CREATE TABLE "processed"."ReportMineralSummary" (
    "id" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "mineral" TEXT NOT NULL,
    "operatorRole" "processed"."OperatorType" NOT NULL,
    "users" INTEGER NOT NULL,
    "passes" INTEGER NOT NULL,
    "dispatchedQty" DECIMAL(18,3) NOT NULL,
    "totalPasses" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportMineralSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportMineralSummary_entityKey_key" ON "processed"."ReportMineralSummary"("entityKey");
CREATE INDEX "ReportMineralSummary_passes_idx" ON "processed"."ReportMineralSummary"("passes");
CREATE INDEX "ReportMineralSummary_mineral_idx" ON "processed"."ReportMineralSummary"("mineral");

CREATE TABLE "processed"."ReportConsignerSummary" (
    "id" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "dmoName" TEXT NOT NULL,
    "operatorType" "processed"."OperatorType" NOT NULL,
    "consignerName" TEXT NOT NULL,
    "mineral" TEXT,
    "mineralType" TEXT,
    "slNo" INTEGER NOT NULL,
    "challanCount" INTEGER NOT NULL,
    "challanLineCount" INTEGER NOT NULL DEFAULT 0,
    "ghatNumber" TEXT,
    "challanDetailUrl" TEXT,
    "districtRowId" TEXT NOT NULL,
    "districtSlNo" INTEGER NOT NULL,
    "lastSnapshotId" TEXT NOT NULL,
    "lastReportDate" TEXT NOT NULL,
    "lastScrapedAt" TIMESTAMP(3) NOT NULL,
    "sourceRowId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportConsignerSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportConsignerSummary_entityKey_key" ON "processed"."ReportConsignerSummary"("entityKey");
CREATE INDEX "ReportConsignerSummary_dmoName_operatorType_consignerName_idx" ON "processed"."ReportConsignerSummary"("dmoName", "operatorType", "consignerName");
CREATE INDEX "ReportConsignerSummary_challanCount_idx" ON "processed"."ReportConsignerSummary"("challanCount");
CREATE INDEX "ReportConsignerSummary_lastScrapedAt_idx" ON "processed"."ReportConsignerSummary"("lastScrapedAt");

CREATE TABLE "processed"."ReportConsigneeSummary" (
    "id" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "consigneeName" TEXT NOT NULL,
    "mineral" TEXT,
    "mineralCategory" TEXT,
    "slNo" INTEGER NOT NULL,
    "challanCount" INTEGER NOT NULL,
    "dispatchedQty" DECIMAL(18,3) NOT NULL,
    "unit" TEXT,
    "ghatNumber" TEXT,
    "dmoName" TEXT NOT NULL,
    "operatorType" "processed"."OperatorType" NOT NULL,
    "consignerName" TEXT NOT NULL,
    "consignerRowId" TEXT NOT NULL,
    "lastSnapshotId" TEXT NOT NULL,
    "lastReportDate" TEXT NOT NULL,
    "lastScrapedAt" TIMESTAMP(3) NOT NULL,
    "sourceRowId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportConsigneeSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportConsigneeSummary_entityKey_key" ON "processed"."ReportConsigneeSummary"("entityKey");
CREATE INDEX "ReportConsigneeSummary_consigneeName_idx" ON "processed"."ReportConsigneeSummary"("consigneeName");
CREATE INDEX "ReportConsigneeSummary_dmoName_idx" ON "processed"."ReportConsigneeSummary"("dmoName");
CREATE INDEX "ReportConsigneeSummary_lastReportDate_idx" ON "processed"."ReportConsigneeSummary"("lastReportDate");

CREATE TABLE "processed"."ReportChallanPassSummary" (
    "id" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "challanRowId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "consigneeName" TEXT NOT NULL,
    "challanNo" TEXT NOT NULL,
    "portalPassId" TEXT,
    "mineral" TEXT,
    "mineralCategory" TEXT,
    "vehicleRegNo" TEXT,
    "destination" TEXT,
    "transportedDate" TEXT,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT,
    "checkStatus" TEXT,
    "portalChallanUrl" TEXT,
    "dmoName" TEXT NOT NULL,
    "operatorType" "processed"."OperatorType" NOT NULL,
    "consignerName" TEXT NOT NULL,
    "consignerRowId" TEXT NOT NULL,
    "lastSnapshotId" TEXT NOT NULL,
    "lastReportDate" TEXT NOT NULL,
    "lastScrapedAt" TIMESTAMP(3) NOT NULL,
    "sourceRowId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportChallanPassSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportChallanPassSummary_entityKey_key" ON "processed"."ReportChallanPassSummary"("entityKey");
CREATE INDEX "ReportChallanPassSummary_lastReportDate_idx" ON "processed"."ReportChallanPassSummary"("lastReportDate");
CREATE INDEX "ReportChallanPassSummary_consigneeName_idx" ON "processed"."ReportChallanPassSummary"("consigneeName");
CREATE INDEX "ReportChallanPassSummary_vehicleRegNo_idx" ON "processed"."ReportChallanPassSummary"("vehicleRegNo");
CREATE INDEX "ReportChallanPassSummary_challanNo_idx" ON "processed"."ReportChallanPassSummary"("challanNo");
CREATE INDEX "ReportChallanPassSummary_lastScrapedAt_idx" ON "processed"."ReportChallanPassSummary"("lastScrapedAt");

CREATE TABLE "processed"."ReportVehiclePassSummary" (
    "id" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "vehicleRegNo" TEXT NOT NULL,
    "passCount" INTEGER NOT NULL,
    "totalQuantity" DECIMAL(18,3) NOT NULL,
    "quantityByUnit" JSONB NOT NULL,
    "minerals" TEXT[],
    "dmoNames" TEXT[],
    "consignerNames" TEXT[],
    "destinations" TEXT[],
    "lastTransportedDate" TEXT,
    "lastScrapedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportVehiclePassSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportVehiclePassSummary_entityKey_key" ON "processed"."ReportVehiclePassSummary"("entityKey");
CREATE INDEX "ReportVehiclePassSummary_passCount_idx" ON "processed"."ReportVehiclePassSummary"("passCount");
CREATE INDEX "ReportVehiclePassSummary_lastTransportedDate_idx" ON "processed"."ReportVehiclePassSummary"("lastTransportedDate");
CREATE INDEX "ReportVehiclePassSummary_vehicleRegNo_idx" ON "processed"."ReportVehiclePassSummary"("vehicleRegNo");

CREATE TABLE "processed"."ReportDistrictContribution" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,

    CONSTRAINT "ReportDistrictContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportDistrictContribution_snapshotId_entityKey_key" ON "processed"."ReportDistrictContribution"("snapshotId", "entityKey");
CREATE INDEX "ReportDistrictContribution_entityKey_idx" ON "processed"."ReportDistrictContribution"("entityKey");

CREATE TABLE "processed"."ReportPassContribution" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "vehicleRegNo" TEXT,
    "quantity" DECIMAL(18,3),

    CONSTRAINT "ReportPassContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportPassContribution_snapshotId_entityKey_key" ON "processed"."ReportPassContribution"("snapshotId", "entityKey");
CREATE INDEX "ReportPassContribution_vehicleRegNo_idx" ON "processed"."ReportPassContribution"("vehicleRegNo");
CREATE INDEX "ReportPassContribution_entityKey_idx" ON "processed"."ReportPassContribution"("entityKey");

CREATE TABLE "system"."ReportAggregateCheckpoint" (
    "id" TEXT NOT NULL,
    "aggregatorVersion" INTEGER NOT NULL DEFAULT 1,
    "lastSnapshotId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportAggregateCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingest"."ReportAggregateJob" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT,
    "jobVersion" INTEGER NOT NULL DEFAULT 1,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "durationMs" INTEGER,
    "entitiesUpdated" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportAggregateJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportAggregateJob_status_idx" ON "ingest"."ReportAggregateJob"("status");
CREATE INDEX "ReportAggregateJob_snapshotId_idx" ON "ingest"."ReportAggregateJob"("snapshotId");
