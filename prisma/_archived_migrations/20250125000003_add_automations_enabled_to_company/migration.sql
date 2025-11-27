-- AlterTable
-- Adicionar campo automationsEnabled para controlar acesso às automações por tenant
-- Verificar se a tabela companies existe antes de alterá-la

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        -- Verificar se a coluna já existe antes de adicionar
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' 
            AND column_name = 'automationsEnabled'
        ) THEN
            ALTER TABLE "companies" ADD COLUMN "automationsEnabled" BOOLEAN NOT NULL DEFAULT false;
        END IF;
        
        -- Criar índice para facilitar consultas
        CREATE INDEX IF NOT EXISTS "companies_automationsEnabled_idx" ON "companies"("automationsEnabled");
    END IF;
END $$;

