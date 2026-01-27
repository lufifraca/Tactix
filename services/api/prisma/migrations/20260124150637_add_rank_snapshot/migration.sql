-- CreateTable
CREATE TABLE "RankSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameAccountId" TEXT,
    "game" TEXT NOT NULL,
    "mode" TEXT,
    "rankTier" TEXT,
    "rankDivision" TEXT,
    "rankNumeric" INTEGER,
    "percentile" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankSnapshot_userId_game_capturedAt_idx" ON "RankSnapshot"("userId", "game", "capturedAt");

-- CreateIndex
CREATE INDEX "RankSnapshot_gameAccountId_capturedAt_idx" ON "RankSnapshot"("gameAccountId", "capturedAt");

-- CreateIndex
CREATE INDEX "RankSnapshot_userId_game_mode_capturedAt_idx" ON "RankSnapshot"("userId", "game", "mode", "capturedAt");

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_gameAccountId_fkey" FOREIGN KEY ("gameAccountId") REFERENCES "GameAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
