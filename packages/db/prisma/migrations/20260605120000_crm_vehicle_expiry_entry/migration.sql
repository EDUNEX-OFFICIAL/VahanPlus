-- CreateTable
CREATE TABLE "processed"."CrmVehicleExpiryEntry" (
    "id" TEXT NOT NULL,
    "vehicleRegNo" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "addedByUsername" TEXT,
    "removedByUsername" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmVehicleExpiryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmVehicleExpiryEntry_vehicleRegNo_key" ON "processed"."CrmVehicleExpiryEntry"("vehicleRegNo");

-- CreateIndex
CREATE INDEX "CrmVehicleExpiryEntry_status_idx" ON "processed"."CrmVehicleExpiryEntry"("status");
