import React, { useState } from "react";
import { Image, Text, View } from "react-native";

/** Intake demo photos (remote URLs): graceful fallback if CDN fails — keeps Expo Go layout stable. */
export function ListingPhotoThumb({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View className="h-24 w-[31%] items-center justify-center rounded-lg bg-slate-800 px-1">
        <Text className="text-center text-xs text-slate-500">Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      accessibilityLabel="Listing photo"
      className="h-24 w-[31%] rounded-lg bg-slate-800"
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}
