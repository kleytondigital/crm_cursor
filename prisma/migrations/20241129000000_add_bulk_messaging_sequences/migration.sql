-- Migration: Add message sequences and random greetings to bulk messaging campaigns
-- CreatedAt: 2024-11-29

-- AlterTable
ALTER TABLE "bulk_messaging_campaigns" ADD COLUMN IF NOT EXISTS "messageSequence" JSONB;

ALTER TABLE "bulk_messaging_campaigns" ADD COLUMN IF NOT EXISTS "useRandomGreeting" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "bulk_messaging_campaigns" ADD COLUMN IF NOT EXISTS "randomGreetings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

