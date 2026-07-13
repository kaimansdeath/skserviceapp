-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BRIGADE_MEMBER';

-- CreateTable (Задача ↔ Виконавці)
CREATE TABLE "_TaskAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_TaskAssignees_AB_unique" ON "_TaskAssignees"("A", "B");

-- CreateIndex
CREATE INDEX "_TaskAssignees_B_index" ON "_TaskAssignees"("B");

-- AddForeignKey
ALTER TABLE "_TaskAssignees" ADD CONSTRAINT "_TaskAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskAssignees" ADD CONSTRAINT "_TaskAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: наявні задачі — призначаємо бригадирів їхніх бригад
INSERT INTO "_TaskAssignees" ("A", "B")
SELECT t."id", u."id"
FROM "Task" t
JOIN "User" u ON u."brigadeId" = t."brigadeId" AND u."role" = 'BRIGADE_LEADER'
WHERE t."brigadeId" IS NOT NULL;

INSERT INTO "_TaskAssignees" ("A", "B")
SELECT t."id", u."id"
FROM "Task" t
JOIN "User" u ON u."brigadeId" = t."secondBrigadeId" AND u."role" = 'BRIGADE_LEADER'
WHERE t."secondBrigadeId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "_TaskAssignees" x WHERE x."A" = t."id" AND x."B" = u."id"
  );

-- DataMigration: працівники бригад Коробка (Фляга) та Назар (Кирилко)
-- пароль за замовчуванням: Brigade_2026!
INSERT INTO "User" ("id", "name", "login", "passwordHash", "role", "locale", "brigadeId", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Коробка', 'korobka', '$2a$10$2w8RJaVDyV3pdyQvvrafTuhh5PhtYdVIio0gnmidDKAcAgGCeVeXm', 'BRIGADE_MEMBER', 'UK',
       (SELECT "id" FROM "Brigade" WHERE "name" = 'Бригада Фляги'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "login" = 'korobka')
  AND EXISTS (SELECT 1 FROM "Brigade" WHERE "name" = 'Бригада Фляги');

INSERT INTO "User" ("id", "name", "login", "passwordHash", "role", "locale", "brigadeId", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Назар', 'nazar', '$2a$10$2w8RJaVDyV3pdyQvvrafTuhh5PhtYdVIio0gnmidDKAcAgGCeVeXm', 'BRIGADE_MEMBER', 'UK',
       (SELECT "id" FROM "Brigade" WHERE "name" = 'Бригада Кирилка'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "login" = 'nazar')
  AND EXISTS (SELECT 1 FROM "Brigade" WHERE "name" = 'Бригада Кирилка');
