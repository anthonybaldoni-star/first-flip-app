/** Timestamped ARV engine output with confidence factor — PRD requirement. */
export type EstimateSnapshot = {
  generatedAt: string;
  arv: number;
  confidencePct: number;
  repairEstimate: number;
  maxOffer70: number;
  riskScore: number;
  ruleStatus: "Safe" | "On the Line" | "Over";
  purchasePrice: number;
};

export function formatEstimateTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function buildEstimateSnapshot(purchasePrice: number, repairEstimate: number): EstimateSnapshot {
  const arv = 425000;
  const confidencePct = 6;
  const holdingAndSelling = Math.round(arv * 0.08);
  const totalInvested = purchasePrice + repairEstimate + holdingAndSelling;
  const grossProfit = arv - totalInvested;
  const maxOffer70 = Math.round(arv * 0.7 - repairEstimate);
  const marginPct = totalInvested > 0 ? (grossProfit / totalInvested) * 100 : 0;
  const riskScore =
    marginPct >= 25 && purchasePrice <= maxOffer70 ? 3 : marginPct >= 15 ? 5 : marginPct >= 8 ? 7 : 9;
  let ruleStatus: EstimateSnapshot["ruleStatus"] = "Over";
  if (purchasePrice <= maxOffer70 * 0.98) ruleStatus = "Safe";
  else if (purchasePrice <= maxOffer70 * 1.03) ruleStatus = "On the Line";

  return {
    generatedAt: new Date().toISOString(),
    arv,
    confidencePct,
    repairEstimate,
    maxOffer70,
    riskScore,
    ruleStatus,
    purchasePrice,
  };
}

/** Demo subject property — comps are placed within ~1 mi for map radius (PRD comp radius search). */
export const DEMO_PIPELINE_SUBJECT = {
  latitude: 30.302,
  longitude: -97.732,
  label: "Subject property",
};

/** Default search radius shown on map (miles). */
export const DEFAULT_COMP_RADIUS_MILES = 1.25;

export type CompRow = {
  id: string;
  address: string;
  soldPrice: number;
  sqft: number;
  url: string;
  latitude: number;
  longitude: number;
};

/** Degrees offset from demo subject — keeps comps inside mock radius for MapView + Circle. */
const COMP_OFFSETS: [number, number][] = [
  [0.0105, 0.0072],
  [-0.0081, 0.0094],
  [0.0063, -0.0112],
  [-0.0115, -0.0055],
  [0.0092, 0.012],
  [-0.0068, -0.0098],
];

export const MOCK_COMPS: CompRow[] = [
  {
    id: "1",
    address: "412 Oak Lane",
    soldPrice: 418000,
    sqft: 1850,
    url: "https://www.google.com/maps/search/?api=1&query=412+Oak+Lane+Austin+TX",
    latitude: DEMO_PIPELINE_SUBJECT.latitude + COMP_OFFSETS[0][0],
    longitude: DEMO_PIPELINE_SUBJECT.longitude + COMP_OFFSETS[0][1],
  },
  {
    id: "2",
    address: "908 Pine Rd",
    soldPrice: 435000,
    sqft: 1920,
    url: "https://www.google.com/maps/search/?api=1&query=908+Pine+Rd+Austin+TX",
    latitude: DEMO_PIPELINE_SUBJECT.latitude + COMP_OFFSETS[1][0],
    longitude: DEMO_PIPELINE_SUBJECT.longitude + COMP_OFFSETS[1][1],
  },
  {
    id: "3",
    address: "77 Riverbend Ct",
    soldPrice: 402000,
    sqft: 1780,
    url: "https://www.google.com/maps/search/?api=1&query=77+Riverbend+Ct+Austin+TX",
    latitude: DEMO_PIPELINE_SUBJECT.latitude + COMP_OFFSETS[2][0],
    longitude: DEMO_PIPELINE_SUBJECT.longitude + COMP_OFFSETS[2][1],
  },
  {
    id: "4",
    address: "2100 Cedar Bluff Dr",
    soldPrice: 428000,
    sqft: 1880,
    url: "https://www.google.com/maps/search/?api=1&query=2100+Cedar+Bluff+Dr+Austin+TX",
    latitude: DEMO_PIPELINE_SUBJECT.latitude + COMP_OFFSETS[3][0],
    longitude: DEMO_PIPELINE_SUBJECT.longitude + COMP_OFFSETS[3][1],
  },
  {
    id: "5",
    address: "55 Lakeshore Way",
    soldPrice: 441000,
    sqft: 2010,
    url: "https://www.google.com/maps/search/?api=1&query=55+Lakeshore+Way+Austin+TX",
    latitude: DEMO_PIPELINE_SUBJECT.latitude + COMP_OFFSETS[4][0],
    longitude: DEMO_PIPELINE_SUBJECT.longitude + COMP_OFFSETS[4][1],
  },
  {
    id: "6",
    address: "300 Magnolia St",
    soldPrice: 399000,
    sqft: 1720,
    url: "https://www.google.com/maps/search/?api=1&query=300+Magnolia+St+Austin+TX",
    latitude: DEMO_PIPELINE_SUBJECT.latitude + COMP_OFFSETS[5][0],
    longitude: DEMO_PIPELINE_SUBJECT.longitude + COMP_OFFSETS[5][1],
  },
];

/** Shift demo comps so they surround an intake property’s coordinates (same relative spread). */
export function shiftCompsToSubject(subjectLat: number, subjectLng: number): CompRow[] {
  const dLat = subjectLat - DEMO_PIPELINE_SUBJECT.latitude;
  const dLng = subjectLng - DEMO_PIPELINE_SUBJECT.longitude;
  return MOCK_COMPS.map((c) => ({
    ...c,
    latitude: c.latitude + dLat,
    longitude: c.longitude + dLng,
  }));
}

/** 70% rule + sensitivity: purchase price scenarios vs net margin (PRD sensitivity table). */
export type SensitivityRow = {
  label: string;
  purchasePrice: number;
  netMarginPct: number;
  totalInvested: number;
};

export function buildSensitivityTable(snapshot: EstimateSnapshot): SensitivityRow[] {
  const { arv, repairEstimate } = snapshot;
  const holdingAndSelling = Math.round(arv * 0.08);
  const base = snapshot.purchasePrice;

  const deltas = [
    { label: "−10% vs base offer", mult: 0.9 },
    { label: "−5% vs base offer", mult: 0.95 },
    { label: "Base offer", mult: 1 },
    { label: "+5% vs base offer", mult: 1.05 },
    { label: "+10% vs base offer", mult: 1.1 },
  ];

  return deltas.map(({ label, mult }) => {
    const purchasePrice = Math.round(base * mult);
    const totalInvested = purchasePrice + repairEstimate + holdingAndSelling;
    const grossProfit = arv - totalInvested;
    const netMarginPct = totalInvested > 0 ? (grossProfit / totalInvested) * 100 : 0;
    return { label, purchasePrice, netMarginPct, totalInvested };
  });
}
