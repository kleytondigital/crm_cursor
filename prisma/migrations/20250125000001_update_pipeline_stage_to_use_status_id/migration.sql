-- AlterTable
-- Atualizar PipelineStage para usar statusId ao invés de status (enum)

-- Adicionar coluna statusId
ALTER TABLE "pipeline_stages" ADD COLUMN IF NOT EXISTS "statusId" TEXT;

-- Criar índice temporário para facilitar migração
CREATE INDEX IF NOT EXISTS "pipeline_stages_statusId_idx" ON "pipeline_stages"("statusId");

-- Migrar dados: Para cada estágio existente, criar ou associar um CustomLeadStatus
-- Primeiro, vamos criar status padrão para cada tenant que tem estágios
DO $$
DECLARE
    stage_record RECORD;
    status_id TEXT;
    status_exists BOOLEAN;
BEGIN
    -- Para cada estágio existente
    FOR stage_record IN 
        SELECT DISTINCT "tenantId", status 
        FROM pipeline_stages 
        WHERE "tenantId" IS NOT NULL
    LOOP
        -- Verificar se já existe um status com esse nome baseado no enum
        SELECT EXISTS(
            SELECT 1 FROM custom_lead_statuses 
            WHERE "tenantId" = stage_record."tenantId" 
            AND name = (
                CASE stage_record.status
                    WHEN 'NOVO' THEN 'Novo'
                    WHEN 'EM_ATENDIMENTO' THEN 'Em Atendimento'
                    WHEN 'AGUARDANDO' THEN 'Aguardando'
                    WHEN 'CONCLUIDO' THEN 'Concluído'
                END
            )
        ) INTO status_exists;

        -- Se não existe, criar o status
        IF NOT status_exists THEN
            status_id := gen_random_uuid()::TEXT;
            INSERT INTO custom_lead_statuses (id, name, description, color, "order", "isActive", "tenantId", "createdAt", "updatedAt")
            VALUES (
                status_id,
                CASE stage_record.status
                    WHEN 'NOVO' THEN 'Novo'
                    WHEN 'EM_ATENDIMENTO' THEN 'Em Atendimento'
                    WHEN 'AGUARDANDO' THEN 'Aguardando'
                    WHEN 'CONCLUIDO' THEN 'Concluído'
                END,
                CASE stage_record.status
                    WHEN 'NOVO' THEN 'Lead recém-cadastrado, aguardando primeiro contato'
                    WHEN 'EM_ATENDIMENTO' THEN 'Lead está sendo atendido ativamente por um agente'
                    WHEN 'AGUARDANDO' THEN 'Lead aguardando resposta ou ação do cliente'
                    WHEN 'CONCLUIDO' THEN 'Lead convertido ou atendimento finalizado com sucesso'
                END,
                CASE stage_record.status
                    WHEN 'NOVO' THEN '#10B981'
                    WHEN 'EM_ATENDIMENTO' THEN '#3B82F6'
                    WHEN 'AGUARDANDO' THEN '#F59E0B'
                    WHEN 'CONCLUIDO' THEN '#8B5CF6'
                END,
                CASE stage_record.status
                    WHEN 'NOVO' THEN 0
                    WHEN 'EM_ATENDIMENTO' THEN 1
                    WHEN 'AGUARDANDO' THEN 2
                    WHEN 'CONCLUIDO' THEN 3
                END,
                true,
                stage_record."tenantId",
                NOW(),
                NOW()
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- Atualizar os estágios para usar statusId
    UPDATE pipeline_stages ps
    SET "statusId" = (
        SELECT id FROM custom_lead_statuses cls
        WHERE cls."tenantId" = ps."tenantId"
        AND cls.name = (
            CASE ps.status
                WHEN 'NOVO' THEN 'Novo'
                WHEN 'EM_ATENDIMENTO' THEN 'Em Atendimento'
                WHEN 'AGUARDANDO' THEN 'Aguardando'
                WHEN 'CONCLUIDO' THEN 'Concluído'
            END
        )
        LIMIT 1
    )
    WHERE ps."statusId" IS NULL AND ps."tenantId" IS NOT NULL;
END $$;

-- Tornar statusId obrigatório (após migração)
ALTER TABLE "pipeline_stages" ALTER COLUMN "statusId" SET NOT NULL;

-- Remover constraint única antiga
DROP INDEX IF EXISTS "pipeline_stages_tenantId_status_name_key";

-- Criar nova constraint única
CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_stages_tenantId_statusId_name_key" ON "pipeline_stages"("tenantId", "statusId", "name");

-- Remover coluna status (enum) - manter temporariamente para compatibilidade
-- ALTER TABLE "pipeline_stages" DROP COLUMN IF EXISTS "status";

-- Adicionar foreign key
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "custom_lead_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

