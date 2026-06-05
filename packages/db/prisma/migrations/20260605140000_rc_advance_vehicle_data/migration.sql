-- CreateTable
CREATE TABLE "processed"."RcAdvanceVehicleData" (
    "id" TEXT NOT NULL,
    "vehicleRegNo" TEXT NOT NULL,
    "statusCode" INTEGER,
    "message" TEXT,
    "txnId" TEXT,
    "billable" BOOLEAN,
    "result" JSONB,
    "rawResponse" JSONB,
    "flat" JSONB,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RcAdvanceVehicleData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RcAdvanceVehicleData_vehicleRegNo_key" ON "processed"."RcAdvanceVehicleData"("vehicleRegNo");

-- CreateIndex
CREATE INDEX "RcAdvanceVehicleData_fetchedAt_idx" ON "processed"."RcAdvanceVehicleData"("fetchedAt");
