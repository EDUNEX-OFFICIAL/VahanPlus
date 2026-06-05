-- CreateTable
CREATE TABLE "system"."CrmConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "insuranceExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "rcExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "fitnessExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "rcAdvanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmConfig_pkey" PRIMARY KEY ("id")
);

-- Seed default row for existing deployments
INSERT INTO "system"."CrmConfig" ("id", "insuranceExpiryDays", "rcExpiryDays", "fitnessExpiryDays", "rcAdvanceEnabled", "configVersion", "updatedAt")
VALUES ('default', 30, 30, 30, true, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
