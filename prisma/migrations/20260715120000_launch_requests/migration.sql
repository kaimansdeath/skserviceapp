-- CreateTable
CREATE TABLE "LaunchRequest" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "managerId" TEXT,
    "clientName" TEXT NOT NULL,
    "contactInfo" TEXT,
    "city" TEXT,
    "machineText" TEXT NOT NULL,
    "desiredDate" DATE,
    "note" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LaunchRequest_number_key" ON "LaunchRequest"("number");

-- CreateIndex
CREATE INDEX "LaunchRequest_status_createdAt_idx" ON "LaunchRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "LaunchRequest" ADD CONSTRAINT "LaunchRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
