-- AlterTable
-- Adicionar campos para modo teste no workflow instance

ALTER TABLE "workflow_instances" 
ADD COLUMN IF NOT EXISTS "testMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "testPhone" TEXT;

-- Comentário explicativo
COMMENT ON COLUMN "workflow_instances"."testMode" IS 'Modo teste (true/false)';
COMMENT ON COLUMN "workflow_instances"."testPhone" IS 'Telefone para modo teste (formato: 5562999999999@c.us)';

