import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  term: string;
  definition: string;
};

/** Small [ℹ️] next to key terms — PRD flyover / tooltip system. */
export function FlyoverTooltip({ term, definition }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Information about ${term}`}
        className="ml-1"
      >
        <Text className="text-base text-sky-400">ℹ️</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/50 px-6" onPress={() => setOpen(false)}>
          <View className="rounded-2xl bg-slate-800 p-5">
            <Text className="mb-2 text-lg font-semibold text-white">{term}</Text>
            <Text className="text-base leading-6 text-slate-200">{definition}</Text>
            <Pressable className="mt-4 self-end" onPress={() => setOpen(false)}>
              <Text className="text-sky-400">Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
