-- Migration para adicionar colunas faltantes ao schema
-- Adiciona colunas que estão no schema Prisma mas faltam no banco de dados

-- AlterTable: leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "document" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stageId" TEXT;

-- AlterTable: conversations
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);

-- AlterTable: attendances
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

-- Criar índices se necessário
CREATE INDEX IF NOT EXISTS "leads_stageId_idx" ON "leads"("stageId");
CREATE INDEX IF NOT EXISTS "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

