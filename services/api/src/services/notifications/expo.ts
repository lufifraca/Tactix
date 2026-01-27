import { Expo } from "expo-server-sdk";
import { env } from "../../env";
import { prisma } from "../../prisma";

const expo = new Expo(env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : undefined);

export async function sendPushToUser(userId: string, message: { title: string; body: string; data?: any }) {
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  const messages = tokens
    .map((t) => t.token)
    .filter((t) => Expo.isExpoPushToken(t))
    .map((token) => ({
      to: token,
      sound: "default" as const,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch {
      // ignore for v1
    }
  }
}

export async function sendPushToUsers(userIds: string[], message: { title: string; body: string; data?: any }) {
  for (const uid of userIds) {
    await sendPushToUser(uid, message);
  }
}
