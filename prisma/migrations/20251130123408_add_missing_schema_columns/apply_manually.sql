-- Migration para adicionar colunas faltantes ao schema
-- Execute este script diretamente no banco de dados PostgreSQL
-- Adiciona colunas que estão no schema Prisma mas faltam no banco de dados

BEGIN;

-- AlterTable: leads
-- Adicionar coluna email (opcional)
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Adicionar coluna document (opcional)
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "document" TEXT;

-- Adicionar coluna stageId (opcional, pode referenciar pipeline_stages no futuro)
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stageId" TEXT;

-- AlterTable: conversations
-- Adicionar coluna lastMessageAt (opcional, para rastrear última mensagem)
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);

-- AlterTable: attendances
-- Adicionar coluna closedAt (opcional, para rastrear quando o atendimento foi fechado)
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

-- Criar índices para melhor performance (se não existirem)
CREATE INDEX IF NOT EXISTS "leads_stageId_idx" ON "leads"("stageId");
CREATE INDEX IF NOT EXISTS "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

COMMIT;

-- Notas:
-- 1. Todas as colunas são opcionais (NULL permitido)
-- 2. Os índices melhoram a performance de queries que filtram por essas colunas
-- 3. stageId pode ser usado no futuro para referenciar pipeline_stages
-- 4. lastMessageAt será atualizado automaticamente quando novas mensagens forem criadas
-- 5. closedAt será atualizado quando um atendimento for fechado

