import { Platform } from "react-native";
import type { ScannedDeal } from "./dealScanner";

/**
 * Pro tier: deal-scan alerts (PRD). Local notifications in-app; ship remote push via backend + Expo tokens for prod.
 */

const ANDROID_CHANNEL = "deal-scan";

type NotificationsModule = typeof import("expo-notifications");

/**
 * Web safety: avoid evaluating expo-notifications at module import time.
 * Some web runtimes surface storage-related errors if this module is eagerly loaded.
 */
async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Deal scan alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    /* Expo Go / permission edge cases */
  }
}

export async function requestDealAlertPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  try {
    await ensureAndroidChannel();
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch {
    return false;
  }
}

export async function notifyScanComplete(topDeal: ScannedDeal): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "First Flip — scan complete",
        body: `Top match: ${topDeal.address} · LLM score ${topDeal.llmScore}`,
        data: { screen: "scanner" },
        sound: true,
        ...(Platform.OS === "android"
          ? { android: { channelId: ANDROID_CHANNEL } }
          : {}),
      },
      trigger: null,
    });
  } catch {
    /* ignore */
  }
}

let digestNotificationId: string | null = null;

/** Daily local reminder for Pro — replace with server-driven push in production. */
export async function scheduleDailyDealDigest(enabled: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await ensureAndroidChannel();

    if (digestNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(digestNotificationId);
      digestNotificationId = null;
    }

    if (!enabled) return;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "First Flip — daily deal check",
        body: "Review LLM-ranked deals in Recommended Deals or the Scanner.",
        data: { screen: "deals" },
        ...(Platform.OS === "android"
          ? { android: { channelId: ANDROID_CHANNEL } }
          : {}),
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });
    digestNotificationId = id;
  } catch {
    digestNotificationId = null;
  }
}
