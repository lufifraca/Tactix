import { prisma } from "../../prisma";

function dateStrUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function bumpStreakOnDate(userId: string, dateStr: string) {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  const today = dateStr;
  const yesterday = dateStrUtc(new Date(Date.parse(`${today}T00:00:00Z`) - 24 * 60 * 60 * 1000));

  if (!streak) {
    await prisma.streak.create({
      data: { userId, current: 1, best: 1, lastCompletedDate: new Date(`${today}T00:00:00.000Z`) },
    });
    return;
  }

  const last = streak.lastCompletedDate ? dateStrUtc(streak.lastCompletedDate) : null;

  if (last === today) return;

  const nextCurrent = last === yesterday ? streak.current + 1 : 1;
  const nextBest = Math.max(streak.best, nextCurrent);

  await prisma.streak.update({
    where: { userId },
    data: {
      current: nextCurrent,
      best: nextBest,
      lastCompletedDate: new Date(`${today}T00:00:00.000Z`),
    },
  });
}
