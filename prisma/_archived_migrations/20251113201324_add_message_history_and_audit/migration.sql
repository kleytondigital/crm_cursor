-- Verificar se as colunas já existem antes de adicioná-las
DO $$
BEGIN
    -- Adicionar colunas apenas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'editedAt') THEN
        ALTER TABLE "messages" ADD COLUMN "editedAt" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'deletedAt') THEN
        ALTER TABLE "messages" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'editedBy') THEN
        ALTER TABLE "messages" ADD COLUMN "editedBy" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'deletedBy') THEN
        ALTER TABLE "messages" ADD COLUMN "deletedBy" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'originalText') THEN
        ALTER TABLE "messages" ADD COLUMN "originalText" TEXT;
    END IF;
END $$;

-- Criar tabela apenas se não existir
CREATE TABLE IF NOT EXISTS "message_edit_history" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "oldText" TEXT,
    "newText" TEXT,
    "editedBy" TEXT,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "message_edit_history_pkey" PRIMARY KEY ("id")
);

-- Criar índices apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'message_edit_history_messageId_idx') THEN
        CREATE INDEX "message_edit_history_messageId_idx" ON "message_edit_history"("messageId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'message_edit_history_tenantId_idx') THEN
        CREATE INDEX "message_edit_history_tenantId_idx" ON "message_edit_history"("tenantId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'message_edit_history_editedAt_idx') THEN
        CREATE INDEX "message_edit_history_editedAt_idx" ON "message_edit_history"("editedAt");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'messages_deletedAt_idx') THEN
        CREATE INDEX "messages_deletedAt_idx" ON "messages"("deletedAt");
    END IF;
END $$;

-- Adicionar foreign key apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_edit_history_messageId_fkey'
    ) THEN
        ALTER TABLE "message_edit_history" 
        ADD CONSTRAINT "message_edit_history_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "messages"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;