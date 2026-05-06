import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";

type Props = {
  address: string;
  disabled?: boolean;
};

/** Google Maps via native app / web: property pin + driving directions (PRD Google Maps integration). */
export function PropertyMapLinks({ address, disabled }: Props) {
  const trimmed = address.trim();

  const openPin = () => {
    if (!trimmed || disabled) return;
    const q = encodeURIComponent(trimmed);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const openDirections = async () => {
    if (!trimmed || disabled) return;
    const dest = encodeURIComponent(trimmed);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      void Linking.openURL(
        `https://www.google.com/maps/dir/${latitude},${longitude}/${encodeURIComponent(trimmed)}`,
      );
    } catch {
      void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
    }
  };

  return (
    <View className="mt-3 flex-row gap-2">
      <Pressable
        onPress={openPin}
        disabled={!trimmed || disabled}
        className={`flex-1 rounded-xl py-3 ${!trimmed || disabled ? "bg-slate-900" : "bg-slate-800 active:opacity-90"}`}
      >
        <Text className="text-center text-sm font-semibold text-sky-400">Pin in Maps</Text>
      </Pressable>
      <Pressable
        onPress={openDirections}
        disabled={!trimmed || disabled}
        className={`flex-1 rounded-xl py-3 ${!trimmed || disabled ? "bg-slate-900" : "bg-slate-800 active:opacity-90"}`}
      >
        <Text className="text-center text-sm font-semibold text-sky-400">Directions</Text>
      </Pressable>
    </View>
  );
}
