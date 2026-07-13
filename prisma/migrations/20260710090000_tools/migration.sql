-- CreateEnum
CREATE TYPE "ToolClass" AS ENUM ('HAND', 'ELECTRIC', 'MEASURING', 'TOOLING', 'MODULES');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('WORKING', 'BROKEN', 'LOST');

-- CreateEnum
CREATE TYPE "ToolReqKind" AS ENUM ('PURCHASE', 'ISSUE');

-- CreateEnum
CREATE TYPE "ToolReqStatus" AS ENUM ('NEW', 'DONE', 'REJECTED');

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inventoryNumber" TEXT,
    "toolClass" "ToolClass" NOT NULL,
    "status" "ToolStatus" NOT NULL DEFAULT 'WORKING',
    "note" TEXT,
    "holderBrigadeId" TEXT,
    "holderUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolMovement" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "byUserId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolRequest" (
    "id" TEXT NOT NULL,
    "kind" "ToolReqKind" NOT NULL,
    "status" "ToolReqStatus" NOT NULL DEFAULT 'NEW',
    "text" TEXT NOT NULL,
    "requestedById" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tool_holderBrigadeId_idx" ON "Tool"("holderBrigadeId");

-- CreateIndex
CREATE INDEX "Tool_holderUserId_idx" ON "Tool"("holderUserId");

-- CreateIndex
CREATE INDEX "ToolMovement_toolId_createdAt_idx" ON "ToolMovement"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolRequest_kind_status_createdAt_idx" ON "ToolRequest"("kind", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_holderBrigadeId_fkey" FOREIGN KEY ("holderBrigadeId") REFERENCES "Brigade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_holderUserId_fkey" FOREIGN KEY ("holderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolMovement" ADD CONSTRAINT "ToolMovement_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolMovement" ADD CONSTRAINT "ToolMovement_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolRequest" ADD CONSTRAINT "ToolRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: комірник (логін sklad, пароль Sklad_2026!)
INSERT INTO "User" ("id", "name", "login", "passwordHash", "role", "locale", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Комірник', 'sklad', '$2a$10$x45JAzlk/PX26xg51ctyr.JPOsbWsR/EkAH8U.mSPR7WBXN.lk2YK', 'STOREKEEPER', 'UK', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "login" = 'sklad');
