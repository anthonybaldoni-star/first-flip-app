import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/cloudClient";

interface SubscriptionContextType {
  tier: "free" | "pro" | "team" | "enterprise";
  /** True when user has any paid plan (Pro / Team / Enterprise). Matches `tier !== 'free'` gating in CODE-SKELETONS.md. */
  hasPaidAccess: boolean;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: "free",
  hasPaidAccess: false,
  isLoading: true,
});

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [tier, setTier] = useState<"free" | "pro" | "team" | "enterprise">("free");
  const [isLoading, setIsLoading] = useState(true);

  const hasPaidAccess = useMemo(() => tier !== "free", [tier]);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        if (__DEV__) {
          const dev = process.env.EXPO_PUBLIC_DEV_TIER as SubscriptionContextType["tier"] | undefined;
          if (dev && ["free", "pro", "team", "enterprise"].includes(dev)) {
            setTier(dev);
            setIsLoading(false);
            return;
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("subscription_tier")
            .eq("id", user.id)
            .single();
          if (!error) {
            const t = data?.subscription_tier as SubscriptionContextType["tier"] | undefined;
            setTier(t && ["free", "pro", "team", "enterprise"].includes(t) ? t : "free");
          } else {
            setTier("free");
          }
        } else {
          setTier("free");
        }
      } catch {
        setTier("free");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSubscription();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void fetchSubscription();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ tier, hasPaidAccess, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
