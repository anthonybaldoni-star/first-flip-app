/**
 * Automatic Deal Scanner — geography-based results with LLM scores (`scoreDealWithLlmAsync`).
 * Ranked lists sort by `llmScore` descending. Remote LLM uses `EXPO_PUBLIC_OPENAI_API_KEY` when set.
 * Subscription tier must be re-checked server-side for production APIs (PRD).
 */

import { scoreDealHeuristic, scoreDealWithLlmAsync } from "./llmDealScoring";

export type ScannedDeal = {
  id: string;
  address: string;
  listPrice: number;
  arvEstimate: number;
  llmScore: number;
  rationale: string;
  region: string;
  scoredAt: string;
  confidencePct: number;
  scoringSource: "remote_llm" | "local_heuristic";
};

export const GEOGRAPHIES = [
  { key: "aus", label: "Austin, TX" },
  { key: "phx", label: "Phoenix, AZ" },
  { key: "tpa", label: "Tampa, FL" },
  { key: "atl", label: "Atlanta, GA" },
] as const;

type Seed = { address: string; listPrice: number; arvEstimate: number };

const REGION_SEEDS: Seed[][] = [
  [
    { address: "910 Barton Springs Rd", listPrice: 515000, arvEstimate: 685000 },
    { address: "204 Riverside Dr", listPrice: 389000, arvEstimate: 498000 },
    { address: "77 Travis Heights", listPrice: 620000, arvEstimate: 745000 },
    { address: "1400 South 1st St", listPrice: 445000, arvEstimate: 560000 },
  ],
  [
    { address: "3320 E Camelback Rd", listPrice: 425000, arvEstimate: 538000 },
    { address: "8812 N Central Ave", listPrice: 315000, arvEstimate: 410000 },
    { address: "55 W Maryland Ave", listPrice: 510000, arvEstimate: 620000 },
    { address: "1202 E Broadway Rd", listPrice: 268000, arvEstimate: 355000 },
  ],
  [
    { address: "410 Bayshore Blvd", listPrice: 335000, arvEstimate: 455000 },
    { address: "901 Harbour Island Blvd", listPrice: 590000, arvEstimate: 702000 },
    { address: "72 Palm Ave", listPrice: 285000, arvEstimate: 392000 },
    { address: "3001 W Azeele St", listPrice: 398000, arvEstimate: 505000 },
  ],
  [
    { address: "1555 Peachtree St NE", listPrice: 475000, arvEstimate: 598000 },
    { address: "420 Memorial Dr SE", listPrice: 350000, arvEstimate: 468000 },
    { address: "88 Decatur St SE", listPrice: 295000, arvEstimate: 388000 },
    { address: "2100 Howell Mill Rd NW", listPrice: 525000, arvEstimate: 655000 },
  ],
];

function buildBases(regionIndex: number, refreshNonce: number) {
  const idx = ((regionIndex % GEOGRAPHIES.length) + GEOGRAPHIES.length) % GEOGRAPHIES.length;
  const region = GEOGRAPHIES[idx].label;
  const seeds = REGION_SEEDS[idx] ?? REGION_SEEDS[0];
  const jitter = (refreshNonce % 11) * 175;

  return seeds.map((s, i) => ({
    id: `deal-${GEOGRAPHIES[idx].key}-${i}-r${refreshNonce}`,
    address: s.address,
    listPrice: s.listPrice + jitter + (i % 3) * 50,
    arvEstimate: s.arvEstimate + Math.floor(refreshNonce / 3) * 100,
    region,
  }));
}

/** Sync path: heuristic only (instant UI / Storybook). */
export function runAutomaticScan(regionIndex: number, refreshNonce = 0): ScannedDeal[] {
  const bases = buildBases(regionIndex, refreshNonce);
  const deals: ScannedDeal[] = bases.map((base) => {
    const h = scoreDealHeuristic(base);
    return {
      ...base,
      llmScore: h.llmScore,
      rationale: h.rationale,
      confidencePct: h.confidencePct,
      scoredAt: new Date().toISOString(),
      scoringSource: "local_heuristic",
    };
  });
  return [...deals].sort((a, b) => b.llmScore - a.llmScore);
}

/** Full pipeline: parallel remote LLM (or heuristic fallback per deal). */
export async function runAutomaticScanAsync(
  regionIndex: number,
  refreshNonce = 0,
): Promise<ScannedDeal[]> {
  const bases = buildBases(regionIndex, refreshNonce);
  const scored = await Promise.all(
    bases.map(async (base) => {
      const s = await scoreDealWithLlmAsync(base);
      return {
        ...base,
        llmScore: s.llmScore,
        rationale: s.rationale,
        confidencePct: s.confidencePct,
        scoredAt: s.scoredAt,
        scoringSource: s.scoringSource,
      } satisfies ScannedDeal;
    }),
  );
  return [...scored].sort((a, b) => b.llmScore - a.llmScore);
}
