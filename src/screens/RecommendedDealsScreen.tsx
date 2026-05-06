import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSubscription } from "../context/SubscriptionContext";
import PaywallModal from "../components/PaywallModal";
import { HeaderQuickLinks } from "../components/HeaderQuickLinks";
import { GEOGRAPHIES, runAutomaticScanAsync, type ScannedDeal } from "../lib/dealScanner";
import { canSeeLlmScoredDeals } from "../lib/featureGating";
import { formatEstimateTimestamp } from "../lib/propertyEstimate";

/**
 * PRD: Recommended Deals with LLM scores — dedicated entry (also summarized on Dashboard).
 * CODE-SKELETONS: free → upgrade CTA + PaywallModal; paid → full ranked list.
 */
export default function RecommendedDealsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tier, isLoading } = useSubscription();
  const [regionIndex, setRegionIndex] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [deals, setDeals] = useState<ScannedDeal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  const loadDeals = useCallback(async () => {
    setDealsLoading(true);
    try {
      const d = await runAutomaticScanAsync(regionIndex, refreshNonce);
      setDeals(d);
    } finally {
      setDealsLoading(false);
    }
  }, [regionIndex, refreshNonce]);

  useEffect(() => {
    if (!canSeeLlmScoredDeals(tier)) return;
    void loadDeals();
  }, [tier, regionIndex, refreshNonce, loadDeals]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderQuickLinks active="deals" />,
    });
  }, [navigation]);

  const openPaywall = () => setShowPaywall(true);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#38bdf8" size="large" />
        <Text className="mt-3 text-slate-400">Loading…</Text>
      </View>
    );
  }

  if (!canSeeLlmScoredDeals(tier)) {
    return (
      <ScrollView
        className="flex-1 bg-slate-950 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text className="mb-2 text-2xl font-bold text-white">Recommended Deals</Text>
        <Text className="mb-6 text-base leading-6 text-slate-400">
          LLM-scored deal rankings are available on Pro. Free users see manual analysis on the
          Dashboard; upgrade to unlock ranked opportunities near you.
        </Text>
        <Pressable
          onPress={openPaywall}
          className="mb-4 rounded-xl border border-amber-600/50 bg-amber-950/40 p-4 active:opacity-90"
        >
          <Text className="text-center text-base font-semibold text-amber-200">
            Unlock Automatic Deal Scanner with LLM Scoring – Upgrade to Pro
          </Text>
        </Pressable>
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          reason="LLM-ranked deals and scanner features are included with Pro."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <Text className="mb-1 text-2xl font-bold text-white">Recommended Deals</Text>
      <Text className="mb-4 text-slate-400">
        LLM-ranked opportunities (highest score first). Same ranking engine as the Automatic Deal
        Scanner.
      </Text>

      <View className="mb-4 flex-row gap-2">
        <Pressable
          onPress={() => setRefreshNonce((n) => n + 1)}
          className="flex-1 rounded-xl bg-emerald-700 py-3 active:opacity-90"
          disabled={dealsLoading}
        >
          <Text className="text-center font-semibold text-white">Refresh rankings</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/scanner")}
          className="flex-1 rounded-xl bg-slate-800 py-3 active:opacity-90"
        >
          <Text className="text-center font-semibold text-sky-300">Open Scanner</Text>
        </Pressable>
      </View>

      <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Region
      </Text>
      <View className="mb-5 flex-row flex-wrap gap-2">
        {GEOGRAPHIES.map((g, i) => (
          <Pressable
            key={g.key}
            onPress={() => {
              setRegionIndex(i);
              setRefreshNonce(0);
            }}
            className={`rounded-full px-4 py-2 ${regionIndex === i ? "bg-sky-600" : "bg-slate-800"}`}
          >
            <Text className="text-sm text-white">{g.label}</Text>
          </Pressable>
        ))}
      </View>

      {dealsLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color="#34d399" />
          <Text className="mt-2 text-sm text-slate-500">Running LLM ranking…</Text>
        </View>
      ) : null}

      {!dealsLoading
        ? deals.map((d, rank) => (
            <View key={d.id} className="mb-4 rounded-2xl border border-emerald-900/40 bg-slate-900 p-4">
              <Text className="text-xs font-semibold uppercase text-slate-500">
                Rank #{rank + 1} · {d.region}
              </Text>
              <Text className="mt-1 text-lg font-semibold text-white">{d.address}</Text>
              <Text className="mt-2 text-slate-200">
                List ${d.listPrice.toLocaleString()} · Est. ARV ${d.arvEstimate.toLocaleString()}
              </Text>
              <Text className="mt-3 text-xl font-bold text-emerald-400">LLM score: {d.llmScore}</Text>
              <Text className="mt-1 text-xs text-slate-500">
                Confidence ±{d.confidencePct}% · {formatEstimateTimestamp(d.scoredAt)} ·{" "}
                {d.scoringSource === "remote_llm" ? "Remote LLM" : "On-device heuristic"}
              </Text>
              <Text className="mt-2 text-sm text-slate-300">{d.rationale}</Text>
            </View>
          ))
        : null}
    </ScrollView>
  );
}
