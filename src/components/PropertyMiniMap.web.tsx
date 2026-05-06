import React from "react";
import { Linking, Pressable, Text, View } from "react-native";

type Props = {
  latitude: number;
  longitude: number;
  label: string;
};

export function PropertyMiniMap({ latitude, longitude, label }: Props) {
  const openGoogle = () => {
    const q = encodeURIComponent(label || `${latitude},${longitude}`);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <View className="mt-3 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-4">
      <Text className="text-center text-sm font-semibold text-slate-200">{label}</Text>
      <Text className="mt-1 text-center text-xs text-slate-500">
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
      <Text className="mt-2 text-center text-sm text-slate-400">
        Interactive map preview is native-only on iOS/Android.
      </Text>
      <Pressable onPress={openGoogle} className="mt-3 rounded-lg bg-slate-800 py-2 active:opacity-90">
        <Text className="text-center text-sm font-semibold text-sky-400">View on Google Maps</Text>
      </Pressable>
    </View>
  );
}
