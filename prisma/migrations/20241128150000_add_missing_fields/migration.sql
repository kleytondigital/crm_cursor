-- Migration para adicionar campos faltantes
-- Esta migration adiciona os campos que foram adicionados ao schema Prisma

-- Lead: profilePictureURL e origin
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "profilePictureURL" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "origin" TEXT;

-- Conversation: isBotAttending
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "isBotAttending" BOOLEAN NOT NULL DEFAULT false;

-- Attendance: startedAt, endedAt, isUrgent
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "isUrgent" BOOLEAN NOT NULL DEFAULT false;

-- CustomLeadStatus: order e isActive
ALTER TABLE "custom_lead_statuses" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "custom_lead_statuses" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- PipelineStage: color e isActive
ALTER TABLE "pipeline_stages" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#3B82F6';
ALTER TABLE "pipeline_stages" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- MessageEditHistory: tenantId
ALTER TABLE "message_edit_history" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Adicionar foreign key para customStatus em Lead (usando DO block para verificar existência)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leads_statusId_fkey'
    ) THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_statusId_fkey" 
          FOREIGN KEY ("statusId") REFERENCES "custom_lead_statuses"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Atualizar foreign key de PipelineStage
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pipeline_stages_statusId_fkey'
    ) THEN
        ALTER TABLE "pipeline_stages" DROP CONSTRAINT "pipeline_stages_statusId_fkey";
    END IF;
    ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_statusId_fkey" 
      FOREIGN KEY ("statusId") REFERENCES "custom_lead_statuses"("id") ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS "leads_statusId_idx" ON "leads"("statusId");
CREATE INDEX IF NOT EXISTS "custom_lead_statuses_order_idx" ON "custom_lead_statuses"("tenantId", "order");
CREATE INDEX IF NOT EXISTS "pipeline_stages_isActive_idx" ON "pipeline_stages"("isActive");
CREATE INDEX IF NOT EXISTS "attendances_isUrgent_idx" ON "attendances"("isUrgent");
CREATE INDEX IF NOT EXISTS "message_edit_history_tenantId_idx" ON "message_edit_history"("tenantId");
