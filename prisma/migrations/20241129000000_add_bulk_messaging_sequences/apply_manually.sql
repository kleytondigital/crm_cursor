-- Migration para adicionar suporte a sequências de mensagens e saudações randômicas
-- Execute este script diretamente no banco de dados PostgreSQL

BEGIN;

-- Adicionar campo para sequência de mensagens (JSON)
ALTER TABLE "bulk_messaging_campaigns" 
ADD COLUMN IF NOT EXISTS "messageSequence" JSONB;

-- Adicionar campo para usar saudação randômica
ALTER TABLE "bulk_messaging_campaigns" 
ADD COLUMN IF NOT EXISTS "useRandomGreeting" BOOLEAN NOT NULL DEFAULT false;

-- Adicionar campo para lista de saudações customizadas
ALTER TABLE "bulk_messaging_campaigns" 
ADD COLUMN IF NOT EXISTS "randomGreetings" TEXT[] DEFAULT '{}';

COMMIT;

