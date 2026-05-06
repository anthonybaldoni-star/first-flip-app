import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSubscription } from "../context/SubscriptionContext";
import PaywallModal from "../components/PaywallModal";
import { CompRadiusMap } from "../components/CompRadiusMap";
import { HeaderQuickLinks } from "../components/HeaderQuickLinks";
import { FlyoverTooltip } from "../components/FlyoverTooltip";
import { FLYOVERS } from "../data/flyovers";
import {
  DEFAULT_COMP_RADIUS_MILES,
  DEMO_PIPELINE_SUBJECT,
  MOCK_COMPS,
  buildEstimateSnapshot,
  buildSensitivityTable,
  formatEstimateTimestamp,
} from "../lib/propertyEstimate";
import { runAutomaticScanAsync, type ScannedDeal } from "../lib/dealScanner";
import {
  canSeeLlmScoredDeals,
  canUseDealScanner,
  canUseUnlimitedComps,
  maxCompsForTier,
  maxSensitivityRowsForTier,
} from "../lib/featureGating";

/**
 * CODE-SKELETONS: useSubscription, PaywallModal, handleScannerTap (free → paywall, else navigate),
 * Recommended Deals gated when tier === 'free' vs tier !== 'free'.
 */
const DashboardScreen = () => {
  const navigation = useNavigation();
  const { tier, isLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>(undefined);
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderQuickLinks active="index" />,
    });
  }, [navigation]);

  const [snapshot, setSnapshot] = useState(() => buildEstimateSnapshot(248000, 62000));

  const refreshEstimate = useCallback(() => {
    setSnapshot(buildEstimateSnapshot(248000, 62000));
  }, []);

  const holdingAndSelling = Math.round(snapshot.arv * 0.08);
  const totalInvested = snapshot.purchasePrice + snapshot.repairEstimate + holdingAndSelling;
  const grossProfit = snapshot.arv - totalInvested;
  const netMarginPct = totalInvested > 0 ? (grossProfit / totalInvested) * 100 : 0;

  const [recommended, setRecommended] = useState<ScannedDeal[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  useEffect(() => {
    if (!canSeeLlmScoredDeals(tier)) {
      setRecommended([]);
      return;
    }
    let cancelled = false;
    setRecommendedLoading(true);
    void runAutomaticScanAsync(0, 0)
      .then((d) => {
        if (!cancelled) setRecommended(d);
      })
      .finally(() => {
        if (!cancelled) setRecommendedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tier]);

  const maxCompRows = maxCompsForTier(tier);
  const visibleComps = MOCK_COMPS.slice(0, maxCompRows);
  const lockedCompCount = Math.max(0, MOCK_COMPS.length - visibleComps.length);

  const sensitivityRowsFull = useMemo(() => buildSensitivityTable(snapshot), [snapshot]);
  const sensitivityRows = sensitivityRowsFull.slice(0, maxSensitivityRowsForTier(tier));

  const openPaywall = (reason?: string) => {
    setPaywallReason(reason);
    setShowPaywall(true);
  };

  const handleScannerTap = () => {
    if (!canUseDealScanner(tier)) {
      openPaywall("Unlock geography-based scans and LLM-ranked deals.");
    } else {
      router.push("/scanner");
    }
  };

  const openComp = (url: string) => {
    void Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="mt-3 text-slate-400">Loading subscription…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text className="mb-1 text-2xl font-bold text-white">Dashboard</Text>
      <Text className="mb-4 text-sm text-slate-500">
        First Flip pipeline home — ARV, comps, sensitivity, and ranked deals
      </Text>

      <View className="mb-4 flex-row gap-2">
        <Pressable
          onPress={() => router.push("/intake")}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-3 active:opacity-90"
        >
          <Text className="text-center text-sm font-semibold text-sky-400">Listing intake</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/rehab")}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-3 active:opacity-90"
        >
          <Text className="text-center text-sm font-semibold text-emerald-400">Rehab budget</Text>
        </Pressable>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <View className="mb-2 flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row items-center gap-1">
            <Text className="text-lg font-semibold text-white">ARV</Text>
            <FlyoverTooltip term="ARV" definition={FLYOVERS.ARV} />
          </View>
          <Pressable
            onPress={refreshEstimate}
            className="rounded-lg bg-slate-800 px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-sky-400">Refresh estimate</Text>
          </Pressable>
        </View>
        <Text className="text-3xl font-bold text-emerald-400">
          ${snapshot.arv.toLocaleString()}
        </Text>

        <View className="mt-1 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-sm text-slate-400">
            Timestamp: {formatEstimateTimestamp(snapshot.generatedAt)}
          </Text>
          <FlyoverTooltip term="Timestamp" definition={FLYOVERS.Timestamp} />
        </View>

        <View className="mt-2 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-sm text-slate-300">Confidence ±{snapshot.confidencePct}%</Text>
          <FlyoverTooltip term="Confidence Factor" definition={FLYOVERS["Confidence Factor"]} />
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-slate-200">Risk score: {snapshot.riskScore}/10</Text>
          <FlyoverTooltip term="Risk Score" definition={FLYOVERS["Risk Score"]} />
        </View>

        <View className="mt-1 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-slate-200">
            70% rule max offer: ${snapshot.maxOffer70.toLocaleString()}
          </Text>
          <FlyoverTooltip term="70% Rule" definition={FLYOVERS["70% Rule"]} />
        </View>

        <View className="mt-2 flex-row flex-wrap items-center gap-x-1">
          <Text
            className={`font-semibold ${
              snapshot.ruleStatus === "Safe"
                ? "text-emerald-400"
                : snapshot.ruleStatus === "On the Line"
                  ? "text-amber-400"
                  : "text-rose-400"
            }`}
          >
            Status: {snapshot.ruleStatus}
          </Text>
          <FlyoverTooltip term="Status" definition={FLYOVERS.Status} />
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-slate-300">
            Total invested: ${totalInvested.toLocaleString()}
          </Text>
          <FlyoverTooltip term="Total Invested" definition={FLYOVERS["Total Invested"]} />
        </View>

        <View className="mt-1 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-slate-300">Gross profit: ${grossProfit.toLocaleString()}</Text>
          <FlyoverTooltip term="Gross Profit" definition={FLYOVERS["Gross Profit"]} />
        </View>

        <View className="mt-1 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-slate-300">Net margin: {netMarginPct.toFixed(1)}%</Text>
          <FlyoverTooltip term="Net Margin %" definition={FLYOVERS["Net Margin %"]} />
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/chat")}
        className="mb-4 rounded-xl border border-sky-800 bg-sky-950/50 py-3 active:opacity-90"
      >
        <Text className="text-center text-base font-semibold text-sky-300">
          Open LLM Chat for this deal
        </Text>
        {tier === "free" && (
          <Text className="mt-1 text-center text-xs text-amber-300">
            Free tier: limited questions — upgrade for unlimited contextual chat
          </Text>
        )}
      </Pressable>

      <View className="mb-2 flex-row flex-wrap items-center gap-2">
        <Text className="text-lg font-semibold text-white">70% rule sensitivity</Text>
        <FlyoverTooltip term="70% Rule" definition={FLYOVERS["70% Rule"]} />
      </View>
      <View className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
        {sensitivityRows.map((row) => (
          <View
            key={row.label}
            className="mb-2 flex-row justify-between border-b border-slate-800 pb-2 last:mb-0 last:border-0"
          >
            <Text className="flex-1 pr-2 text-sm text-slate-400">{row.label}</Text>
            <Text className="text-sm text-slate-200">${row.purchasePrice.toLocaleString()}</Text>
            <Text
              className={`ml-2 w-16 text-right text-sm ${
                row.netMarginPct >= 25 ? "text-emerald-400" : "text-slate-300"
              }`}
            >
              {row.netMarginPct.toFixed(1)}%
            </Text>
          </View>
        ))}
        {tier === "free" && (
          <Pressable onPress={() => openPaywall("Unlock the full ±10% sensitivity grid and unlimited comps.")}>
            <Text className="text-center text-sm font-semibold text-amber-300">
              Upgrade for full sensitivity table (+/−10% scenarios)
            </Text>
          </Pressable>
        )}
      </View>

      <View className="mb-2 flex-row flex-wrap items-center gap-1">
        <Text className="text-lg font-semibold text-white">Comps</Text>
        <FlyoverTooltip term="Comps" definition={FLYOVERS.Comps} />
      </View>
      <Text className="mb-2 text-sm leading-5 text-slate-500">
        Comp radius map — subject property with comparable pins inside the search ring (PRD). Demo coordinates;
        wire real comps from your ARV engine.
      </Text>
      <View className="mb-4">
        <CompRadiusMap
          subject={{
            latitude: DEMO_PIPELINE_SUBJECT.latitude,
            longitude: DEMO_PIPELINE_SUBJECT.longitude,
            label: DEMO_PIPELINE_SUBJECT.label,
          }}
          comps={visibleComps.map((c) => ({
            id: c.id,
            address: c.address,
            latitude: c.latitude,
            longitude: c.longitude,
          }))}
          radiusMiles={DEFAULT_COMP_RADIUS_MILES}
        />
      </View>
      {!canUseUnlimitedComps(tier) && (
        <Text className="mb-2 text-sm text-amber-300">
          Showing {visibleComps.length} of {MOCK_COMPS.length} comps (free tier). Upgrade for unlimited
          real-time comps.
        </Text>
      )}
      {visibleComps.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => openComp(c.url)}
          className="mb-2 rounded-xl border border-slate-800 bg-slate-900 p-3 active:opacity-80"
        >
          <Text className="font-medium text-sky-400">{c.address}</Text>
          <Text className="text-slate-300">
            Sold ${c.soldPrice.toLocaleString()} · {c.sqft} sqft
          </Text>
        </Pressable>
      ))}
      {lockedCompCount > 0 && (
        <Pressable
          onPress={() => openPaywall("Get unlimited clickable comps with Pro.")}
          className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/30 p-3 active:opacity-90"
        >
          <Text className="text-center text-sm font-semibold text-amber-200">
            +{lockedCompCount} more comps — Upgrade to Pro
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={handleScannerTap}
        className="mb-6 mt-2 rounded-xl bg-sky-600 py-3 active:opacity-90"
      >
        <Text className="text-center text-base font-semibold text-white">
          Open Automatic Deal Scanner
        </Text>
      </Pressable>

      {canSeeLlmScoredDeals(tier) && (
        <View className="mb-10">
          <View className="mb-2 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="flex-1 text-lg font-semibold text-white">
              Recommended Deals Near You (LLM Scored)
            </Text>
            <Pressable onPress={() => router.push("/deals")} hitSlop={8}>
              <Text className="text-sm font-semibold text-sky-400">Deals tab →</Text>
            </Pressable>
          </View>
          {recommendedLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#34d399" />
              <Text className="mt-2 text-sm text-slate-500">Loading ranked deals…</Text>
            </View>
          ) : (
            recommended.map((d) => (
              <View
                key={d.id}
                className="mb-3 rounded-xl border border-emerald-900/60 bg-slate-900 p-3"
              >
                <Text className="text-base font-semibold text-white">{d.address}</Text>
                <Text className="text-slate-400">
                  {d.region} · List ${d.listPrice.toLocaleString()} · ARV ~ $
                  {d.arvEstimate.toLocaleString()}
                </Text>
                <Text className="mt-2 text-emerald-400">LLM score: {d.llmScore}</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  ±{d.confidencePct}% confidence · {d.scoringSource === "remote_llm" ? "Remote LLM" : "Heuristic"}
                </Text>
                <Text className="mt-1 text-sm text-slate-300">{d.rationale}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {tier === "free" && (
        <View className="mb-10">
          <Pressable
            onPress={() => router.push("/deals")}
            className="mb-3 rounded-xl border border-slate-700 bg-slate-900/80 p-4 active:opacity-90"
          >
            <Text className="text-center text-base font-semibold text-slate-300">
              Recommended deals (LLM scored)
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              Automatic rankings are hidden on the free tier. Open the Deals tab to upgrade and unlock
              ranked opportunities.
            </Text>
            <Text className="mt-3 text-center text-sm font-semibold text-sky-400">Tap to open Deals →</Text>
          </Pressable>
          <Pressable
            onPress={() => openPaywall()}
            className="rounded-xl border border-amber-600/50 bg-amber-950/40 p-4 active:opacity-90"
          >
            <Text className="text-center text-base font-semibold text-amber-200">
              Unlock Automatic Deal Scanner with LLM Scoring – Upgrade to Pro
            </Text>
          </Pressable>
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
};

export default DashboardScreen;
