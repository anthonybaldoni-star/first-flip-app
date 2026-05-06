/**
 * Stripe webhook handler — mirrors CODE-SKELETONS.md (Deno serve + constructEvent + profiles update).
 * Deploy as Supabase Edge Function; set secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 * SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_tier: "pro",
          subscription_status: "active",
          stripe_customer_id: session.customer as string,
        })
        .eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;
    if (userId) {
      await supabaseAdmin.from("profiles").update({ subscription_tier: "free" }).eq("id", userId);
    }
  }

  return new Response("OK", { status: 200 });
});
