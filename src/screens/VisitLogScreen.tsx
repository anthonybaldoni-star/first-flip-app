import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSubscription } from "../context/SubscriptionContext";
import PaywallModal from "../components/PaywallModal";
import { HeaderQuickLinks } from "../components/HeaderQuickLinks";
import {
  canUseAiVision,
  canUseUnlimitedPhotos,
  maxFreePhotosPerProperty,
} from "../lib/featureGating";
import { analyzeVisitPhotos, type AiVisionResult } from "../lib/aiVisionAnalyzer";
import { formatEstimateTimestamp } from "../lib/propertyEstimate";

const STORAGE_KEY = "firstflip_visit_log_v1";

type Persisted = {
  visited: boolean;
  notes: string;
  photoUris: string[];
  visionResult?: AiVisionResult | null;
};

export default function VisitLogScreen() {
  const navigation = useNavigation();
  const { tier, isLoading: subscriptionLoading } = useSubscription();
  const [visited, setVisited] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [visionResult, setVisionResult] = useState<AiVisionResult | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);

  const maxPhotos = canUseUnlimitedPhotos(tier) ? 999 : maxFreePhotosPerProperty();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderQuickLinks active="visit-log" />,
    });
  }, [navigation]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Persisted;
          setVisited(!!p.visited);
          setNotes(p.notes ?? "");
          setPhotoUris(Array.isArray(p.photoUris) ? p.photoUris : []);
          setVisionResult(p.visionResult ?? null);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Persisted = { visited, notes, photoUris, visionResult };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [visited, notes, photoUris, visionResult, hydrated]);

  const openPaywall = (reason: string) => {
    setPaywallReason(reason);
    setShowPaywall(true);
  };

  const pickPhotos = async () => {
    if (photoUris.length >= maxPhotos) {
      if (!canUseUnlimitedPhotos(tier)) {
        openPaywall("Upgrade for unlimited photos & storage per property.");
      }
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: canUseUnlimitedPhotos(tier),
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const next = [...photoUris];
      for (const a of result.assets) {
        if (next.length >= maxPhotos) {
          if (!canUseUnlimitedPhotos(tier)) openPaywall("Upgrade for unlimited photos & storage.");
          break;
        }
        next.push(a.uri);
      }
      setPhotoUris(next);
    } catch (e) {
      if (__DEV__) console.warn("[VisitLog] pickPhotos", e);
    }
  };

  const runAiVision = async () => {
    if (!canUseAiVision(tier)) {
      openPaywall("AI Vision Renovation Analyzer is included with Pro.");
      return;
    }
    setVisionLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 650));
      const result = analyzeVisitPhotos(photoUris.length, notes);
      setVisionResult(result);
    } catch (e) {
      if (__DEV__) console.warn("[VisitLog] AI Vision", e);
    } finally {
      setVisionLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#38bdf8" size="large" />
        <Text className="mt-3 text-slate-400">Loading subscription…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text className="mb-4 text-2xl font-bold text-white">Visit Log</Text>

      <Pressable
        onPress={() => setVisited(!visited)}
        className="mb-4 flex-row items-center rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <View
          className={`mr-3 h-6 w-6 rounded border-2 ${
            visited ? "border-emerald-500 bg-emerald-500" : "border-slate-500"
          }`}
        />
        <Text className="text-lg text-white">Visited</Text>
      </Pressable>

      <Text className="mb-2 font-semibold text-slate-300">Notes</Text>
      <TextInput
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Detailed walkthrough notes…"
        placeholderTextColor="#64748b"
        className="mb-4 min-h-[120px] rounded-xl border border-slate-800 bg-slate-900 p-3 text-base text-white"
      />

      <Text className="mb-2 font-semibold text-slate-300">Photo gallery</Text>
      <Text className="mb-2 text-sm text-slate-500">
        {canUseUnlimitedPhotos(tier)
          ? "Pro: unlimited photos & storage."
          : `Free tier: up to ${maxFreePhotosPerProperty()} photos per property.`}
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {photoUris.map((uri) => (
          <Image key={uri} source={{ uri }} className="h-24 w-24 rounded-lg" />
        ))}
      </View>
      <Pressable
        onPress={pickPhotos}
        className="mb-6 rounded-xl bg-slate-800 py-3 active:opacity-90"
      >
        <Text className="text-center font-semibold text-white">Add photos</Text>
      </Pressable>

      {!canUseAiVision(tier) && (
        <Pressable
          onPress={() => openPaywall("Upgrade to run AI Vision on your visit photos.")}
          className="mb-3 rounded-xl border border-violet-700/40 bg-violet-950/40 p-3 active:opacity-90"
        >
          <Text className="text-center text-sm font-semibold text-violet-200">
            AI Vision is a Pro feature — tap to upgrade
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={runAiVision}
        disabled={visionLoading}
        className={`rounded-xl bg-violet-600 py-5 active:opacity-90 ${visionLoading ? "opacity-70" : ""} ${!canUseAiVision(tier) ? "opacity-60" : ""}`}
        accessibilityRole="button"
        accessibilityLabel="AI Vision Renovation Analyzer"
      >
        <Text className="text-center text-xl font-bold text-white">
          AI Vision Renovation Analyzer
        </Text>
        <Text className="mt-2 text-center text-base text-violet-100">
          Analyze renovation scope from uploaded photos (timestamped + confidence)
        </Text>
        {!canUseAiVision(tier) && (
          <Text className="mt-2 text-center text-sm font-semibold text-amber-200">
            Locked — Upgrade to Pro to unlock
          </Text>
        )}
      </Pressable>

      {visionLoading && (
        <View className="mt-4 flex-row items-center justify-center gap-3 py-4">
          <ActivityIndicator color="#a78bfa" />
          <Text className="text-slate-400">Analyzing photos…</Text>
        </View>
      )}

      {visionResult && !visionLoading && (
        <View className="mt-6 mb-10 rounded-2xl border border-violet-900/50 bg-slate-900 p-4">
          <Text className="text-lg font-semibold text-white">AI Vision suggestions</Text>
          <Text className="mt-1 text-xs text-slate-500">
            Generated {formatEstimateTimestamp(visionResult.generatedAt)} · Confidence ±
            {visionResult.confidencePct}% · Photos used: {visionResult.photoCountUsed}
          </Text>
          <Text className="mt-2 text-sm font-semibold text-emerald-400">
            Overall rehab risk: {visionResult.overallRisk}
          </Text>
          <Text className="mt-3 text-base leading-6 text-slate-200">{visionResult.summary}</Text>

          <Text className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Line items
          </Text>
          {visionResult.items.map((item) => (
            <View
              key={item.id}
              className="mb-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3"
            >
              <View className="mb-1 flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-xs font-semibold uppercase text-sky-400">{item.category}</Text>
                <Text
                  className={`text-xs font-bold ${
                    item.priority === "High"
                      ? "text-rose-400"
                      : item.priority === "Medium"
                        ? "text-amber-300"
                        : "text-slate-400"
                  }`}
                >
                  {item.priority}
                </Text>
              </View>
              <Text className="text-base text-white">{item.finding}</Text>
              <Text className="mt-2 text-sm text-slate-300">{item.suggestedAction}</Text>
              <Text className="mt-2 text-xs text-slate-500">Est. band: {item.estCostBand}</Text>
            </View>
          ))}
        </View>
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          setPaywallReason(undefined);
        }}
        reason={paywallReason}
      />
    </ScrollView>
  );
}
