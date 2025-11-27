-- Tornar a coluna status opcional (nullable) na tabela pipeline_stages
-- Isso permite criar estágios sem fornecer o status antigo (enum)

DO $$
BEGIN
    -- Verificar se a tabela pipeline_stages existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_stages') THEN
        -- Verificar se a coluna status existe e torná-la opcional
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_stages' AND column_name = 'status') THEN
            -- Tornar a coluna opcional (remover NOT NULL constraint)
            ALTER TABLE "pipeline_stages" ALTER COLUMN "status" DROP NOT NULL;
        END IF;
    END IF;
END $$;

