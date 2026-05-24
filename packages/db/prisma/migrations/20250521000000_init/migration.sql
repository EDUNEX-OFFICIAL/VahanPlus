-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ingest";
CREATE SCHEMA IF NOT EXISTS "processed";
CREATE SCHEMA IF NOT EXISTS "system";

-- CreateEnum
CREATE TYPE "ingest"."JobStatus" AS ENUM ('pending', 'active', 'completed', 'failed');
CREATE TYPE "ingest"."ScrapeType" AS ENUM ('vehicle', 'khanan', 'health');

-- CreateTable
CREATE TABLE "system"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest"."ScrapeJob" (
    "id" TEXT NOT NULL,
    "type" "ingest"."ScrapeType" NOT NULL,
    "target" TEXT NOT NULL,
    "status" "ingest"."JobStatus" NOT NULL DEFAULT 'pending',
    "bullJobId" TEXT,
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest"."RawCapture" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed"."VehicleRecord" (
    "id" TEXT NOT NULL,
    "vrn" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed"."KhananRecord" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhananRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "system"."User"("username");
CREATE INDEX "ScrapeJob_status_idx" ON "ingest"."ScrapeJob"("status");
CREATE INDEX "ScrapeJob_createdAt_idx" ON "ingest"."ScrapeJob"("createdAt");
CREATE INDEX "RawCapture_jobId_idx" ON "ingest"."RawCapture"("jobId");
CREATE INDEX "VehicleRecord_vrn_idx" ON "processed"."VehicleRecord"("vrn");
CREATE INDEX "KhananRecord_reference_idx" ON "processed"."KhananRecord"("reference");

-- AddForeignKey
ALTER TABLE "ingest"."RawCapture" ADD CONSTRAINT "RawCapture_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ingest"."ScrapeJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
