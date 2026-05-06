2. CODE SKELETON (Full Reprint)
SubscriptionContext.tsx
tsximport React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/cloudClient'; // or Firebase equivalent

interface SubscriptionContextType {
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: 'free',
  isLoading: true,
});

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [tier, setTier] = useState<'free' | 'pro' | 'team' | 'enterprise'>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
        setTier(data?.subscription_tier || 'free');
      }
      setIsLoading(false);
    };
    fetchSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ tier, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
DashboardScreen.tsx
tsximport { useSubscription } from '../context/SubscriptionContext';
import PaywallModal from '../components/PaywallModal';

const DashboardScreen = ({ route }: any) => {
  const { tier } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleScannerTap = () => {
    if (tier === 'free') {
      setShowPaywall(true);
    } else {
      // Navigate to scanner results
    }
  };

  return (
    <ScrollView>
      {/* Existing dashboard content */}

      {/* Recommended Deals section - gated */}
      {tier !== 'free' && (
        <Text>Recommended Deals Near You (LLM Scored)</Text>
        // ... list of deals with LLM scores
      )}

      {tier === 'free' && (
        <TouchableOpacity onPress={() => setShowPaywall(true)}>
          <Text>Unlock Automatic Deal Scanner with LLM Scoring – Upgrade to Pro</Text>
        </TouchableOpacity>
      )}

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </ScrollView>
  );
};
PaywallModal.tsx
tsxconst PaywallModal = ({ visible, onClose }: any) => (
  <Modal visible={visible}>
    <View>
      <Text>Upgrade to Pro for $19/mo</Text>
      <Text>• Automatic Deal Scanner</Text>
      <Text>• LLM Scoring & Ranking</Text>
      <Text>• AI Vision Analysis</Text>
      <Button title="Upgrade Now" onPress={() => { /* trigger Stripe */ }} />
      <Button title="Maybe Later" onPress={onClose} />
    </View>
  </Modal>
);
Stripe Webhook Handler
TypeScript// stripe-webhook.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.user_id;

    await supabase.from('profiles').update({
      subscription_tier: 'pro',
      subscription_status: 'active',
      stripe_customer_id: session.customer,
    }).eq('id', userId);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const userId = subscription.metadata.user_id;
    await supabase.from('profiles').update({ subscription_tier: 'free' }).eq('id', userId);
  }

  return new Response('OK', { status: 200 });
});