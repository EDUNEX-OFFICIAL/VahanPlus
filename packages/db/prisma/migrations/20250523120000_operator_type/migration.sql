-- Rename EpassSourceRole to OperatorType; EpassConsignerRow.role -> operatorType

CREATE TYPE "processed"."OperatorType" AS ENUM ('lessee', 'dealer');

ALTER TABLE "processed"."EpassConsignerRow" ADD COLUMN "operatorType" "processed"."OperatorType";

UPDATE "processed"."EpassConsignerRow"
SET "operatorType" = "role"::text::"processed"."OperatorType";

ALTER TABLE "processed"."EpassConsignerRow" ALTER COLUMN "operatorType" SET NOT NULL;

DROP INDEX "processed"."EpassConsignerRow_districtRowId_role_slNo_key";

CREATE UNIQUE INDEX "EpassConsignerRow_districtRowId_operatorType_slNo_key"
  ON "processed"."EpassConsignerRow"("districtRowId", "operatorType", "slNo");

ALTER TABLE "processed"."EpassConsignerRow" DROP COLUMN "role";

DROP TYPE "processed"."EpassSourceRole";
