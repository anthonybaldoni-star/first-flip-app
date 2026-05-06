import React, { useMemo } from "react";
import { Text, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
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

function regionForPoints(points: Point[]) {
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

export function CompRadiusMap({ subject, comps, radiusMiles = DEFAULT_COMP_RADIUS_MILES }: Props) {
  const radiusMeters = radiusMiles * 1609.34;
  const points = useMemo(() => [subject, ...comps], [subject, comps]);
  const region = useMemo(() => regionForPoints(points), [points]);

  return (
    <View className="overflow-hidden rounded-xl border border-slate-800">
      <MapView
        style={{ height: 228, width: "100%" }}
        initialRegion={region}
        loadingEnabled={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
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
