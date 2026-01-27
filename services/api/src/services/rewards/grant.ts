import { nanoid } from "nanoid";
import { prisma } from "../../prisma";
import { putObject } from "../storage";
import { sha256Hex } from "../../utils/crypto";
import { badgeSvg, cardSvg } from "./svgTemplates";
import { renderSvgToPng } from "./render";

function shareUrl(shareId: string, webBaseUrl: string) {
  return `${webBaseUrl.replace(/\/$/, "")}/share/${shareId}`;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function grantRewardForQuestCompletion(params: {
  userId: string;
  questId: string;
  dateStr: string;
  webBaseUrl: string;
}) {
  const quest = await prisma.quest.findUnique({ where: { id: params.questId } });
  if (!quest) return;

  // idempotency: if reward meta already references questId, don't create duplicates
  const existing = await prisma.reward.findFirst({
    where: { userId: params.userId, meta: { path: ["questId"], equals: params.questId } as any },
  });
  if (existing) return;

  const domain = quest.domain as any;
  const date = params.dateStr;

  const badgeShareId = nanoid(18);
  const badgeSvgStr = badgeSvg({
    title: "Daily Quest",
    subtitle: quest.title,
    date,
    domain,
  });
  const badgePng = renderSvgToPng(badgeSvgStr, { width: 512 });
  const badgeKey = `rewards/${params.userId}/${date}/${badgeShareId}.png`;

  await putObject({ key: badgeKey, body: badgePng, contentType: "image/png" });

  await prisma.reward.create({
    data: {
      userId: params.userId,
      type: "BADGE",
      title: "Daily Quest",
      caption: quest.title,
      assetS3Key: badgeKey,
      shareId: badgeShareId,
      isPublic: false,
      meta: { questId: params.questId, kind: "badge", sha256: sha256Hex(badgePng) },
    },
  });

  const cardShareId = nanoid(18);
  const prog: any = quest.progress ?? {};
  const statLine =
    typeof prog?.detail?.ratio === "number"
      ? `ratio=${(prog.detail.ratio as number).toFixed(2)} target=${(prog.target as number).toFixed(2)}`
      : `progress=${Math.round((prog.pct ?? 1) * 100)}%`;

  const cardSvgStr = cardSvg({
    headline: "Quest complete",
    subline: quest.title,
    statLine,
    date,
  });
  const cardPng = renderSvgToPng(cardSvgStr, { width: 1200 });
  const cardKey = `rewards/${params.userId}/${date}/${cardShareId}.png`;

  await putObject({ key: cardKey, body: cardPng, contentType: "image/png" });

  await prisma.reward.create({
    data: {
      userId: params.userId,
      type: "CARD",
      title: quest.title,
      caption: "Shareable card",
      assetS3Key: cardKey,
      shareId: cardShareId,
      isPublic: false,
      meta: { questId: params.questId, kind: "card", sha256: sha256Hex(cardPng) },
    },
  });
}


export async function grantDailyClearRewardIfEligible(params: {
  userId: string;
  dateStr: string;
  webBaseUrl: string;
  requiredCount: number;
}) {
  const date = new Date(`${params.dateStr}T00:00:00.000Z`);
  const completed = await prisma.quest.count({ where: { userId: params.userId, date, status: "COMPLETED" } });
  if (completed < params.requiredCount) return;

  // Idempotency: one clear reward per date
  const existing = await prisma.reward.findFirst({
    where: { userId: params.userId, meta: { path: ["dailyClearDate"], equals: params.dateStr } as any },
  });
  if (existing) return;

  const shareId = nanoid(18);
  const svg = cardSvg({
    headline: params.requiredCount >= 3 ? "Full clear" : "Daily clear",
    subline: `Completed ${completed}/${params.requiredCount} quests`,
    statLine: "coach-style consistency wins",
    date: params.dateStr,
  });
  const png = renderSvgToPng(svg, { width: 1200 });
  const key = `rewards/${params.userId}/${params.dateStr}/${shareId}.png`;
  await putObject({ key, body: png, contentType: "image/png" });

  await prisma.reward.create({
    data: {
      userId: params.userId,
      type: "CARD",
      title: params.requiredCount >= 3 ? "Full clear" : "Daily clear",
      caption: "All quests completed",
      assetS3Key: key,
      shareId,
      isPublic: false,
      meta: { dailyClearDate: params.dateStr, requiredCount: params.requiredCount, sha256: sha256Hex(png) },
    },
  });
}
