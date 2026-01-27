-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'DISCORD', 'STEAM');

-- CreateEnum
CREATE TYPE "Game" AS ENUM ('CS2', 'MARVEL_RIVALS');

-- CreateEnum
CREATE TYPE "GameProvider" AS ENUM ('STEAM', 'TRACKER_NETWORK', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('RANKED', 'UNRANKED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WIN', 'LOSS', 'DRAW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SkillDomain" AS ENUM ('AIM_QUALITY', 'FIRST_ENGAGEMENT', 'SURVIVAL_QUALITY', 'OBJECTIVE_IMPACT', 'UTILITY_INTENT', 'CONSISTENCY');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('BADGE', 'CARD');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "rawProfile" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "provider" "GameProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "platform" TEXT,
    "steamGameAuthCode" TEXT,
    "cs2KnownMatchCode" TEXT,
    "meta" JSONB,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameAccountId" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "matchId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "mode" "MatchMode" NOT NULL DEFAULT 'UNKNOWN',
    "map" TEXT,
    "result" "MatchResult" NOT NULL DEFAULT 'UNKNOWN',
    "durationSeconds" INTEGER,
    "normalizedStats" JSONB NOT NULL,
    "rawPayloadS3Key" TEXT,
    "rawPayloadSha256" TEXT,
    "source" "GameProvider" NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameAccountId" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" "MatchMode" NOT NULL DEFAULT 'UNKNOWN',
    "stats" JSONB NOT NULL,
    "source" "GameProvider" NOT NULL,

    CONSTRAINT "StatSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" "Game",
    "mode" "MatchMode" NOT NULL DEFAULT 'UNKNOWN',
    "domain" "SkillDomain" NOT NULL,
    "score" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "SkillScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" INTEGER NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "game" "Game",
    "domain" "SkillDomain" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modeEligibility" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "progress" JSONB NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bullets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "assetS3Key" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Identity_userId_idx" ON "Identity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_provider_providerUserId_key" ON "Identity"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "GameAccount_userId_game_idx" ON "GameAccount"("userId", "game");

-- CreateIndex
CREATE UNIQUE INDEX "GameAccount_game_provider_externalId_key" ON "GameAccount"("game", "provider", "externalId");

-- CreateIndex
CREATE INDEX "Match_userId_game_endedAt_idx" ON "Match"("userId", "game", "endedAt");

-- CreateIndex
CREATE INDEX "Match_gameAccountId_endedAt_idx" ON "Match"("gameAccountId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_game_matchId_key" ON "Match"("game", "matchId");

-- CreateIndex
CREATE INDEX "StatSnapshot_userId_game_capturedAt_idx" ON "StatSnapshot"("userId", "game", "capturedAt");

-- CreateIndex
CREATE INDEX "StatSnapshot_gameAccountId_capturedAt_idx" ON "StatSnapshot"("gameAccountId", "capturedAt");

-- CreateIndex
CREATE INDEX "SkillScore_userId_domain_computedAt_idx" ON "SkillScore"("userId", "domain", "computedAt");

-- CreateIndex
CREATE INDEX "SkillScore_userId_game_mode_computedAt_idx" ON "SkillScore"("userId", "game", "mode", "computedAt");

-- CreateIndex
CREATE INDEX "Quest_userId_date_status_idx" ON "Quest"("userId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_userId_date_slot_key" ON "Quest"("userId", "date", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBrief_userId_date_key" ON "DailyBrief"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_shareId_key" ON "Reward"("shareId");

-- CreateIndex
CREATE INDEX "Reward_userId_createdAt_idx" ON "Reward"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAccount" ADD CONSTRAINT "GameAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_gameAccountId_fkey" FOREIGN KEY ("gameAccountId") REFERENCES "GameAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatSnapshot" ADD CONSTRAINT "StatSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatSnapshot" ADD CONSTRAINT "StatSnapshot_gameAccountId_fkey" FOREIGN KEY ("gameAccountId") REFERENCES "GameAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillScore" ADD CONSTRAINT "SkillScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyBrief" ADD CONSTRAINT "DailyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
