import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-4">
      <Text className="mb-4 text-lg text-white">This screen does not exist.</Text>
      <Link href="/">
        <Text className="text-lg text-sky-400">Go to Dashboard</Text>
      </Link>
    </View>
  );
}
