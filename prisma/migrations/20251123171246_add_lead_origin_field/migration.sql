-- AlterTable
-- Adicionar campo origin ao modelo Lead

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "origin" TEXT;

-- Criar índices para otimizar queries de relatórios
CREATE INDEX IF NOT EXISTS "leads_origin_idx" ON "leads"("origin");
CREATE INDEX IF NOT EXISTS "leads_tenantId_origin_idx" ON "leads"("tenantId", "origin");

