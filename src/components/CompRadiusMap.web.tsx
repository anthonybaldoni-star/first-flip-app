import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { DEFAULT_COMP_RADIUS_MILES } from "../lib/propertyEstimate";

type Point = { latitude: number; longitude: number };

export type CompPin = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Props = {
  subject: Point & { label: string };
  comps: CompPin[];
  radiusMiles?: number;
};

export function CompRadiusMap({ subject, comps, radiusMiles = DEFAULT_COMP_RADIUS_MILES }: Props) {
  const openGoogle = () => {
    const q = encodeURIComponent(subject.label || `${subject.latitude},${subject.longitude}`);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <View className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-4">
      <Text className="text-center text-sm font-semibold text-slate-200">{subject.label}</Text>
      <Text className="mt-1 text-center text-xs text-slate-500">
        {subject.latitude.toFixed(5)}, {subject.longitude.toFixed(5)}
      </Text>
      <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
        Comp radius preview: {comps.length} comparable pin{comps.length === 1 ? "" : "s"} within ~
        {radiusMiles.toFixed(2)} miles.
      </Text>
      <Pressable onPress={openGoogle} className="mt-3 rounded-lg bg-slate-800 py-2 active:opacity-90">
        <Text className="text-center text-sm font-semibold text-sky-400">View on Google Maps</Text>
      </Pressable>
    </View>
  );
}
