-- CreateEnum
CREATE TYPE "ToolHolderKind" AS ENUM ('WAREHOUSE', 'BRIGADE', 'PERSON');

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "Tool" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ToolAllocation" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "holderKind" "ToolHolderKind" NOT NULL,
    "brigadeId" TEXT,
    "userId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolAllocation_toolId_holderKind_brigadeId_userId_key" ON "ToolAllocation"("toolId", "holderKind", "brigadeId", "userId");

-- CreateIndex
CREATE INDEX "ToolAllocation_brigadeId_idx" ON "ToolAllocation"("brigadeId");

-- CreateIndex
CREATE INDEX "ToolAllocation_userId_idx" ON "ToolAllocation"("userId");

-- AddForeignKey
ALTER TABLE "ToolAllocation" ADD CONSTRAINT "ToolAllocation_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolAllocation" ADD CONSTRAINT "ToolAllocation_brigadeId_fkey" FOREIGN KEY ("brigadeId") REFERENCES "Brigade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolAllocation" ADD CONSTRAINT "ToolAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: перенести наявне одиничне розміщення (holderBrigadeId/holderUserId) у allocations
INSERT INTO "ToolAllocation" ("id", "toolId", "holderKind", "brigadeId", "userId", "quantity", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'BRIGADE', "holderBrigadeId", NULL, "quantity", CURRENT_TIMESTAMP
FROM "Tool" WHERE "holderBrigadeId" IS NOT NULL;

INSERT INTO "ToolAllocation" ("id", "toolId", "holderKind", "brigadeId", "userId", "quantity", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'PERSON', NULL, "holderUserId", "quantity", CURRENT_TIMESTAMP
FROM "Tool" WHERE "holderUserId" IS NOT NULL;

INSERT INTO "ToolAllocation" ("id", "toolId", "holderKind", "brigadeId", "userId", "quantity", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'WAREHOUSE', NULL, NULL, "quantity", CURRENT_TIMESTAMP
FROM "Tool" WHERE "holderBrigadeId" IS NULL AND "holderUserId" IS NULL;

-- DropForeignKey
ALTER TABLE "Tool" DROP CONSTRAINT IF EXISTS "Tool_holderBrigadeId_fkey";
ALTER TABLE "Tool" DROP CONSTRAINT IF EXISTS "Tool_holderUserId_fkey";

-- AlterTable
ALTER TABLE "Tool" DROP COLUMN IF EXISTS "holderBrigadeId";
ALTER TABLE "Tool" DROP COLUMN IF EXISTS "holderUserId";
