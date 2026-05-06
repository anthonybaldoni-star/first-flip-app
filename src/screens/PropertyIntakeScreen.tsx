import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { HeaderQuickLinks } from "../components/HeaderQuickLinks";
import { CompRadiusMap } from "../components/CompRadiusMap";
import { PropertyMiniMap } from "../components/PropertyMiniMap";
import { PropertyMapLinks } from "../components/PropertyMapLinks";
import { parseListingUrl, type ParsedListing } from "../lib/listingParser";
import {
  DEFAULT_COMP_RADIUS_MILES,
  formatEstimateTimestamp,
  shiftCompsToSubject,
} from "../lib/propertyEstimate";

const STORAGE_KEY = "firstflip_property_intake_v1";

type Persisted = {
  urlInput: string;
  parsed: ParsedListing | null;
};

export default function PropertyIntakeScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const [urlInput, setUrlInput] = useState("");
  const [parsed, setParsed] = useState<ParsedListing | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderQuickLinks active="intake" />,
    });
  }, [navigation]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Persisted;
          setUrlInput(p.urlInput ?? "");
          setParsed(p.parsed ?? null);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Persisted = { urlInput, parsed };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [urlInput, parsed, hydrated]);

  const pasteUrlFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const line = text?.trim().split(/\r?\n/)[0]?.trim();
      if (line) {
        setUrlInput(line);
        setParseError(null);
      }
    } catch {
      /* Expo Go / permission edge cases */
    }
  };

  const clearIntake = () => {
    setUrlInput("");
    setParsed(null);
    setParseError(null);
  };

  const runParse = async () => {
    setParseError(null);
    setParsing(true);
    try {
      const result = await parseListingUrl(urlInput);
      setParsed(result);
    } catch (e) {
      setParsed(null);
      setParseError(e instanceof Error ? e.message : "Could not parse URL");
    } finally {
      setParsing(false);
    }
  };

  const openOriginalListing = () => {
    if (parsed?.url) void Linking.openURL(parsed.url);
  };

  const intakeRadiusComps = useMemo(() => {
    if (parsed?.latitude == null || parsed.longitude == null) return [];
    return shiftCompsToSubject(parsed.latitude, parsed.longitude).slice(0, 5);
  }, [parsed]);

  return (
    <ScrollView
      className="flex-1 bg-slate-950 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="mb-1 text-2xl font-bold text-white">Property Intake</Text>
      <Text className="mb-4 text-sm leading-5 text-slate-400">
        Paste any listing URL (Zillow, Redfin, Realtor.com, and other public listing sites). Demo parser
        derives address, beds/baths, sqft, price, and photos per URL seed; swap in a gated backend scraper for
        live data.
      </Text>

      <Text className="mb-2 font-semibold text-slate-300">Listing URL</Text>
      <TextInput
        value={urlInput}
        onChangeText={setUrlInput}
        placeholder="https://www.zillow.com/homedetails/… or paste from browser"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        className="mb-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
      />

      <View className="mb-3 flex-row gap-2">
        <Pressable
          onPress={pasteUrlFromClipboard}
          className="flex-1 rounded-xl border border-slate-600 bg-slate-900 py-3 active:opacity-90"
        >
          <Text className="text-center text-sm font-semibold text-sky-400">Paste from clipboard</Text>
        </Pressable>
        <Pressable
          onPress={clearIntake}
          disabled={!urlInput && !parsed}
          className={`flex-1 rounded-xl border border-slate-700 py-3 ${!urlInput && !parsed ? "opacity-40" : "active:opacity-90"}`}
        >
          <Text className="text-center text-sm font-semibold text-slate-400">Clear</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={runParse}
        disabled={parsing || !urlInput.trim()}
        className={`mb-6 rounded-xl py-3 ${parsing || !urlInput.trim() ? "bg-slate-800" : "bg-sky-600 active:opacity-90"}`}
      >
        {parsing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center font-semibold text-white">Parse listing</Text>
        )}
      </Pressable>

      {parseError ? (
        <Text className="mb-4 text-rose-400">{parseError}</Text>
      ) : null}

      {parsed ? (
        <View className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-xs uppercase text-slate-500">Source · {parsed.sourceLabel}</Text>
          <Text className="mt-2 text-lg font-semibold text-white">{parsed.fullAddress}</Text>
          <Text className="mt-2 text-slate-300">
            {parsed.sqft != null ? `${parsed.sqft.toLocaleString()} sqft` : "— sqft"} ·{" "}
            {parsed.listPrice != null ? `$${parsed.listPrice.toLocaleString()}` : "— price"}
          </Text>
          <Text className="mt-1 text-slate-400">
            {parsed.beds != null ? `${parsed.beds} bd` : "— bd"} ·{" "}
            {parsed.baths != null ? `${parsed.baths} ba` : "— ba"}
          </Text>
          <Text className="mt-3 text-xs text-slate-500">
            Parsed {formatEstimateTimestamp(parsed.parsedAt)}
          </Text>
          <Text className="mt-2 text-xs leading-5 text-amber-200/90">{parsed.disclaimer}</Text>

          {parsed.latitude != null && parsed.longitude != null ? (
            <>
              <PropertyMiniMap
                latitude={parsed.latitude}
                longitude={parsed.longitude}
                label={parsed.fullAddress}
              />
              <Text className="mb-2 mt-4 font-semibold text-slate-400">Comp radius (demo)</Text>
              <CompRadiusMap
                subject={{
                  latitude: parsed.latitude,
                  longitude: parsed.longitude,
                  label: parsed.fullAddress,
                }}
                comps={intakeRadiusComps.map((c) => ({
                  id: c.id,
                  address: c.address,
                  latitude: c.latitude,
                  longitude: c.longitude,
                }))}
                radiusMiles={DEFAULT_COMP_RADIUS_MILES}
              />
            </>
          ) : null}
          <PropertyMapLinks address={parsed.fullAddress} />

          <Pressable
            onPress={openOriginalListing}
            className="mt-4 rounded-xl border border-slate-700 bg-slate-950 py-2 active:opacity-90"
          >
            <Text className="text-center text-sm font-semibold text-sky-400">
              Open original listing
            </Text>
          </Pressable>

          <Text className="mb-2 mt-6 font-semibold text-slate-400">Listing photos (demo)</Text>
          <View className="flex-row flex-wrap gap-2">
            {parsed.photoUrls.map((uri) => (
              <Image key={uri} source={{ uri }} className="h-24 w-[31%] rounded-lg bg-slate-800" />
            ))}
          </View>

          <Pressable
            onPress={() => router.push("/rehab")}
            className="mt-6 rounded-xl bg-emerald-700 py-3 active:opacity-90"
          >
            <Text className="text-center font-semibold text-white">Open rehab budget tracker</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
