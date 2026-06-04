-- AlterEnum
ALTER TYPE "ingest"."ScrapeType" ADD VALUE 'khanan_bulk_import';
ALTER TYPE "ingest"."ScrapeType" ADD VALUE 'khanan_bulk_export';

-- CreateTable
CREATE TABLE "ingest"."KhananImportBatch" (
    "id" TEXT NOT NULL,
    "status" "ingest"."JobStatus" NOT NULL DEFAULT 'pending',
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "totalBytes" BIGINT,
    "bytesReceived" BIGINT NOT NULL DEFAULT 0,
    "chunkSize" INTEGER NOT NULL DEFAULT 16777216,
    "expectedChunks" INTEGER,
    "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "passesImported" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "options" JSONB,
    "scrapeJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhananImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest"."KhananExportJob" (
    "id" TEXT NOT NULL,
    "status" "ingest"."JobStatus" NOT NULL DEFAULT 'pending',
    "storagePath" TEXT,
    "fileName" TEXT,
    "filters" JSONB,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "scrapeJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhananExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KhananImportBatch_status_idx" ON "ingest"."KhananImportBatch"("status");

-- CreateIndex
CREATE INDEX "KhananExportJob_status_idx" ON "ingest"."KhananExportJob"("status");
