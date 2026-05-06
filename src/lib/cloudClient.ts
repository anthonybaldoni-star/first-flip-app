import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

/** Placeholders allow Expo Go to boot without .env; replace with real Supabase project values. */
const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined)?.supabaseUrl ??
  "https://placeholder.supabase.co";

const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra as { supabaseAnonKey?: string } | undefined)?.supabaseAnonKey ??
  "public-anon-key-placeholder";

/**
 * Supabase client with the public anon key only. Never embed service_role in the app.
 * Subscription tier updates must occur via Stripe webhooks (server-side) or RLS-protected RPC.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
