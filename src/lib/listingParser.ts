/**
 * Listing URL parser — client demo uses hostname heuristics + deterministic mock data.
 * Production: edge function scrapes og:meta / MLS feed; never trust client-only parsing for offers.
 */

export type ParsedListing = {
  url: string;
  sourceLabel: string;
  addressLine1: string;
  cityStateZip: string;
  fullAddress: string;
  /** Approximate coords for map preview (demo — production geocode server-side). */
  latitude?: number;
  longitude?: number;
  sqft: number | null;
  listPrice: number | null;
  beds: number | null;
  baths: number | null;
  photoUrls: string[];
  parsedAt: string;
  disclaimer: string;
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function normalizeListingInput(raw: string): string {
  const firstLine = raw.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (!firstLine) return "";
  const t = firstLine.replace(/^[\s"'“”]+|[\s"'“”]+$/g, "");
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export async function parseListingUrl(rawInput: string): Promise<ParsedListing> {
  const urlString = normalizeListingInput(rawInput);
  if (!urlString) {
    throw new Error("Enter a listing URL");
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const seed = hashCode(urlString);

  await new Promise((r) => setTimeout(r, 750));

  let sourceLabel = "Listing site";
  if (host.includes("zillow")) sourceLabel = "Zillow";
  else if (host.includes("redfin")) sourceLabel = "Redfin";
  else if (host.includes("realtor")) sourceLabel = "Realtor.com";
  else if (host.includes("trulia")) sourceLabel = "Trulia";
  else if (host.includes("homes.com")) sourceLabel = "Homes.com";
  else if (host.includes("rocket")) sourceLabel = "Rocket Homes";
  else if (host.includes("loopnet")) sourceLabel = "LoopNet";
  else if (host.includes("land.com")) sourceLabel = "Land.com";
  else if (host.includes("compass")) sourceLabel = "Compass";
  else if (host.includes("har")) sourceLabel = "HAR.com";
  else if (host.includes("mls")) sourceLabel = "MLS listing";

  const streets = [
    "742 Evergreen Terrace",
    "1204 Maple Ridge Dr",
    "88 Harbor View Ct",
    "5500 Desert Sage Ln",
    "210 Peachtree Walk",
  ];
  const cities = [
    "Austin, TX 78704",
    "Phoenix, AZ 85018",
    "Tampa, FL 33606",
    "Denver, CO 80205",
    "Atlanta, GA 30308",
  ];

  const CITY_COORDINATES: { lat: number; lng: number }[] = [
    { lat: 30.2672, lng: -97.7431 },
    { lat: 33.4484, lng: -112.074 },
    { lat: 27.9506, lng: -82.4572 },
    { lat: 39.7392, lng: -104.9903 },
    { lat: 33.749, lng: -84.388 },
  ];

  const addressLine1 = streets[seed % streets.length];
  const cityIdx = seed % cities.length;
  const cityStateZip = cities[cityIdx];
  const fullAddress = `${addressLine1}, ${cityStateZip}`;
  const baseCoord = CITY_COORDINATES[cityIdx] ?? CITY_COORDINATES[0];
  const latitude = baseCoord.lat + (seed % 17) / 900 - 0.008;
  const longitude = baseCoord.lng + (seed % 13) / 900 - 0.006;

  const sqft = 1450 + (seed % 2100);
  const listPrice = 225000 + (seed % 580000);
  const beds = 2 + (seed % 4);
  const baths = 2 + (seed % 3);

  const photoUrls = [
    `https://picsum.photos/seed/${seed}a/800/600`,
    `https://picsum.photos/seed/${seed}b/800/600`,
    `https://picsum.photos/seed/${seed}c/800/600`,
    `https://picsum.photos/seed/${seed}d/800/600`,
    `https://picsum.photos/seed/${seed}e/800/600`,
  ];

  return {
    url: urlString,
    sourceLabel,
    addressLine1,
    cityStateZip,
    fullAddress,
    latitude,
    longitude,
    sqft,
    listPrice,
    beds,
    baths,
    photoUrls,
    parsedAt: new Date().toISOString(),
    disclaimer:
      "Demo parse — connect a backend scraper/API for live Zillow/Redfin/Realtor data. Do not rely on mock numbers for offers.",
  };
}
