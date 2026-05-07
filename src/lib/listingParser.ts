/**
 * Listing URL parser — client demo uses hostname heuristics + deterministic mock data.
 * Zillow URLs: prefers ZPID + homedetails slug so mock rows differ per listing (not one Tampa row).
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
  /** Optional captions for mock photos (Zillow demo realism). */
  photoLabels?: string[];
  parsedAt: string;
  disclaimer: string;
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Format slug tokens like 2837-Gresham-Rd-SE → "2837 Gresham Rd SE". */
function formatStreetFromSlugParts(parts: string[]): string {
  const suffixes = new Set(["rd", "st", "ave", "blvd", "dr", "ct", "ln", "way", "pl", "trl", "cir", "hwy"]);
  const directionals = new Set(["nw", "ne", "sw", "se", "n", "s", "e", "w"]);
  return parts
    .map((w, i) => {
      if (i === 0 && /^\d+[a-z]?$/i.test(w)) return w;
      const lower = w.toLowerCase();
      if (directionals.has(lower)) return lower.toUpperCase();
      if (suffixes.has(lower)) {
        return lower === "rd"
          ? "Rd"
          : lower === "st"
            ? "St"
            : lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Parse `/homedetails/2837-Gresham-Rd-Atlanta-GA-30316/123_zpid/` slug segments. */
function parseZillowHomedetailsSlug(pathname: string): {
  addressLine1: string;
  cityStateZip: string;
  zip: string;
  cityLower: string;
} | null {
  const m = pathname.match(/\/homedetails\/([^/]+)\//i);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).replace(/_/g, "-");
  const parts = slug.split("-").filter(Boolean);
  const zipIdx = parts.findIndex((p) => /^\d{5}$/.test(p));
  if (zipIdx < 2) return null;
  const zip = parts[zipIdx];
  const state = parts[zipIdx - 1];
  if (!/^[a-z]{2}$/i.test(state)) return null;
  const city = parts[zipIdx - 2];
  const streetParts = parts.slice(0, zipIdx - 2);
  if (streetParts.length < 1) return null;
  const addressLine1 = formatStreetFromSlugParts(streetParts);
  const cityTitle = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  const cityStateZip = `${cityTitle}, ${state.toUpperCase()} ${zip}`;
  return { addressLine1, cityStateZip, zip, cityLower: city.toLowerCase() };
}

function extractZillowZpid(pathname: string, search: string, fullUrlLower: string): string | null {
  const seg = pathname.match(/(\d{6,})_zpid\/?$/i);
  if (seg) return seg[1];
  const inline = fullUrlLower.match(/[/?&]zpid[=\/](\d{6,})\b/i);
  if (inline) return inline[1];
  try {
    const q = new URLSearchParams(search);
    const z = q.get("zpid");
    return z && /^\d+$/.test(z) ? z : null;
  } catch {
    return null;
  }
}

function extractFiveDigitZipFromPath(pathname: string): string | null {
  const matches = pathname.match(/\d{5}/g);
  if (!matches?.length) return null;
  return matches[matches.length - 1];
}

type RegionHint = "atlanta_30316" | "atlanta" | "tampa" | "austin" | "phoenix" | "denver" | "generic";

function regionHintFromZipCity(zip: string | null, cityLower: string, pathnameLower: string): RegionHint {
  if (zip === "30316" || pathnameLower.includes("gresham")) return "atlanta_30316";
  if (zip?.startsWith("303")) return "atlanta";
  if (zip?.startsWith("336") || pathnameLower.includes("tampa")) return "tampa";
  if (zip?.startsWith("787") || pathnameLower.includes("austin")) return "austin";
  if (zip?.startsWith("850") || pathnameLower.includes("phoenix")) return "phoenix";
  if (zip?.startsWith("802") || pathnameLower.includes("denver")) return "denver";
  return "generic";
}

const REGION_COORDS: Record<RegionHint, { lat: number; lng: number }> = {
  atlanta_30316: { lat: 33.7394, lng: -84.3468 },
  atlanta: { lat: 33.749, lng: -84.388 },
  tampa: { lat: 27.9506, lng: -82.4572 },
  austin: { lat: 30.2672, lng: -97.7431 },
  phoenix: { lat: 33.4484, lng: -112.074 },
  denver: { lat: 39.7392, lng: -104.9903 },
  generic: { lat: 39.8283, lng: -98.5795 },
};

function jitterCoords(seed: number, base: { lat: number; lng: number }) {
  const jitterLat = ((seed % 47) - 23) / 4200;
  const jitterLng = ((seed % 41) - 20) / 4200;
  return { latitude: base.lat + jitterLat, longitude: base.lng + jitterLng };
}

/** Known demo listing: Gresham Rd SE · Atlanta 30316 (matches slug or ZPID). */
const GRESHAM_SLUG_MARKER = "2837-gresham-rd-se-atlanta-ga-30316";
const GRESHAM_ZPID = "460859377";

function isGresham30316Demo(pathnameLower: string, zpid: string | null): boolean {
  const slug = pathnameLower.replace(/_/g, "-");
  return zpid === GRESHAM_ZPID || slug.includes(GRESHAM_SLUG_MARKER);
}

/** Picsum seeds + labels tuned for Atlanta / craftsman-style bungalow feel (still placeholder images). */
function greshamDemoPhotos(): { photoUrls: string[]; photoLabels: string[] } {
  const seeds = [
    "firstflip-atl30316-gresham-front-orchard",
    "firstflip-atl30316-gresham-lr-fireplace-maple",
    "firstflip-atl30316-gresham-kitchen-quartz-runner",
    "firstflip-atl30316-gresham-primary-soft-light",
    "firstflip-atl30316-gresham-back-deck-canopy-oak",
  ];
  const photoUrls = seeds.map((s) => `https://picsum.photos/seed/${encodeURIComponent(s)}/880/620`);
  const photoLabels = [
    "Street view — bungalow roofline · East Atlanta-ish (demo photo)",
    "Living room toward dining — hardwoods · warm natural light",
    "Kitchen — quartz counters · breakfast nook toward rear",
    "Primary bedroom — quieter rear wing · matte walls",
    "Rear deck & fenced yard — shaded · weekend showing vibe",
  ];
  return { photoUrls, photoLabels };
}

function atlanta30316PlausibleMock(seed: number): {
  sqft: number;
  listPrice: number;
  beds: number;
  baths: number;
} {
  const s = seed || 1;
  return {
    sqft: 1240 + (s % 1100),
    listPrice: 329000 + (s % 318000),
    beds: 2 + (s % 3),
    baths: 2 + (s % 2),
  };
}

function atlanta30316PhotoPack(seed: number): { photoUrls: string[]; photoLabels: string[] } {
  const base = hashCode(`atl30316-mock-pack-${seed}`);
  const tags = ["Exterior curb", "Entry & stairs", "Open living / dining", "Kitchen galley upgrade", "Owner suite daylight"];
  const photoUrls = tags.map((t, i) => {
    const token = `${t}-atl-${seed}-${base + i}-${i}`;
    return `https://picsum.photos/seed/${encodeURIComponent(token)}/880/620`;
  });
  const photoLabels = tags.map((t, i) => `${t} — Kirkwood/East Atlanta area style (demo ${i + 1}/5)`);
  return { photoUrls, photoLabels };
}

function mockNumbers(seed: number, hint: RegionHint): {
  sqft: number;
  listPrice: number;
  beds: number;
  baths: number;
} {
  const s = seed;
  let priceFloor = 245000;
  let sqftFloor = 1380;
  if (hint === "atlanta_30316") {
    priceFloor = 289000;
    sqftFloor = 1520;
  } else if (hint === "atlanta") {
    priceFloor = 269000;
    sqftFloor = 1480;
  } else if (hint === "tampa") {
    priceFloor = 239000;
    sqftFloor = 1420;
  } else if (hint === "austin") {
    priceFloor = 359000;
    sqftFloor = 1580;
  }
  return {
    sqft: sqftFloor + (s % 1750),
    listPrice: priceFloor + (s % 535000),
    beds: 2 + (s % 4),
    baths: 2 + (s % 3),
  };
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
  const pathnameLower = url.pathname.toLowerCase();

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
  else if (host.includes("opendoor")) sourceLabel = "Opendoor";
  else if (host.includes("streeteasy")) sourceLabel = "StreetEasy";
  else if (host.includes("movoto")) sourceLabel = "Movoto";
  else if (host.includes("coldwell")) sourceLabel = "Coldwell Banker";
  else if (host.includes("century21")) sourceLabel = "Century 21";
  else if (host.includes("kw.com")) sourceLabel = "KW / Keller Williams";
  else if (host.includes("exprealty")) sourceLabel = "eXp Realty";

  const urlLower = urlString.toLowerCase();
  const zpid = host.includes("zillow") ? extractZillowZpid(url.pathname, url.search, urlLower) : null;
  const slugParsed =
    host.includes("zillow") && pathnameLower.includes("/homedetails/")
      ? parseZillowHomedetailsSlug(url.pathname)
      : null;

  const zipFromPath =
    slugParsed?.zip ??
    (host.includes("zillow") ? extractFiveDigitZipFromPath(url.pathname) : null);

  const cityLower = slugParsed?.cityLower ?? "";
  const hint = regionHintFromZipCity(zipFromPath, cityLower, pathnameLower);

  /** Different listings get different mock beds/sqft/photos — prefer ZPID, else slug, else full URL. */
  const seedKey = zpid ? `zpid:${zpid}` : slugParsed ? `slug:${slugParsed.addressLine1}|${slugParsed.cityStateZip}` : urlString;
  const seed = hashCode(seedKey);

  let addressLine1: string;
  let cityStateZip: string;
  let sqft: number | null = null;
  let listPrice: number | null = null;
  let beds: number | null = null;
  let baths: number | null = null;
  let photoUrls: string[] = [];
  let photoLabels: string[] | undefined;

  /** Curated demo row for real-world Zillow link the team tests with often. */
  const gresham = host.includes("zillow") && isGresham30316Demo(pathnameLower, zpid);
  if (gresham) {
    addressLine1 = "2837 Gresham Rd SE";
    cityStateZip = "Atlanta, GA 30316";
    sqft = 1932;
    listPrice = 439000;
    beds = 2;
    baths = 2;
    const g = greshamDemoPhotos();
    photoUrls = g.photoUrls;
    photoLabels = g.photoLabels;
  } else if (slugParsed) {
    addressLine1 = slugParsed.addressLine1;
    cityStateZip = slugParsed.cityStateZip;
  } else {
    const streets = [
      "742 Evergreen Terrace",
      "1204 Maple Ridge Dr",
      "2837 Gresham Rd",
      "5500 Desert Sage Ln",
      "210 Peachtree Walk",
      "918 Kirkwood Ave SE",
    ];
    const cities = [
      "Austin, TX 78704",
      "Phoenix, AZ 85018",
      "Atlanta, GA 30316",
      "Denver, CO 80205",
      "Tampa, FL 33606",
      "Atlanta, GA 30308",
    ];
    addressLine1 = streets[seed % streets.length];
    const cityIdx =
      zipFromPath?.startsWith("303") ? 2 : zipFromPath?.startsWith("336") ? 4 : seed % cities.length;
    cityStateZip = cities[cityIdx];
  }

  const fullAddress = `${addressLine1}, ${cityStateZip}`;

  let latitude: number;
  let longitude: number;
  if (gresham) {
    latitude = 33.737_42;
    longitude = -84.338_71;
  } else {
    const coordBase = REGION_COORDS[hint] ?? REGION_COORDS.generic;
    const j = jitterCoords(seed, coordBase);
    latitude = j.latitude;
    longitude = j.longitude;
  }

  if (!gresham) {
    const nums =
      hint === "atlanta_30316" && host.includes("zillow")
        ? atlanta30316PlausibleMock(seed)
        : mockNumbers(seed, hint);
    sqft = nums.sqft;
    listPrice = nums.listPrice;
    beds = nums.beds;
    baths = nums.baths;
    if (hint === "atlanta_30316" && host.includes("zillow")) {
      const pack = atlanta30316PhotoPack(seed);
      photoUrls = pack.photoUrls;
      photoLabels = pack.photoLabels;
    } else {
      photoUrls = [
        `https://picsum.photos/seed/z-${seed}-ext/880/620`,
        `https://picsum.photos/seed/z-${seed}-liv/880/620`,
        `https://picsum.photos/seed/z-${seed}-kit/880/620`,
        `https://picsum.photos/seed/z-${seed}-bed/880/620`,
        `https://picsum.photos/seed/z-${seed}-rear/880/620`,
      ];
    }
  }

  const out: ParsedListing = {
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
  if (photoLabels?.length) out.photoLabels = photoLabels;
  return out;
}
