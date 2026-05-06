import React from "react";
import { Platform, Text, View } from "react-native";

type Props = {
  latitude: number;
  longitude: number;
  label: string;
};

function loadMaps(): {
  MapView: React.ComponentType<any>;
  Marker: React.ComponentType<any>;
} | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const maps = require("react-native-maps") as typeof import("react-native-maps");
    return { MapView: maps.default, Marker: maps.Marker };
  } catch {
    return null;
  }
}

/** Embedded pin preview on native (Expo Go); web shows coordinates + copy hint (full MapView excluded from web bundle). */
export function PropertyMiniMap({ latitude, longitude, label }: Props) {
  const maps = loadMaps();

  if (!maps) {
    return (
      <View className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-4">
        <Text className="text-center text-xs text-slate-500">
          Approx. {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
        <Text className="mt-2 text-center text-sm text-slate-400">
          Full map preview runs on iOS/Android in Expo Go. Use Pin in Maps below on web.
        </Text>
      </View>
    );
  }

  const { MapView, Marker } = maps;

  return (
    <View className="mt-3 overflow-hidden rounded-xl border border-slate-800">
      <MapView
        style={{ height: 176, width: "100%" }}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        loadingEnabled={false}
        scrollEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        zoomEnabled={false}
      >
        <Marker coordinate={{ latitude, longitude }} title={label} />
      </MapView>
      <Text className="bg-slate-950/90 px-3 py-2 text-center text-xs text-slate-400">
        Preview · Use buttons below for Google / Apple Maps app
      </Text>
    </View>
  );
}
