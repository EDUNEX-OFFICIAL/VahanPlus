-- CreateTable
CREATE TABLE "system"."KhananScraperConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "autoFanout" BOOLEAN NOT NULL DEFAULT true,
    "skipChallan" BOOLEAN NOT NULL DEFAULT false,
    "skipChallanPass" BOOLEAN NOT NULL DEFAULT false,
    "skipVehicleStatus" BOOLEAN NOT NULL DEFAULT false,
    "workerConcurrency" INTEGER NOT NULL DEFAULT 4,
    "rateLimitMax" INTEGER NOT NULL DEFAULT 2,
    "rateLimitDurationMs" INTEGER NOT NULL DEFAULT 1000,
    "postDelayMs" INTEGER NOT NULL DEFAULT 1000,
    "fanoutStaggerMs" INTEGER NOT NULL DEFAULT 0,
    "fetchTimeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "fetchRetries" INTEGER NOT NULL DEFAULT 3,
    "storeRawCapture" BOOLEAN NOT NULL DEFAULT false,
    "maxConsignerJobs" INTEGER,
    "districtReportUrl" TEXT NOT NULL DEFAULT 'https://khanansoft.bihar.gov.in/portal/CitizenRpt/epassreportAllDist.aspx',
    "districtRowLimit" INTEGER NOT NULL DEFAULT 44,
    "scheduleCron" TEXT,
    "scheduleTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "configVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhananScraperConfig_pkey" PRIMARY KEY ("id")
);
