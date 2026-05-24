-- CreateTable
CREATE TABLE "processed"."EpassChallanPassRow" (
    "id" TEXT NOT NULL,
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
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpassChallanPassRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpassChallanPassRow_challanNo_idx" ON "processed"."EpassChallanPassRow"("challanNo");

-- CreateIndex
CREATE INDEX "EpassChallanPassRow_vehicleRegNo_idx" ON "processed"."EpassChallanPassRow"("vehicleRegNo");

-- CreateIndex
CREATE UNIQUE INDEX "EpassChallanPassRow_challanRowId_slNo_key" ON "processed"."EpassChallanPassRow"("challanRowId", "slNo");

-- AddForeignKey
ALTER TABLE "processed"."EpassChallanPassRow" ADD CONSTRAINT "EpassChallanPassRow_challanRowId_fkey" FOREIGN KEY ("challanRowId") REFERENCES "processed"."EpassChallanRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
