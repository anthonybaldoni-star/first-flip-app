import React from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Href, useRouter } from "expo-router";

export type HeaderTabKey =
  | "index"
  | "intake"
  | "deals"
  | "visit-log"
  | "chat"
  | "scanner"
  | "rehab";

const LINKS: {
  key: HeaderTabKey;
  href: Href;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}[] = [
  { key: "index", href: "/", icon: "home-outline", label: "Dashboard" },
  { key: "intake", href: "/intake", icon: "link-outline", label: "Property Intake" },
  { key: "deals", href: "/deals", icon: "star-outline", label: "Recommended Deals" },
  { key: "visit-log", href: "/visit-log", icon: "walk-outline", label: "Visit Log" },
  { key: "chat", href: "/chat", icon: "chatbubbles-outline", label: "LLM Chat" },
  { key: "scanner", href: "/scanner", icon: "compass-outline", label: "Deal Scanner" },
  { key: "rehab", href: "/rehab", icon: "construct-outline", label: "Rehab Budget" },
];

/** Cross-links primary tabs from the stack header (React Navigation + Expo Router). */
export function HeaderQuickLinks({ active }: { active: HeaderTabKey }) {
  const router = useRouter();

  return (
    <View className="mr-1 max-w-[340px] flex-row flex-wrap items-center justify-end gap-x-2 gap-y-1">
      {LINKS.filter((l) => l.key !== active).map((l) => (
        <Pressable
          key={l.key}
          onPress={() => router.push(l.href)}
          accessibilityRole="button"
          accessibilityLabel={l.label}
          hitSlop={6}
        >
          <Ionicons name={l.icon} size={20} color="#38bdf8" />
        </Pressable>
      ))}
    </View>
  );
}
