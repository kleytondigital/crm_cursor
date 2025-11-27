-- AlterTable
-- Adicionar campos para configuração Kanban no workflow instance

ALTER TABLE "workflow_instances" 
ADD COLUMN IF NOT EXISTS "kanbanEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "kanbanPrompt" TEXT,
ADD COLUMN IF NOT EXISTS "kanbanStageIds" JSONB;

-- Comentário explicativo
COMMENT ON COLUMN "workflow_instances"."kanbanEnabled" IS 'Se a função Kanban está ativada';
COMMENT ON COLUMN "workflow_instances"."kanbanPrompt" IS 'Prompt específico da função Kanban';
COMMENT ON COLUMN "workflow_instances"."kanbanStageIds" IS 'IDs dos estágios configurados para Kanban';

