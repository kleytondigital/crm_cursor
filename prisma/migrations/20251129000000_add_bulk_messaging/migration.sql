-- CreateEnum
CREATE TYPE "BulkMessagingCampaignStatus" AS ENUM ('DRAFT', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "BulkMessagingRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BulkMessagingLogStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED', 'ERROR');

-- CreateTable
CREATE TABLE "bulk_messaging_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contentType" "ScheduledContentType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "caption" TEXT,
    "connectionId" TEXT NOT NULL,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BulkMessagingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "delayBetweenMessages" INTEGER NOT NULL DEFAULT 2000,
    "delayBetweenNumbers" INTEGER NOT NULL DEFAULT 5000,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "lastProcessedIndex" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_messaging_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_messaging_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "status" "BulkMessagingRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_messaging_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_messaging_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "status" "BulkMessagingLogStatus" NOT NULL,
    "message" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_messaging_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_messaging_campaigns_tenantId_idx" ON "bulk_messaging_campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "bulk_messaging_campaigns_createdById_idx" ON "bulk_messaging_campaigns"("createdById");

-- CreateIndex
CREATE INDEX "bulk_messaging_campaigns_status_idx" ON "bulk_messaging_campaigns"("status");

-- CreateIndex
CREATE INDEX "bulk_messaging_campaigns_tenantId_status_idx" ON "bulk_messaging_campaigns"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bulk_messaging_recipients_campaignId_idx" ON "bulk_messaging_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "bulk_messaging_recipients_status_idx" ON "bulk_messaging_recipients"("status");

-- CreateIndex
CREATE INDEX "bulk_messaging_recipients_campaignId_status_idx" ON "bulk_messaging_recipients"("campaignId", "status");

-- CreateIndex
CREATE INDEX "bulk_messaging_logs_campaignId_idx" ON "bulk_messaging_logs"("campaignId");

-- CreateIndex
CREATE INDEX "bulk_messaging_logs_recipientId_idx" ON "bulk_messaging_logs"("recipientId");

-- CreateIndex
CREATE INDEX "bulk_messaging_logs_status_idx" ON "bulk_messaging_logs"("status");

-- CreateIndex
CREATE INDEX "bulk_messaging_logs_campaignId_status_idx" ON "bulk_messaging_logs"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "bulk_messaging_campaigns" ADD CONSTRAINT "bulk_messaging_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_messaging_campaigns" ADD CONSTRAINT "bulk_messaging_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_messaging_campaigns" ADD CONSTRAINT "bulk_messaging_campaigns_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_messaging_recipients" ADD CONSTRAINT "bulk_messaging_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "bulk_messaging_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_messaging_logs" ADD CONSTRAINT "bulk_messaging_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "bulk_messaging_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_messaging_logs" ADD CONSTRAINT "bulk_messaging_logs_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "bulk_messaging_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

