-- CreateEnum
CREATE TYPE "ExecutorType" AS ENUM ('BRIGADE', 'OUTSOURCE');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "edrpou" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "executorType" "ExecutorType" NOT NULL DEFAULT 'BRIGADE',
ADD COLUMN     "outsourceName" TEXT,
ADD COLUMN     "orderNumber" TEXT,
ALTER COLUMN "brigadeId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_brigadeId_fkey";

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_brigadeId_fkey" FOREIGN KEY ("brigadeId") REFERENCES "Brigade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
