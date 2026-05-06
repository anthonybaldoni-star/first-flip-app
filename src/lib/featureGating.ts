import type { SubscriptionTier } from "../types/subscription";

/**
 * Client-side UX gates (CODE-SKELETONS + PRD v2.0 matrix).
 * All paid APIs must re-check `subscription_tier` server-side.
 */

export function hasPaidSubscription(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

/** Automatic Deal Scanner + LLM deal ranking (Recommended Deals, scanner tab). */
export function canUseDealScanner(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

/** Same product surface as deal scanner LLM scores — gated for free per PRD. */
export function canSeeLlmScoredDeals(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

export function canUseFullLlmChat(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

export function canUseAiVision(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

/** Free: limited comps; Pro+: unlimited real-time comps (PRD). */
export function canUseUnlimitedComps(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

export function maxCompsForTier(tier: SubscriptionTier): number {
  return tier === "free" ? 2 : 999;
}

/** Free: abbreviated sensitivity; paid: full table (PRD basic vs full). */
export function maxSensitivityRowsForTier(tier: SubscriptionTier): number {
  return tier === "free" ? 3 : 5;
}

export function maxFreeChatTurns(): number {
  return 5;
}

export function maxFreePhotosPerProperty(): number {
  return 5;
}

export function canUseUnlimitedPhotos(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

/** Push / local deal alerts — Pro+ per PRD (free: no deal notifications). */
export function canReceiveDealPushNotifications(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

/** Rehab budget: free = basic subset of categories; Pro = full 24 + AI suggestions + regional indexing. */
export function maxRehabCategoriesForTier(tier: SubscriptionTier): number {
  return tier === "free" ? 8 : 24;
}

export function canUseAiRehabSuggestions(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

export function canUseFullCostIndexing(tier: SubscriptionTier): boolean {
  return tier !== "free";
}
