ALTER TABLE "processed"."EpassConsignerRow"
ADD COLUMN "ghatNumber" TEXT;

-- Backfill from first challan (slNo ASC) per lessee consigner
UPDATE "processed"."EpassConsignerRow" AS c
SET "ghatNumber" = sub."ghatNumber"
FROM (
  SELECT DISTINCT ON (ch."consignerRowId")
    ch."consignerRowId",
    ch."ghatNumber"
  FROM "processed"."EpassChallanRow" AS ch
  INNER JOIN "processed"."EpassConsignerRow" AS cr ON cr."id" = ch."consignerRowId"
  WHERE cr."operatorType" = 'lessee'
    AND ch."ghatNumber" IS NOT NULL
    AND TRIM(ch."ghatNumber") <> ''
  ORDER BY ch."consignerRowId", ch."slNo" ASC
) AS sub
WHERE c."id" = sub."consignerRowId"
  AND c."operatorType" = 'lessee'
  AND (c."ghatNumber" IS NULL OR TRIM(c."ghatNumber") = '');
