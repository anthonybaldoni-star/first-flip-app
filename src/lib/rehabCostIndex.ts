import type { SubscriptionTier } from "../types/subscription";
import { canUseAiRehabSuggestions, canUseFullCostIndexing } from "./featureGating";

/** Regional cost multipliers vs national baseline (demo local indexing). */
export const COST_INDEX_REGIONS: { key: string; label: string; multiplier: number }[] = [
  { key: "us_avg", label: "US national average", multiplier: 1 },
  { key: "aus_tx", label: "Austin, TX", multiplier: 1.06 },
  { key: "phx_az", label: "Phoenix, AZ", multiplier: 1.02 },
  { key: "tpa_fl", label: "Tampa, FL", multiplier: 1.04 },
  { key: "atl_ga", label: "Atlanta, GA", multiplier: 0.98 },
  { key: "den_co", label: "Denver, CO", multiplier: 1.1 },
  { key: "sea_wa", label: "Seattle, WA", multiplier: 1.14 },
  { key: "bos_ma", label: "Boston, MA", multiplier: 1.12 },
];

/** Apply regional multiplier to stored national-dollar amounts (UI only). */
export function applyCostIndex(baseAmount: number, regionKey: string, tier: SubscriptionTier): number {
  if (!canUseFullCostIndexing(tier)) {
    return Math.round(baseAmount);
  }
  const region = COST_INDEX_REGIONS.find((r) => r.key === regionKey);
  const m = region?.multiplier ?? 1;
  return Math.round(baseAmount * m);
}

/** Demo AI-suggested line items (national dollars); UI applies `applyCostIndex` once. */
export function suggestAiLineItemsForCategory(
  categoryId: string,
  tier: SubscriptionTier,
): { description: string; baseAmount: number }[] {
  if (!canUseAiRehabSuggestions(tier)) return [];

  const map: Record<string, { description: string; baseAmount: number }[]> = {
    demo: [
      { description: "Interior demo + debris haul (per dumpster)", baseAmount: 4200 },
      { description: "Hazardous handling allowance (if applicable)", baseAmount: 800 },
    ],
    struct: [
      { description: "Structural engineer review + permits", baseAmount: 2200 },
      { description: "Load-bearing wall / beam adjustments", baseAmount: 8500 },
    ],
    foundation: [
      { description: "Pier / beam stabilization (as needed)", baseAmount: 12000 },
      { description: "Interior drain + sump (water management)", baseAmount: 4800 },
    ],
    roof: [
      { description: "Architectural shingle replace (mid-grade)", baseAmount: 14500 },
      { description: "Decking repair pockets + flashing", baseAmount: 3200 },
    ],
    gutters: [
      { description: "6\" seamless gutters + guards (typ. SFH)", baseAmount: 3200 },
      { description: "Downspout extensions + grading touch-ups", baseAmount: 900 },
    ],
    exterior: [
      { description: "Fiber cement / LP siding repair + paint package", baseAmount: 16500 },
      { description: "Trim, caulk, and weather-seal detail", baseAmount: 2800 },
    ],
    windows: [
      { description: "Vinyl retrofit windows (per opening — mid grade)", baseAmount: 8500 },
      { description: "Exterior door slab + lockset upgrade", baseAmount: 4200 },
    ],
    garage: [
      { description: "Garage door + opener replace", baseAmount: 3600 },
      { description: "Driveway patch + seal coat", baseAmount: 2200 },
    ],
    electrical: [
      { description: "Panel upgrade to 200A + AFCI compliance", baseAmount: 4800 },
      { description: "Receptacle / switch refresh + LED cans (allowance)", baseAmount: 5200 },
    ],
    plumbing: [
      { description: "Supply repipe allowance (PEX, typical)", baseAmount: 9800 },
      { description: "Water heater swap (tank, 50gal class)", baseAmount: 2200 },
    ],
    hvac: [{ description: "14 SEER split replace + duct sealing", baseAmount: 12500 }],
    insulation: [
      { description: "Attic blown-in to R-38+ (as needed)", baseAmount: 3400 },
      { description: "Rim joist + air sealing package", baseAmount: 1800 },
    ],
    drywall: [
      { description: "Hang, tape, mud, Level 4 finish (allowance)", baseAmount: 9200 },
      { description: "Texture match + spot prime", baseAmount: 1600 },
    ],
    int_paint: [
      { description: "Whole-house interior paint (2 coats)", baseAmount: 8900 },
      { description: "Ceiling refresh + trim enamel", baseAmount: 3400 },
    ],
    flooring: [
      { description: "LVP main areas + labor", baseAmount: 11200 },
      { description: "Carpet (bedrooms) + pad", baseAmount: 4800 },
    ],
    kitchen_cabs: [
      { description: "Semi-custom cabinets + quartz counters", baseAmount: 28000 },
      { description: "Backsplash + minor layout tweaks", baseAmount: 4500 },
    ],
    kitchen_app: [
      { description: "Mid-grade appliance package (ref range DW micro)", baseAmount: 7200 },
      { description: "Disposal + outlet/microwave circuit", baseAmount: 900 },
    ],
    bath: [
      { description: "Hall bath full gut + waterproofing", baseAmount: 18500 },
      { description: "Primary bath valve/fixture package", baseAmount: 6200 },
    ],
    lighting: [
      { description: "Fixture package + ceiling fan swaps", baseAmount: 3200 },
      { description: "Exterior sconces + motion/security", baseAmount: 1400 },
    ],
    trim: [
      { description: "Baseboard / casing replace + stain/paint", baseAmount: 4800 },
      { description: "Interior door hardware upgrade", baseAmount: 1100 },
    ],
    mold: [
      { description: "Remediation scope (containment + treatment)", baseAmount: 6200 },
      { description: "Post-remediation clearance test allowance", baseAmount: 550 },
    ],
    landscape: [
      { description: "Grading / drainage swale (minor)", baseAmount: 3800 },
      { description: "Sod or seed + mulch refresh (front)", baseAmount: 2600 },
    ],
    permits: [
      { description: "Building permits + plan review fees (allowance)", baseAmount: 2400 },
      { description: "GC supervision / job trailer / dumpster rotation", baseAmount: 4500 },
    ],
    contingency: [{ description: "10% scope contingency line", baseAmount: 15000 }],
  };

  const fallback = [
    { description: `Typical scope — verify with bids (${categoryId})`, baseAmount: 5000 },
    { description: "Allowance for unknowns (GC review)", baseAmount: 1200 },
  ];

  return map[categoryId] ?? fallback;
}
