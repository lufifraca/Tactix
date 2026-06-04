-- CreateTable
CREATE TABLE "CoachReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "report" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'rules',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachReport_userId_date_idx" ON "CoachReport"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CoachReport_userId_date_key" ON "CoachReport"("userId", "date");

-- AddForeignKey
ALTER TABLE "CoachReport" ADD CONSTRAINT "CoachReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
