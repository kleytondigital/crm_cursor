-- AlterTable
-- Adicionar novos campos para webhook do workflow instance

ALTER TABLE "workflow_instances" 
ADD COLUMN IF NOT EXISTS "webhookName" TEXT,
ADD COLUMN IF NOT EXISTS "webhookPath" TEXT,
ADD COLUMN IF NOT EXISTS "webhookUrlEditor" TEXT,
ADD COLUMN IF NOT EXISTS "generatedPrompt" TEXT;

