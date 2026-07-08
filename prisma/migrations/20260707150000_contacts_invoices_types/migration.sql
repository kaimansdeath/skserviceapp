-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ACCOUNTANT';

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ENGINEERING', 'PNR', 'REPAIR', 'DEFECTATION', 'VISIT', 'OTHER');

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "position" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_clientId_number_key" ON "Invoice"("clientId", "number");

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: наявний рядок контактів переносимо як контактну особу (ПІБ)
INSERT INTO "ClientContact" ("id", "clientId", "fullName")
SELECT gen_random_uuid()::text, "id", "contacts"
FROM "Client"
WHERE "contacts" IS NOT NULL AND btrim("contacts") <> '';

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "contacts";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "taskType" "TaskType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "secondBrigadeId" TEXT;

-- DataMigration: номери рахунків із задач стають рахунками клієнтів
INSERT INTO "Invoice" ("id", "clientId", "number")
SELECT gen_random_uuid()::text, "clientId", "invoiceNumber"
FROM "Task"
WHERE "invoiceNumber" IS NOT NULL AND btrim("invoiceNumber") <> ''
GROUP BY "clientId", "invoiceNumber";

UPDATE "Task" t
SET "invoiceId" = i."id"
FROM "Invoice" i
WHERE i."clientId" = t."clientId" AND i."number" = t."invoiceNumber";

-- DropIndex
DROP INDEX "Task_invoiceNumber_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "invoiceNumber";

-- CreateIndex
CREATE INDEX "Task_invoiceId_idx" ON "Task"("invoiceId");

-- CreateIndex
CREATE INDEX "Task_secondBrigadeId_idx" ON "Task"("secondBrigadeId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_secondBrigadeId_fkey" FOREIGN KEY ("secondBrigadeId") REFERENCES "Brigade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
