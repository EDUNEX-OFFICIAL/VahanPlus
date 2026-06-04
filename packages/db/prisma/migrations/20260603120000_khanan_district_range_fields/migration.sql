-- Persist last district scrape range (yyyy-mm-dd) for Khanan Config UI
ALTER TABLE "system"."KhananScraperConfig"
ADD COLUMN IF NOT EXISTS "districtRangeFrom" TEXT,
ADD COLUMN IF NOT EXISTS "districtRangeTo" TEXT;
