import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSubscription } from "../context/SubscriptionContext";
import PaywallModal from "../components/PaywallModal";
import { HeaderQuickLinks } from "../components/HeaderQuickLinks";
import { canUseFullLlmChat, maxFreeChatTurns } from "../lib/featureGating";
import { sanitizeUserPrompt } from "../lib/llmGuards";

type Msg = { id: string; role: "user" | "assistant"; text: string; at: string };

function replyFullContextual(userText: string): string {
  const lower = userText.toLowerCase();
  if (lower.includes("70%") || lower.includes("seventy")) {
    return (
      "• 70% rule anchor: (ARV × 0.70) − rehab.\n" +
      "• Stress-test your negotiated price against rehab bids + holding.\n" +
      "• If you are above the rule, widen diligence on unknowns or negotiate seller credits."
    );
  }
  if (lower.includes("arv") || lower.includes("comp")) {
    return (
      "• Tighten ARV to the best 3–5 comps within condition/lot/SFH mix.\n" +
      "• If confidence is low, widen radius once and document why.\n" +
      "• Pair ARV moves with sensitivity on rehab overrun (+10–20%)."
    );
  }
  if (lower.includes("risk") || lower.includes("timeline")) {
    return (
      "• Timeline risk: permits, GC backlog, scope creep.\n" +
      "• Market risk: days-on-market trend for finished product.\n" +
      "• Mitigation: milestones, allowance lines, exit price bands."
    );
  }
  return (
    "Full contextual mode (Pro):\n" +
    "• Sequence: verify comps → lock rehab scope → align offer to 70% rule → stress margins.\n" +
    "• Ask about a specific line item (roof, MEP, kitchens) for deeper renovation sequencing."
  );
}

function replyLimited(userText: string): string {
  const lower = userText.toLowerCase();
  if (lower.includes("70%")) {
    return "The 70% rule caps your offer near (ARV × 0.70) − repairs. Upgrade for unlimited follow-ups.";
  }
  if (lower.includes("arv") || lower.includes("comp")) {
    return "ARV should track the tightest recent comps. Upgrade for deeper scenario planning.";
  }
  return "Basic answer: stress-test margin, timeline, and rehab bids. Upgrade for unlimited contextual chat.";
}

export default function LlmChatScreen() {
  const navigation = useNavigation();
  const { tier, isLoading: subscriptionLoading } = useSubscription();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderQuickLinks active="chat" />,
    });
  }, [navigation]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Contextual LLM chat for this deal. Free tier includes limited questions; Pro unlocks unlimited deep analysis.",
      at: new Date().toISOString(),
    },
  ]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>(undefined);

  const userTurns = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);
  const remainingFree = Math.max(0, maxFreeChatTurns() - userTurns);

  const send = () => {
    const clean = sanitizeUserPrompt(input);
    if (!clean.trim()) return;

    if (!canUseFullLlmChat(tier) && userTurns >= maxFreeChatTurns()) {
      setPaywallReason("You've used all free-tier questions — upgrade for unlimited contextual chat.");
      setShowPaywall(true);
      return;
    }

    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: clean,
      at: new Date().toISOString(),
    };

    const assistantText = canUseFullLlmChat(tier) ? replyFullContextual(clean) : replyLimited(clean);

    const asst: Msg = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: assistantText,
      at: new Date().toISOString(),
    };

    setMessages((m) => [...m, userMsg, asst]);
    setInput("");
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-950"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="border-b border-slate-800 px-4 pb-3 pt-2">
        {!canUseFullLlmChat(tier) && (
          <>
            <Text className="text-sm text-amber-300">
              Free tier: {maxFreeChatTurns()} questions total · {remainingFree} remaining
            </Text>
            <Pressable
              onPress={() => {
                setPaywallReason(undefined);
                setShowPaywall(true);
              }}
              className="mt-3 rounded-xl border border-amber-600/50 bg-amber-950/40 py-2 active:opacity-90"
            >
              <Text className="text-center text-sm font-semibold text-amber-200">
                Upgrade to Pro — unlimited contextual chat
              </Text>
            </Pressable>
          </>
        )}
        {canUseFullLlmChat(tier) && (
          <Text className="text-sm text-emerald-400">Pro: unlimited contextual messages</Text>
        )}
      </View>
      <ScrollView
        className="flex-1 px-4 py-3"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => (
          <View
            key={m.id}
            className={`mb-3 max-w-[92%] rounded-2xl px-4 py-3 ${
              m.role === "user" ? "self-end bg-sky-700" : "self-start bg-slate-800"
            }`}
          >
            <Text className="text-base text-white">{m.text}</Text>
            <Text className="mt-1 text-xs text-slate-400">{new Date(m.at).toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-end gap-2 border-t border-slate-800 px-3 py-3">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={
            !canUseFullLlmChat(tier) && remainingFree === 0
              ? "Limit reached — upgrade to continue"
              : "Ask the assistant…"
          }
          placeholderTextColor="#64748b"
          editable={canUseFullLlmChat(tier) || remainingFree > 0}
          className="max-h-32 flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
          multiline
        />
        <Pressable
          onPress={send}
          disabled={!canUseFullLlmChat(tier) && remainingFree === 0}
          className={`rounded-2xl px-4 py-3 ${!canUseFullLlmChat(tier) && remainingFree === 0 ? "bg-slate-700" : "bg-emerald-600 active:opacity-90"}`}
        >
          <Text className="font-semibold text-white">Send</Text>
        </Pressable>
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          setPaywallReason(undefined);
        }}
        reason={paywallReason ?? "Unlock unlimited in-app LLM chat with Pro."}
      />
    </KeyboardAvoidingView>
  );
}
