-- AlterEnum
ALTER TYPE "ingest"."ScrapeType" ADD VALUE 'bihar_epass';

-- CreateTable
CREATE TABLE "processed"."EpassSnapshot" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "reportGeneratedOn" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpassSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed"."EpassDistrictRow" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "dmoName" TEXT NOT NULL,
    "dmoId" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpassDistrictRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpassSnapshot_reportDate_idx" ON "processed"."EpassSnapshot"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "EpassSnapshot_reportDate_scrapedAt_key" ON "processed"."EpassSnapshot"("reportDate", "scrapedAt");

-- CreateIndex
CREATE INDEX "EpassDistrictRow_dmoName_idx" ON "processed"."EpassDistrictRow"("dmoName");

-- CreateIndex
CREATE UNIQUE INDEX "EpassDistrictRow_snapshotId_slNo_key" ON "processed"."EpassDistrictRow"("snapshotId", "slNo");

-- AddForeignKey
ALTER TABLE "processed"."EpassDistrictRow" ADD CONSTRAINT "EpassDistrictRow_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "processed"."EpassSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
