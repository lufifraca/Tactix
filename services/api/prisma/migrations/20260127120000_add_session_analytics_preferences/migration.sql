-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "matchCount" INTEGER NOT NULL,
    "winCount" INTEGER NOT NULL,
    "lossCount" INTEGER NOT NULL,
    "drawCount" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "streakType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT,
    "morningWins" INTEGER NOT NULL DEFAULT 0,
    "morningTotal" INTEGER NOT NULL DEFAULT 0,
    "afternoonWins" INTEGER NOT NULL DEFAULT 0,
    "afternoonTotal" INTEGER NOT NULL DEFAULT 0,
    "eveningWins" INTEGER NOT NULL DEFAULT 0,
    "eveningTotal" INTEGER NOT NULL DEFAULT 0,
    "nightWins" INTEGER NOT NULL DEFAULT 0,
    "nightTotal" INTEGER NOT NULL DEFAULT 0,
    "mondayWins" INTEGER NOT NULL DEFAULT 0,
    "mondayTotal" INTEGER NOT NULL DEFAULT 0,
    "tuesdayWins" INTEGER NOT NULL DEFAULT 0,
    "tuesdayTotal" INTEGER NOT NULL DEFAULT 0,
    "wednesdayWins" INTEGER NOT NULL DEFAULT 0,
    "wednesdayTotal" INTEGER NOT NULL DEFAULT 0,
    "thursdayWins" INTEGER NOT NULL DEFAULT 0,
    "thursdayTotal" INTEGER NOT NULL DEFAULT 0,
    "fridayWins" INTEGER NOT NULL DEFAULT 0,
    "fridayTotal" INTEGER NOT NULL DEFAULT 0,
    "saturdayWins" INTEGER NOT NULL DEFAULT 0,
    "saturdayTotal" INTEGER NOT NULL DEFAULT 0,
    "sundayWins" INTEGER NOT NULL DEFAULT 0,
    "sundayTotal" INTEGER NOT NULL DEFAULT 0,
    "shortSessionWins" INTEGER NOT NULL DEFAULT 0,
    "shortSessionTotal" INTEGER NOT NULL DEFAULT 0,
    "mediumSessionWins" INTEGER NOT NULL DEFAULT 0,
    "mediumSessionTotal" INTEGER NOT NULL DEFAULT 0,
    "longSessionWins" INTEGER NOT NULL DEFAULT 0,
    "longSessionTotal" INTEGER NOT NULL DEFAULT 0,
    "afterLoss1Wins" INTEGER NOT NULL DEFAULT 0,
    "afterLoss1Total" INTEGER NOT NULL DEFAULT 0,
    "afterLoss2Wins" INTEGER NOT NULL DEFAULT 0,
    "afterLoss2Total" INTEGER NOT NULL DEFAULT 0,
    "afterLoss3PlusWins" INTEGER NOT NULL DEFAULT 0,
    "afterLoss3PlusTotal" INTEGER NOT NULL DEFAULT 0,
    "avgWinRateByPosition" JSONB,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGamePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "steamAppId" INTEGER NOT NULL,
    "gameName" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "wantTracking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGamePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_game_startedAt_idx" ON "Session"("userId", "game", "startedAt");

-- CreateIndex
CREATE INDEX "Session_userId_startedAt_idx" ON "Session"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAnalytics_userId_game_key" ON "SessionAnalytics"("userId", "game");

-- CreateIndex
CREATE INDEX "SessionAnalytics_userId_idx" ON "SessionAnalytics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGamePreference_userId_steamAppId_key" ON "UserGamePreference"("userId", "steamAppId");

-- CreateIndex
CREATE INDEX "UserGamePreference_userId_isFavorite_idx" ON "UserGamePreference"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "UserGamePreference_wantTracking_idx" ON "UserGamePreference"("wantTracking");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAnalytics" ADD CONSTRAINT "SessionAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGamePreference" ADD CONSTRAINT "UserGamePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
