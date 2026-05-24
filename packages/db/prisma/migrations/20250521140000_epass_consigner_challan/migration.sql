-- AlterEnum
ALTER TYPE "ingest"."ScrapeType" ADD VALUE 'bihar_epass_consigner';
ALTER TYPE "ingest"."ScrapeType" ADD VALUE 'bihar_epass_challan';

-- CreateEnum
CREATE TYPE "processed"."EpassSourceRole" AS ENUM ('lessee', 'dealer');

-- AlterTable
ALTER TABLE "processed"."EpassDistrictRow" ADD COLUMN "lesseePassDetailUrl" TEXT,
ADD COLUMN "dealerPassDetailUrl" TEXT;

-- CreateTable
CREATE TABLE "processed"."EpassConsignerRow" (
    "id" TEXT NOT NULL,
    "districtRowId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "role" "processed"."EpassSourceRole" NOT NULL,
    "slNo" INTEGER NOT NULL,
    "consignerName" TEXT NOT NULL,
    "mineral" TEXT,
    "mineralType" TEXT,
    "challanCount" INTEGER NOT NULL,
    "challanDetailUrl" TEXT,
    "leaseId" TEXT,
    "mineralId" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpassConsignerRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed"."EpassChallanRow" (
    "id" TEXT NOT NULL,
    "consignerRowId" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "consigneeName" TEXT NOT NULL,
    "mineral" TEXT,
    "mineralCategory" TEXT,
    "challanCount" INTEGER NOT NULL,
    "dispatchedQty" DECIMAL(18,3) NOT NULL,
    "unit" TEXT,
    "detailUrl" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpassChallanRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpassConsignerRow_snapshotId_idx" ON "processed"."EpassConsignerRow"("snapshotId");

-- CreateIndex
CREATE INDEX "EpassConsignerRow_consignerName_idx" ON "processed"."EpassConsignerRow"("consignerName");

-- CreateIndex
CREATE UNIQUE INDEX "EpassConsignerRow_districtRowId_role_slNo_key" ON "processed"."EpassConsignerRow"("districtRowId", "role", "slNo");

-- CreateIndex
CREATE INDEX "EpassChallanRow_consigneeName_idx" ON "processed"."EpassChallanRow"("consigneeName");

-- CreateIndex
CREATE UNIQUE INDEX "EpassChallanRow_consignerRowId_slNo_key" ON "processed"."EpassChallanRow"("consignerRowId", "slNo");

-- AddForeignKey
ALTER TABLE "processed"."EpassConsignerRow" ADD CONSTRAINT "EpassConsignerRow_districtRowId_fkey" FOREIGN KEY ("districtRowId") REFERENCES "processed"."EpassDistrictRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed"."EpassChallanRow" ADD CONSTRAINT "EpassChallanRow_consignerRowId_fkey" FOREIGN KEY ("consignerRowId") REFERENCES "processed"."EpassConsignerRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
