import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";
import { type IngestJob, type ComputeJob } from "./queue";
import { ingestGameAccount, ingestUserAll } from "./services/ingest/ingestOrchestrator";
import { prisma } from "./prisma";
import { ensureDailyQuests, ensureDailyBrief, recomputeQuestProgress } from "./services/quests/questEngine";
import { upsertDailySkillScores } from "./services/skills/scoring";
import { sendPushToUsers } from "./services/notifications/expo";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getSubscriptionActive(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return sub?.status === "ACTIVE";
}

async function enqueuePollIngest(ingestQueue: Queue) {
  const accounts = await prisma.gameAccount.findMany({ select: { id: true } });
  for (const a of accounts) {
    await ingestQueue.add("ingest", { type: "INGEST_ACCOUNT", gameAccountId: a.id } satisfies IngestJob, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}

async function runDaily(dateStr: string, computeQueue: Queue) {
  const users = await prisma.user.findMany({
    where: { gameAccounts: { some: {} } },
    select: { id: true },
  });

  for (const u of users) {
    await computeQueue.add("compute", { type: "GENERATE_DAILY", userId: u.id, date: dateStr } satisfies ComputeJob, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  await sendPushToUsers(
    users.map((u) => u.id),
    { title: "Daily quests ready", body: "Your coach dashboard is updated for today.", data: { screen: "Dashboard" } }
  );
}

async function runStreakWarning(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const quests = await prisma.quest.findMany({
    where: { date, status: "ACTIVE" },
    select: { userId: true },
    distinct: ["userId"],
  });
  const users = quests.map((q) => q.userId);
  if (users.length === 0) return;

  await sendPushToUsers(users, {
    title: "Streak warning",
    body: "You still have an active quest today — finish it to keep the streak alive.",
    data: { screen: "Dashboard" },
  });
}

async function runWeeklyArcEndingSoon() {
  const users = await prisma.user.findMany({ select: { id: true } });
  await sendPushToUsers(users.map((u) => u.id), {
    title: "Weekly arc ending soon",
    body: "Wrap up your week strong — finish your last sessions with intention.",
    data: { screen: "Dashboard" },
  });
}

async function main() {
  console.log("Worker starting...");

  const useTls = env.REDIS_URL.startsWith("rediss://");
  const redis = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    ...(useTls ? { tls: {} } : {}),
  });

  await new Promise<void>((resolve, reject) => {
    redis.once("ready", resolve);
    redis.once("error", reject);
  });

  console.log("[Worker] Redis connected");

  const ingestQueue = new Queue("ingest", { connection: redis as any });
  const computeQueue = new Queue("compute", { connection: redis as any });

  const ingestWorker = new Worker(
    "ingest",
    async (job) => {
      const payload = job.data as IngestJob;
      if (payload.type === "INGEST_ACCOUNT") {
        return ingestGameAccount(payload.gameAccountId);
      }
      if (payload.type === "INGEST_USER_ALL") {
        return ingestUserAll(payload.userId);
      }
      throw new Error("Unknown ingest job");
    },
    { connection: redis as any, concurrency: 4 }
  );

  const computeWorker = new Worker(
    "compute",
    async (job) => {
      const payload = job.data as ComputeJob;
      const dateStr = todayUtc();

      if (payload.type === "GENERATE_DAILY") {
        const isActive = await getSubscriptionActive(payload.userId);
        const count = isActive ? 3 : 1;
        await ensureDailyQuests(payload.userId, payload.date, count, isActive);
        await ensureDailyBrief(payload.userId, payload.date);
        await recomputeQuestProgress(payload.userId, payload.date);
        await upsertDailySkillScores(payload.userId, payload.date);
        return { ok: true };
      }
      if (payload.type === "RECOMPUTE_SKILLS") {
        await upsertDailySkillScores(payload.userId, todayUtc());
        return { ok: true };
      }
      if (payload.type === "RECOMPUTE_QUESTS") {
        await recomputeQuestProgress(payload.userId, payload.date);
        return { ok: true };
      }

      if (payload.type === "TRIGGER_DAILY") {
        await runDaily(dateStr, computeQueue);
        return { ok: true };
      }
      if (payload.type === "TRIGGER_STREAK") {
        await runStreakWarning(dateStr);
        return { ok: true };
      }
      if (payload.type === "TRIGGER_WEEKLY") {
        await runWeeklyArcEndingSoon();
        return { ok: true };
      }
      if (payload.type === "TRIGGER_POLL") {
        await enqueuePollIngest(ingestQueue);
        return { ok: true };
      }

      throw new Error("Unknown compute job");
    },
    { connection: redis as any, concurrency: 2 }
  );

  ingestWorker.on("failed", (job, err) => {
    console.error("Ingest job failed", job?.id, err);
  });
  computeWorker.on("failed", (job, err) => {
    console.error("Compute job failed", job?.id, err);
  });

  const opts = { removeOnComplete: true, removeOnFail: true };

  await computeQueue.add("poll-ingest", { type: "TRIGGER_POLL" }, { ...opts, repeat: { pattern: "*/30 * * * *" } });
  await computeQueue.add("daily-reset", { type: "TRIGGER_DAILY" }, { ...opts, repeat: { pattern: "5 0 * * *" } });
  await computeQueue.add("streak-warning", { type: "TRIGGER_STREAK" }, { ...opts, repeat: { pattern: "0 20 * * *" } });
  await computeQueue.add("weekly-arc", { type: "TRIGGER_WEEKLY" }, { ...opts, repeat: { pattern: "0 18 * * 0" } });

  console.log("Worker started, schedulers armed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
