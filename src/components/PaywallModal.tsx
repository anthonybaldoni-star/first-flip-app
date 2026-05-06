import React from "react";
import { Modal, View, Text, Pressable, Linking } from "react-native";
import Constants from "expo-constants";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Optional context line under the headline (CODE-SKELETONS base copy unchanged). */
  reason?: string;
};

/**
 * Matches CODE-SKELETONS pattern (`Modal`, Upgrade / Maybe Later, Stripe trigger).
 * Stripe Checkout URL is created server-side; never embed secret keys in the app.
 */
const PaywallModal = ({ visible, onClose, reason }: Props) => {
  const checkoutUrl =
    process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL ??
    (Constants.expoConfig?.extra as { stripeCheckoutUrl?: string } | undefined)?.stripeCheckoutUrl;

  const triggerStripe = async () => {
    if (checkoutUrl) {
      const supported = await Linking.canOpenURL(checkoutUrl);
      if (supported) await Linking.openURL(checkoutUrl);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl bg-slate-900 p-6 pb-10">
          <Text className="mb-2 text-xl font-semibold text-white">Upgrade to Pro for $19/mo</Text>
          {reason ? (
            <Text className="mb-3 text-sm leading-5 text-slate-400">{reason}</Text>
          ) : null}
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pro includes
          </Text>
          <Text className="mb-3 text-slate-400">• Automatic Deal Scanner + daily deal alerts</Text>
          <Text className="mb-3 text-slate-400">• LLM scoring & ranked recommended deals</Text>
          <Text className="mb-3 text-slate-400">• AI Vision renovation analysis (visit photos)</Text>
          <Text className="mb-3 text-slate-400">• Full rehab budget: AI line items + regional cost index</Text>
          <Text className="mb-3 text-slate-400">• Unlimited LLM chat, comps & photos</Text>
          <Text className="mb-6 text-slate-400">• Server-side subscription checks on paid APIs</Text>
          <Pressable
            className="mb-3 rounded-xl bg-emerald-500 py-3"
            onPress={triggerStripe}
            accessibilityRole="button"
            accessibilityLabel="Upgrade Now"
          >
            <Text className="text-center text-base font-semibold text-slate-950">Upgrade Now</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Maybe Later">
            <Text className="text-center text-base text-slate-300">Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default PaywallModal;
