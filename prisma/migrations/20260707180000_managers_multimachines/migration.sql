-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manager_name_key" ON "Manager"("name");

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "managerId" TEXT;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: стартовий список менеджерів
INSERT INTO "Manager" ("id", "name")
SELECT gen_random_uuid()::text, m.name
FROM (VALUES
  ('Тимченко'),
  ('Беспалих'),
  ('Таймер'),
  ('Левін'),
  ('Коваленко'),
  ('Гринь'),
  ('Семенчак'),
  ('Комаров')
) AS m(name)
WHERE NOT EXISTS (SELECT 1 FROM "Manager" x WHERE x."name" = m.name);

-- DataMigration: тип обладнання «Інше»
INSERT INTO "MachineType" ("id", "nameUk", "nameRu")
SELECT gen_random_uuid()::text, 'Інше', 'Другое'
WHERE NOT EXISTS (SELECT 1 FROM "MachineType" WHERE "nameUk" = 'Інше');

-- CreateTable (many-to-many Задача ↔ Верстати)
CREATE TABLE "_MachineToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MachineToTask_AB_unique" ON "_MachineToTask"("A", "B");

-- CreateIndex
CREATE INDEX "_MachineToTask_B_index" ON "_MachineToTask"("B");

-- AddForeignKey
ALTER TABLE "_MachineToTask" ADD CONSTRAINT "_MachineToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineToTask" ADD CONSTRAINT "_MachineToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: наявні прив'язки верстатів переносимо у зв'язку "багато-до-багатьох"
INSERT INTO "_MachineToTask" ("A", "B")
SELECT "machineId", "id" FROM "Task" WHERE "machineId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_machineId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "machineId";
