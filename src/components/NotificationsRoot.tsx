import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

/**
 * Registers notification behavior and routes notification taps (e.g. open Deal Scanner).
 * Wrapped in try/catch so Expo Go never crashes if expo-notifications fails to initialize.
 */
export function NotificationsRoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    let sub: { remove: () => void } | undefined;

    void (async () => {
      try {
        const Notifications = await import("expo-notifications");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });

        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const screen = response.notification.request.content.data?.screen;
          if (screen === "scanner") {
            router.push("/scanner");
          }
          if (screen === "deals") {
            router.push("/deals");
          }
        });
      } catch (e) {
        if (__DEV__) {
          console.warn("[notifications] init skipped:", e);
        }
      }
    })();

    return () => {
      sub?.remove();
    };
  }, [router]);

  return <>{children}</>;
}
