-- Патч 12: модуль «КП» — шаблони генерації та бібліотека документів

-- CreateEnum
CREATE TYPE "KpEquipmentType" AS ENUM ('LASER', 'CNC', 'UNIVERSAL', 'OTHER');

-- CreateTable
CREATE TABLE "KpTemplate" (
    "id" TEXT NOT NULL,
    "equipmentType" "KpEquipmentType" NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpDocument" (
    "id" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "equipmentType" "KpEquipmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "price" TEXT,
    "currency" TEXT,
    "warnings" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpTemplate_equipmentType_key" ON "KpTemplate"("equipmentType");

-- CreateIndex
CREATE UNIQUE INDEX "KpDocument_filePath_key" ON "KpDocument"("filePath");

-- CreateIndex
CREATE INDEX "KpDocument_equipmentType_createdAt_idx" ON "KpDocument"("equipmentType", "createdAt");

-- AddForeignKey
ALTER TABLE "KpDocument" ADD CONSTRAINT "KpDocument_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
