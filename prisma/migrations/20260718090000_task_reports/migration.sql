-- CreateTable
CREATE TABLE "TaskReport" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "taskId" TEXT NOT NULL,
    "aiText" TEXT NOT NULL,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskReport_number_key" ON "TaskReport"("number");

-- CreateIndex
CREATE UNIQUE INDEX "TaskReport_taskId_key" ON "TaskReport"("taskId");

-- AddForeignKey
ALTER TABLE "TaskReport" ADD CONSTRAINT "TaskReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Нумерація актів починається з 932
ALTER SEQUENCE "TaskReport_number_seq" RESTART WITH 932;
