-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "reply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replyMessageId" TEXT,
ADD COLUMN     "replyText" TEXT;
