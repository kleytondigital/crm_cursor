-- CreateTable
-- Criar tabela custom_lead_statuses
CREATE TABLE IF NOT EXISTS "custom_lead_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_lead_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "custom_lead_statuses_tenantId_idx" ON "custom_lead_statuses"("tenantId");
CREATE INDEX IF NOT EXISTS "custom_lead_statuses_isActive_idx" ON "custom_lead_statuses"("isActive");
CREATE INDEX IF NOT EXISTS "custom_lead_statuses_order_idx" ON "custom_lead_statuses"("order");
CREATE INDEX IF NOT EXISTS "custom_lead_statuses_tenantId_order_idx" ON "custom_lead_statuses"("tenantId", "order");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "custom_lead_statuses_tenantId_name_key" ON "custom_lead_statuses"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "custom_lead_statuses" ADD CONSTRAINT "custom_lead_statuses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Adicionar coluna statusId em leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "statusId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_statusId_idx" ON "leads"("statusId");
CREATE INDEX IF NOT EXISTS "leads_tenantId_statusId_idx" ON "leads"("tenantId", "statusId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "custom_lead_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
-- Adicionar coluna isBotAttending em conversations
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "isBotAttending" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversations_isBotAttending_idx" ON "conversations"("isBotAttending");
CREATE INDEX IF NOT EXISTS "conversations_tenantId_isBotAttending_idx" ON "conversations"("tenantId", "isBotAttending");

-- Migração de dados: Criar status padrão para cada tenant e migrar leads
-- Este script cria os status padrão (NOVO, EM_ATENDIMENTO, AGUARDANDO, CONCLUIDO) para cada tenant existente
-- e associa os leads ao status correspondente baseado no enum atual

DO $$
DECLARE
    company_record RECORD;
    status_id_novo TEXT;
    status_id_em_atendimento TEXT;
    status_id_aguardando TEXT;
    status_id_concluido TEXT;
BEGIN
    -- Para cada empresa/tenant
    FOR company_record IN SELECT id FROM companies LOOP
        -- Criar status NOVO
        status_id_novo := gen_random_uuid()::TEXT;
        INSERT INTO custom_lead_statuses (id, name, description, color, "order", "isActive", "tenantId", "createdAt", "updatedAt")
        VALUES (
            status_id_novo,
            'Novo',
            'Lead recém-cadastrado, aguardando primeiro contato',
            '#10B981',
            0,
            true,
            company_record.id,
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING;

        -- Criar status EM_ATENDIMENTO
        status_id_em_atendimento := gen_random_uuid()::TEXT;
        INSERT INTO custom_lead_statuses (id, name, description, color, "order", "isActive", "tenantId", "createdAt", "updatedAt")
        VALUES (
            status_id_em_atendimento,
            'Em Atendimento',
            'Lead está sendo atendido ativamente por um agente',
            '#3B82F6',
            1,
            true,
            company_record.id,
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING;

        -- Criar status AGUARDANDO
        status_id_aguardando := gen_random_uuid()::TEXT;
        INSERT INTO custom_lead_statuses (id, name, description, color, "order", "isActive", "tenantId", "createdAt", "updatedAt")
        VALUES (
            status_id_aguardando,
            'Aguardando',
            'Lead aguardando resposta ou ação do cliente',
            '#F59E0B',
            2,
            true,
            company_record.id,
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING;

        -- Criar status CONCLUIDO
        status_id_concluido := gen_random_uuid()::TEXT;
        INSERT INTO custom_lead_statuses (id, name, description, color, "order", "isActive", "tenantId", "createdAt", "updatedAt")
        VALUES (
            status_id_concluido,
            'Concluído',
            'Lead convertido ou atendimento finalizado com sucesso',
            '#8B5CF6',
            3,
            true,
            company_record.id,
            NOW(),
            NOW()
        ) ON CONFLICT DO NOTHING;

        -- Migrar leads: associar ao statusId baseado no enum status atual
        UPDATE leads
        SET "statusId" = (
            CASE 
                WHEN status = 'NOVO' THEN status_id_novo
                WHEN status = 'EM_ATENDIMENTO' THEN status_id_em_atendimento
                WHEN status = 'AGUARDANDO' THEN status_id_aguardando
                WHEN status = 'CONCLUIDO' THEN status_id_concluido
                ELSE status_id_novo -- Default para NOVO se houver algum valor inesperado
            END
        )
        WHERE "tenantId" = company_record.id AND "statusId" IS NULL;
    END LOOP;
END $$;

