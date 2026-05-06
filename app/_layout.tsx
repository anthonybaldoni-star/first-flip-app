import "../global.css";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SubscriptionProvider } from "../src/context/SubscriptionContext";
import { NotificationsRoot } from "../src/components/NotificationsRoot";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SubscriptionProvider>
        <NotificationsRoot>
          <StatusBar style="light" />
          <Slot />
        </NotificationsRoot>
      </SubscriptionProvider>
    </SafeAreaProvider>
  );
}
