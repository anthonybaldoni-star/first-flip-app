import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSubscription } from "../context/SubscriptionContext";
import PaywallModal from "../components/PaywallModal";
import { HeaderQuickLinks } from "../components/HeaderQuickLinks";
import { GEOGRAPHIES, runAutomaticScanAsync, type ScannedDeal } from "../lib/dealScanner";
import {
  requestDealAlertPermissions,
  notifyScanComplete,
  scheduleDailyDealDigest,
} from "../lib/dealScanNotifications";
import { canReceiveDealPushNotifications } from "../lib/featureGating";
import { formatEstimateTimestamp } from "../lib/propertyEstimate";

const PREFS_KEY = "firstflip_scanner_notify_prefs";

type NotifyPrefs = {
  instantAlerts: boolean;
  dailyDigest: boolean;
};

const defaultPrefs: NotifyPrefs = { instantAlerts: false, dailyDigest: false };

/**
 * CODE-SKELETONS: free tier → paywall + Upgrade CTA; paid → geography + LLM scores + alerts (PRD).
 */
export default function DealScannerScreen() {
  const navigation = useNavigation();
  const { tier, isLoading } = useSubscription();
  const [regionIndex, setRegionIndex] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [prefs, setPrefs] = useState<NotifyPrefs>(defaultPrefs);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [deals, setDeals] = useState<ScannedDeal[]>([]);

  /** Region changes reload at nonce 0; manual “Run new scan” bumps nonce inside `runNewScan` only (no duplicate fetch). */
  useEffect(() => {
    if (tier === "free") return;
    let cancelled = false;
    setScanBusy(true);
    setDeals([]);
    void runAutomaticScanAsync(regionIndex, 0)
      .then((d) => {
        if (!cancelled) setDeals(d);
      })
      .finally(() => {
        if (!cancelled) setScanBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tier, regionIndex]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderQuickLinks active="scanner" />,
    });
  }, [navigation]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) setPrefs({ ...defaultPrefs, ...(JSON.parse(raw) as NotifyPrefs) });
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!prefsLoaded || tier === "free") return;
    void scheduleDailyDealDigest(prefs.dailyDigest);
  }, [prefsLoaded, prefs.dailyDigest, tier]);

  const persistPrefs = useCallback(async (next: NotifyPrefs) => {
    setPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }, []);

  const handleUpgradePress = () => {
    setShowPaywall(true);
  };

  const runNewScan = async () => {
    if (tier === "free") {
      setShowPaywall(true);
      return;
    }
    setScanBusy(true);
    try {
      const next = refreshNonce + 1;
      const latest = await runAutomaticScanAsync(regionIndex, next);
      setDeals(latest);
      setRefreshNonce(next);

      if (
        Platform.OS !== "web" &&
        canReceiveDealPushNotifications(tier) &&
        prefsLoaded &&
        prefs.instantAlerts &&
        latest[0]
      ) {
        const granted = await requestDealAlertPermissions();
        if (granted) await notifyScanComplete(latest[0]);
      }
    } finally {
      setScanBusy(false);
    }
  };

  const onToggleInstant = async (value: boolean) => {
    if (tier === "free") {
      setShowPaywall(true);
      return;
    }
    if (value) {
      const ok = await requestDealAlertPermissions();
      if (!ok) return;
    }
    await persistPrefs({ ...prefs, instantAlerts: value });
  };

  const onToggleDigest = async (value: boolean) => {
    if (tier === "free") {
      setShowPaywall(true);
      return;
    }
    if (value) {
      const ok = await requestDealAlertPermissions();
      if (!ok) return;
    }
    await persistPrefs({ ...prefs, dailyDigest: value });
    await scheduleDailyDealDigest(value);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#38bdf8" />
        <Text className="mt-3 text-slate-400">Loading…</Text>
      </View>
    );
  }

  if (tier === "free") {
    return (
      <ScrollView className="flex-1 bg-slate-950 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mb-4 text-2xl font-bold text-white">Deal Scanner</Text>
        <Text className="mb-6 text-slate-400">
          Geography-based scanning, LLM-ranked recommendations, and deal alerts require Pro. Server-side
          subscription checks apply on every protected API (PRD).
        </Text>
        <Pressable
          onPress={handleUpgradePress}
          className="mb-4 rounded-xl border border-amber-600/50 bg-amber-950/40 p-4 active:opacity-90"
        >
          <Text className="text-center text-base font-semibold text-amber-200">
            Unlock Automatic Deal Scanner with LLM Scoring – Upgrade to Pro
          </Text>
        </Pressable>
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          reason="Geography-based scanning and LLM deal ranking are Pro features."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950 px-4 pt-4" contentContainerStyle={{ paddingBottom: 48 }}>
      <Text className="mb-2 text-2xl font-bold text-white">Automatic Deal Scanner</Text>
      <Text className="mb-4 text-slate-400">
        Geography-based recommendations ranked by LLM score (highest first). Use notifications for new scan
        results (local demo; ship remote push via backend for production).
      </Text>

      <View className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Notifications (Pro)
        </Text>
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <View className="flex-1 pr-2">
            <Text className="text-base text-white">Instant scan alerts</Text>
            <Text className="text-xs text-slate-500">Notify when a run completes (local)</Text>
          </View>
          <Switch
            value={prefs.instantAlerts}
            onValueChange={onToggleInstant}
            trackColor={{ false: "#334155", true: "#0ea5e9" }}
          />
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 pr-2">
            <Text className="text-base text-white">Daily 9:00 AM digest</Text>
            <Text className="text-xs text-slate-500">Reminder to review ranked deals</Text>
          </View>
          <Switch
            value={prefs.dailyDigest}
            onValueChange={onToggleDigest}
            trackColor={{ false: "#334155", true: "#0ea5e9" }}
          />
        </View>
      </View>

      <Pressable
        onPress={runNewScan}
        disabled={scanBusy}
        className={`mb-5 rounded-xl bg-emerald-600 py-3 active:opacity-90 ${scanBusy ? "opacity-70" : ""}`}
      >
        {scanBusy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center text-base font-semibold text-white">Run new scan</Text>
        )}
      </Pressable>

      <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Market region
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

      {scanBusy && deals.length === 0 ? (
        <View className="items-center py-12">
          <ActivityIndicator color="#38bdf8" />
          <Text className="mt-3 text-sm text-slate-500">Loading ranked deals…</Text>
        </View>
      ) : (
        deals.map((d, rank) => (
          <View key={d.id} className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <Text className="text-xs font-semibold uppercase text-slate-500">
              Rank #{rank + 1} · {d.region}
            </Text>
            <Text className="mt-1 text-lg font-semibold text-white">{d.address}</Text>
            <Text className="mt-2 text-slate-200">
              List ${d.listPrice.toLocaleString()} · Est. ARV ${d.arvEstimate.toLocaleString()}
            </Text>
            <Text className="mt-3 text-xl font-bold text-emerald-400">LLM score: {d.llmScore}</Text>
            <Text className="mt-1 text-xs text-slate-500">
              Confidence ±{d.confidencePct}% · Scored {formatEstimateTimestamp(d.scoredAt)} ·{" "}
              {d.scoringSource === "remote_llm" ? "Remote LLM" : "On-device heuristic"}
            </Text>
            <Text className="mt-2 text-sm text-slate-300">{d.rationale}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
