import React from "react";
import { Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

type Props = {
  latitude: number;
  longitude: number;
  label: string;
};

export function PropertyMiniMap({ latitude, longitude, label }: Props) {
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
        showsCompass={false}
        toolbarEnabled={false}
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
