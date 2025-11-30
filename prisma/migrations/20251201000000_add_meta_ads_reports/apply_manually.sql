-- Migration Manual para adicionar modelos de Meta Ads Reports
-- Execute este arquivo manualmente no PostgreSQL se prisma migrate deploy falhar

-- AlterTable: messages - Adicionar campos de correlação com Meta Ads
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "adId" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "adsetId" TEXT;

-- Criar índices para os novos campos de mensagens
CREATE INDEX IF NOT EXISTS "messages_adId_idx" ON "messages"("adId");
CREATE INDEX IF NOT EXISTS "messages_campaignId_idx" ON "messages"("campaignId");

-- CreateTable: ad_accounts
CREATE TABLE IF NOT EXISTS "ad_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT,
    "accountStatus" TEXT,
    "businessId" TEXT,
    "connectionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ad_reports
CREATE TABLE IF NOT EXISTS "ad_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "adsetId" TEXT,
    "adId" TEXT,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ad_reports_timeline
CREATE TABLE IF NOT EXISTS "ad_reports_timeline" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_reports_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ad_reports_breakdown
CREATE TABLE IF NOT EXISTS "ad_reports_breakdown" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "adName" TEXT NOT NULL,
    "creativeName" TEXT,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "ctr" DOUBLE PRECISION,
    "cpa" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_reports_breakdown_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: ad_accounts -> companies
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ad_accounts -> connections
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ad_reports -> companies
ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ad_reports -> ad_accounts
ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ad_reports_timeline -> ad_reports
ALTER TABLE "ad_reports_timeline" ADD CONSTRAINT "ad_reports_timeline_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ad_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ad_reports_breakdown -> ad_reports
ALTER TABLE "ad_reports_breakdown" ADD CONSTRAINT "ad_reports_breakdown_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ad_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: ad_accounts
CREATE UNIQUE INDEX IF NOT EXISTS "ad_accounts_tenantId_adAccountId_key" ON "ad_accounts"("tenantId", "adAccountId");
CREATE INDEX IF NOT EXISTS "ad_accounts_tenantId_idx" ON "ad_accounts"("tenantId");
CREATE INDEX IF NOT EXISTS "ad_accounts_connectionId_idx" ON "ad_accounts"("connectionId");
CREATE INDEX IF NOT EXISTS "ad_accounts_tenantId_isActive_idx" ON "ad_accounts"("tenantId", "isActive");

-- CreateIndex: ad_reports
CREATE INDEX IF NOT EXISTS "ad_reports_tenantId_accountId_idx" ON "ad_reports"("tenantId", "accountId");
CREATE INDEX IF NOT EXISTS "ad_reports_dateStart_dateEnd_idx" ON "ad_reports"("dateStart", "dateEnd");
CREATE INDEX IF NOT EXISTS "ad_reports_campaignId_idx" ON "ad_reports"("campaignId");
CREATE INDEX IF NOT EXISTS "ad_reports_adsetId_idx" ON "ad_reports"("adsetId");
CREATE INDEX IF NOT EXISTS "ad_reports_adId_idx" ON "ad_reports"("adId");

-- CreateIndex: ad_reports_timeline
CREATE UNIQUE INDEX IF NOT EXISTS "ad_reports_timeline_reportId_date_key" ON "ad_reports_timeline"("reportId", "date");
CREATE INDEX IF NOT EXISTS "ad_reports_timeline_reportId_date_idx" ON "ad_reports_timeline"("reportId", "date");
CREATE INDEX IF NOT EXISTS "ad_reports_timeline_date_idx" ON "ad_reports_timeline"("date");

-- CreateIndex: ad_reports_breakdown
CREATE INDEX IF NOT EXISTS "ad_reports_breakdown_reportId_idx" ON "ad_reports_breakdown"("reportId");
CREATE INDEX IF NOT EXISTS "ad_reports_breakdown_adId_idx" ON "ad_reports_breakdown"("adId");

