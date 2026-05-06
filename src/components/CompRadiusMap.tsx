import React, { useMemo } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
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
  /** Search radius ring (miles). */
  radiusMiles?: number;
};

function regionForPoints(points: Point[]): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  if (points.length === 0) {
    return { latitude: 30.3, longitude: -97.73, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * 2.8, 0.035);
  const lngDelta = Math.max((maxLng - minLng) * 2.8, 0.035);
  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: Math.max(latDelta, 0.052),
    longitudeDelta: Math.max(lngDelta, 0.052),
  };
}

function loadMaps(): {
  MapView: React.ComponentType<any>;
  Marker: React.ComponentType<any>;
  Circle: React.ComponentType<any>;
} | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const maps = require("react-native-maps") as typeof import("react-native-maps");
    return { MapView: maps.default, Marker: maps.Marker, Circle: maps.Circle };
  } catch {
    return null;
  }
}

/**
 * PRD: Google Maps–style comp radius — subject pin, comparable pins, search radius ring.
 * Native: MapView + Circle. Web: fallback + link (Expo Go uses native).
 */
export function CompRadiusMap({
  subject,
  comps,
  radiusMiles = DEFAULT_COMP_RADIUS_MILES,
}: Props) {
  const radiusMeters = radiusMiles * 1609.34;
  const points = useMemo(() => [subject, ...comps], [subject, comps]);
  const region = useMemo(() => regionForPoints(points), [points]);
  const maps = loadMaps();

  const openCenter = () => {
    const q = encodeURIComponent(`${subject.latitude},${subject.longitude}`);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  if (!maps) {
    return (
      <View className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-4">
        <Text className="text-center text-sm leading-5 text-slate-400">
          Comp radius preview: {comps.length} demo pin{comps.length === 1 ? "" : "s"} within ~
          {radiusMiles.toFixed(2)} mi. Embedded map runs on iOS/Android in Expo Go.
        </Text>
        <Pressable onPress={openCenter} className="mt-3 rounded-lg bg-slate-800 py-2 active:opacity-90">
          <Text className="text-center text-sm font-semibold text-sky-400">Open in Google Maps</Text>
        </Pressable>
      </View>
    );
  }

  const { MapView, Marker, Circle } = maps;

  return (
    <View className="overflow-hidden rounded-xl border border-slate-800">
      <MapView style={{ height: 228, width: "100%" }} initialRegion={region} loadingEnabled={false}>
        <Circle
          center={{ latitude: subject.latitude, longitude: subject.longitude }}
          radius={radiusMeters}
          strokeWidth={2}
          strokeColor="rgba(56, 189, 248, 0.95)"
          fillColor="rgba(56, 189, 248, 0.07)"
        />
        <Marker coordinate={{ latitude: subject.latitude, longitude: subject.longitude }} title={subject.label} />
        {comps.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.latitude, longitude: c.longitude }}
            title={c.address}
            description="Comparable sale (demo)"
          />
        ))}
      </MapView>
      <Text className="bg-slate-950/90 px-2 py-1.5 text-center text-xs text-slate-500">
        ~{radiusMiles.toFixed(2)} mi radius · Demo comps — replace with live MLS/comps API
      </Text>
    </View>
  );
}
