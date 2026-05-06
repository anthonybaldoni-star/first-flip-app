import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
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
import { REHAB_CATEGORIES } from "../data/rehabCategories";
import { useSubscription } from "../context/SubscriptionContext";
import PaywallModal from "../components/PaywallModal";
import { HeaderQuickLinks } from "../components/HeaderQuickLinks";
import { maxFreePhotosPerProperty, maxRehabCategoriesForTier } from "../lib/featureGating";
import { COST_INDEX_REGIONS, applyCostIndex, suggestAiLineItemsForCategory } from "../lib/rehabCostIndex";

const STORAGE_KEY = "firstflip_rehab_budget_v2";

export type RehabLineItem = {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  notes: string;
  photoUri?: string;
  source: "user" | "ai";
};

type Persisted = {
  regionKey: string;
  items: RehabLineItem[];
};

function newId() {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function RehabBudgetScreen() {
  const navigation = useNavigation();
  const { tier, isLoading: subscriptionLoading } = useSubscription();
  const [regionKey, setRegionKey] = useState("us_avg");
  const [items, setItems] = useState<RehabLineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>(undefined);

  const rehabPhotosUsed = useMemo(() => items.filter((i) => !!i.photoUri).length, [items]);

  const openPaywall = (reason?: string) => {
    setPaywallReason(reason);
    setShowPaywall(true);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderQuickLinks active="rehab" />,
    });
  }, [navigation]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Persisted;
          setRegionKey(p.regionKey ?? "us_avg");
          setItems(Array.isArray(p.items) ? p.items : []);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Persisted = { regionKey, items };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [regionKey, items, hydrated]);

  useEffect(() => {
    if (tier === "free") setRegionKey("us_avg");
  }, [tier]);

  const maxCats = maxRehabCategoriesForTier(tier);
  const visibleCategories = REHAB_CATEGORIES.slice(0, maxCats);

  const displayAmount = useCallback(
    (amount: number) => applyCostIndex(amount, regionKey, tier),
    [regionKey, tier],
  );

  const totalIndexed = useMemo(() => {
    return items.reduce((sum, li) => sum + displayAmount(li.amount), 0);
  }, [items, displayAmount]);

  const addBlankLine = (categoryId: string) => {
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        categoryId,
        description: "",
        amount: 0,
        notes: "",
        source: "user",
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<RehabLineItem>) => {
    setItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  };

  const removeLine = (id: string) => {
    setItems((prev) => prev.filter((li) => li.id !== id));
  };

  const runAiSuggest = (categoryId: string) => {
    if (tier === "free") {
      openPaywall("AI-suggested rehab line items and regional benchmarks are included with Pro.");
      return;
    }
    const suggestions = suggestAiLineItemsForCategory(categoryId, tier);
    const newRows: RehabLineItem[] = suggestions.map((s) => ({
      id: newId(),
      categoryId,
      description: s.description,
      amount: s.baseAmount,
      notes: "AI-suggested (demo — replace with gated LLM API)",
      source: "ai",
    }));
    setItems((prev) => [...prev, ...newRows]);
  };

  const pickLinePhoto = async (lineId: string) => {
    const line = items.find((x) => x.id === lineId);
    if (
      tier === "free" &&
      !line?.photoUri &&
      rehabPhotosUsed >= maxFreePhotosPerProperty()
    ) {
      openPaywall(
        `Free tier allows ${maxFreePhotosPerProperty()} rehab line photos per property. Upgrade for unlimited documentation.`,
      );
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    updateLine(lineId, { photoUri: result.assets[0].uri });
  };

  if (subscriptionLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 56 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="mb-1 text-2xl font-bold text-white">Rehab Budget</Text>
      <Text className="mb-4 text-sm text-slate-400">
        {maxCats >= REHAB_CATEGORIES.length
          ? "Full tracker with regional cost indexing and AI line suggestions (Pro)."
          : `Free tier: first ${maxCats} categories. Upgrade for all ${REHAB_CATEGORIES.length} + AI + indexing.`}
      </Text>
      {tier === "free" && (
        <Text className="mb-3 text-xs text-amber-300/90">
          Line-item photos: {maxFreePhotosPerProperty()} total on Free (PRD); unlimited on Pro.
        </Text>
      )}

      <Text className="mb-2 font-semibold text-slate-300">Local cost index</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
        <View className="flex-row gap-2 pb-1">
          {COST_INDEX_REGIONS.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => {
                if (tier === "free" && r.key !== "us_avg") {
                  openPaywall("Regional cost indexing for rehab budgets is included with Pro.");
                  return;
                }
                setRegionKey(r.key);
              }}
              className={`rounded-full px-4 py-2 ${regionKey === r.key ? "bg-sky-600" : "bg-slate-800"}`}
            >
              <Text className="text-xs text-white">{r.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {tier === "free" && (
        <Text className="mb-4 text-xs text-amber-300">
          Regional multipliers locked — national baseline only on Free.
        </Text>
      )}

      <View className="mb-6 rounded-2xl border border-emerald-900/40 bg-slate-900 p-4">
        <Text className="text-sm font-semibold text-slate-400">Total rehab (indexed)</Text>
        <Text className="mt-1 text-3xl font-bold text-emerald-400">
          ${totalIndexed.toLocaleString()}
        </Text>
      </View>

      {orphansOnFreeTier ? (
        <View className="mb-6 rounded-xl border border-amber-800/45 bg-amber-950/40 p-4">
          <Text className="text-sm font-semibold text-amber-200">
            Budget includes locked categories on Free tier
          </Text>
          <Text className="mt-2 text-xs leading-5 text-slate-400">
            {orphansOnFreeTier.count} line item
            {orphansOnFreeTier.count === 1 ? "" : "s"} (~$
            {orphansOnFreeTier.sumIndexed.toLocaleString()} indexed) live in categories not editable on Free
            {orphansOnFreeTier.labels.length
              ? ` (e.g. ${orphansOnFreeTier.labels.slice(0, 4).join(", ")}${orphansOnFreeTier.labels.length > 4 ? ", …" : ""})`
              : ""}
            . That amount is reflected in your total above. Upgrade to reveal and edit them here.
          </Text>
          <Pressable
            onPress={() => openPaywall("Unlock all rehab categories to edit lines saved outside the Free category set.")}
            className="mt-3 rounded-lg bg-slate-800 py-2 active:opacity-90"
          >
            <Text className="text-center text-sm font-semibold text-sky-400">Unlock full rehab tracker — Pro</Text>
          </Pressable>
        </View>
      ) : null}

      {visibleCategories.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        return (
          <View key={cat.id} className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
            <View className="mb-2 flex-row flex-wrap items-center justify-between gap-2">
              <Text className="flex-1 text-base font-semibold text-white">{cat.label}</Text>
              <Pressable
                onPress={() => runAiSuggest(cat.id)}
                className={`rounded-lg bg-violet-700 px-3 py-1.5 active:opacity-90 ${tier === "free" ? "opacity-55" : ""}`}
              >
                <Text className="text-xs font-semibold text-white">AI suggest</Text>
              </Pressable>
            </View>

            {catItems.map((li) => (
              <View
                key={li.id}
                className="mb-3 rounded-xl border border-slate-700 bg-slate-950 p-3"
              >
                <View className="flex-row flex-wrap items-start justify-between gap-2">
                  <TextInput
                    value={li.description}
                    onChangeText={(t) => updateLine(li.id, { description: t })}
                    placeholder="Line item description"
                    placeholderTextColor="#64748b"
                    className="mb-2 min-h-[40px] flex-1 text-base text-white"
                  />
                  {li.source === "ai" && (
                    <Text className="rounded bg-violet-900/50 px-2 py-0.5 text-xs text-violet-200">
                      AI
                    </Text>
                  )}
                </View>
                <View className="mb-2 flex-row items-center gap-2">
                  <Text className="text-slate-400">$</Text>
                  <TextInput
                    value={li.amount === 0 ? "" : String(li.amount)}
                    onChangeText={(t) => {
                      const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
                      updateLine(li.id, { amount: Number.isFinite(n) ? n : 0 });
                    }}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-white"
                  />
                  <Text className="text-xs text-slate-500">
                    Indexed: ${displayAmount(li.amount).toLocaleString()}
                  </Text>
                </View>
                <TextInput
                  value={li.notes}
                  onChangeText={(t) => updateLine(li.id, { notes: t })}
                  placeholder="Notes"
                  placeholderTextColor="#64748b"
                  className="mb-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300"
                />
                <View className="flex-row flex-wrap items-center gap-2">
                  <Pressable
                    onPress={() => pickLinePhoto(li.id)}
                    className="rounded-lg bg-slate-800 px-3 py-2 active:opacity-90"
                  >
                    <Text className="text-xs font-semibold text-sky-400">
                      {li.photoUri ? "Change photo" : "Add photo"}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => removeLine(li.id)} className="px-2 py-2">
                    <Text className="text-xs text-rose-400">Remove</Text>
                  </Pressable>
                </View>
                {li.photoUri ? (
                  <Image source={{ uri: li.photoUri }} className="mt-2 h-28 w-full rounded-lg" />
                ) : null}
              </View>
            ))}

            <Pressable
              onPress={() => addBlankLine(cat.id)}
              className="mt-1 rounded-lg border border-dashed border-slate-600 py-2 active:opacity-90"
            >
              <Text className="text-center text-sm text-slate-400">+ Add line item</Text>
            </Pressable>
          </View>
        );
      })}

      {tier === "free" && (
        <Pressable
          onPress={() => openPaywall()}
          className="mb-8 rounded-xl border border-amber-600/50 bg-amber-950/40 p-4 active:opacity-90"
        >
          <Text className="text-center text-base font-semibold text-amber-200">
            Unlock all {REHAB_CATEGORIES.length} categories, AI rehab suggestions & regional cost
            indexing — Upgrade to Pro
          </Text>
        </Pressable>
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          setPaywallReason(undefined);
        }}
        reason={
          paywallReason ??
          "Pro unlocks full rehab categories, AI line items, regional cost indexing, and unlimited line photos."
        }
      />
    </ScrollView>
  );
}
