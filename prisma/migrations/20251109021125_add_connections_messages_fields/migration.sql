/*
  Warnings:

  - A unique constraint covering the columns `[messageId]` on the table `messages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'STOPPED', 'ERROR');

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversationId_fkey";

-- DropIndex
DROP INDEX "messages_conversationId_createdAt_idx";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "connectionId" TEXT,
ADD COLUMN     "direction" "MessageDirection" NOT NULL DEFAULT 'INCOMING',
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "sender" TEXT,
ADD COLUMN     "timestamp" TIMESTAMP(3),
ALTER COLUMN "conversationId" DROP NOT NULL,
ALTER COLUMN "senderType" SET DEFAULT 'LEAD',
ALTER COLUMN "contentType" SET DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "connections_sessionName_key" ON "connections"("sessionName");

-- CreateIndex
CREATE INDEX "connections_tenantId_idx" ON "connections"("tenantId");

-- CreateIndex
CREATE INDEX "connections_tenantId_status_idx" ON "connections"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "messages_messageId_key" ON "messages"("messageId");

-- CreateIndex
CREATE INDEX "messages_leadId_idx" ON "messages"("leadId");

-- CreateIndex
CREATE INDEX "messages_connectionId_idx" ON "messages"("connectionId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
