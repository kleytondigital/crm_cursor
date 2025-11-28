-- AlterTable: Add ConnectionProvider enum and new fields to connections table
-- CreateEnum
CREATE TYPE "ConnectionProvider" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK');

-- AlterTable
ALTER TABLE "connections" 
  ADD COLUMN "provider" "ConnectionProvider" NOT NULL DEFAULT 'WHATSAPP',
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "refreshToken" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "connections_tenantId_provider_idx" ON "connections"("tenantId", "provider");
CREATE INDEX "connections_tenantId_provider_status_idx" ON "connections"("tenantId", "provider", "status");

