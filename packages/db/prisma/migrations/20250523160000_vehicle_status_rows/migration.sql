-- CreateTable
CREATE TABLE "processed"."EpassVehicleStatusRow" (
    "id" TEXT NOT NULL,
    "vehicleRegNo" TEXT NOT NULL,
    "ksRegNo" TEXT,
    "vehicleClass" TEXT,
    "rcFitUpTo" TEXT,
    "rcTaxUpTo" TEXT,
    "insuranceUpTo" TEXT,
    "puccUpTo" TEXT,
    "imeiNo" TEXT,
    "esimValidity" TEXT,
    "grossWeightMt" DECIMAL(18,7),
    "unladenWeightMt" DECIMAL(18,7),
    "found" BOOLEAN NOT NULL DEFAULT true,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpassVehicleStatusRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EpassVehicleStatusRow_vehicleRegNo_key" ON "processed"."EpassVehicleStatusRow"("vehicleRegNo");

-- CreateIndex
CREATE INDEX "EpassVehicleStatusRow_ksRegNo_idx" ON "processed"."EpassVehicleStatusRow"("ksRegNo");
