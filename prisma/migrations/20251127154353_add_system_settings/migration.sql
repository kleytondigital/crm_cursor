-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "crmName" TEXT NOT NULL DEFAULT 'Darkmode CRM',
    "slogan" TEXT NOT NULL DEFAULT 'Soluções em atendimento',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Inserir registro padrão
INSERT INTO "system_settings" ("id", "crmName", "slogan", "version", "createdAt", "updatedAt")
VALUES (1, 'Darkmode CRM', 'Soluções em atendimento', '1.0.0', NOW(), NOW());

