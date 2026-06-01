-- Allow operators to enable "Clear all data" from Khanan Config (DB toggle).
ALTER TABLE "system"."KhananScraperConfig"
ADD COLUMN "allowDataWipe" BOOLEAN NOT NULL DEFAULT false;
