-- AlterTable
-- Adicionar campo automationsEnabled para controlar acesso às automações por tenant

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "automationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Criar índice para facilitar consultas
CREATE INDEX IF NOT EXISTS "companies_automationsEnabled_idx" ON "companies"("automationsEnabled");

