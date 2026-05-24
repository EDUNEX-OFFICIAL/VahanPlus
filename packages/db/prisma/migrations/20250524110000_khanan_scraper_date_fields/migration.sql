-- AlterTable
ALTER TABLE "system"."KhananScraperConfig"
ADD COLUMN "defaultDistrictDate" TEXT,
ADD COLUMN "scheduleReportDateMode" TEXT NOT NULL DEFAULT 'yesterday';
