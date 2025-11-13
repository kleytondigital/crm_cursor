-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedBy" TEXT,
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "originalText" TEXT;

-- CreateTable
CREATE TABLE "message_edit_history" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "oldText" TEXT,
    "newText" TEXT,
    "editedBy" TEXT,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "message_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_edit_history_messageId_idx" ON "message_edit_history"("messageId");

-- CreateIndex
CREATE INDEX "message_edit_history_tenantId_idx" ON "message_edit_history"("tenantId");

-- CreateIndex
CREATE INDEX "message_edit_history_editedAt_idx" ON "message_edit_history"("editedAt");

-- CreateIndex
CREATE INDEX "messages_deletedAt_idx" ON "messages"("deletedAt");

-- AddForeignKey
ALTER TABLE "message_edit_history" ADD CONSTRAINT "message_edit_history_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;