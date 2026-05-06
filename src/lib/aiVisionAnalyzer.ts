/**
 * Client-side demo analyzer — production should call a gated Edge Function with signed URLs.
 * Output includes timestamp and confidence per PRD (real-time estimates pattern).
 */

export type VisionCategory =
  | "Structural"
  | "Systems"
  | "Interior / cosmetic"
  | "Exterior"
  | "Code / safety";

export type VisionSuggestion = {
  id: string;
  category: VisionCategory;
  finding: string;
  suggestedAction: string;
  estCostBand: string;
  priority: "High" | "Medium" | "Low";
};

export type AiVisionResult = {
  generatedAt: string;
  confidencePct: number;
  summary: string;
  items: VisionSuggestion[];
  overallRisk: "Low" | "Moderate" | "Elevated";
  photoCountUsed: number;
};

/** Deterministic mock from photo count + optional notes keywords. */
export function analyzeVisitPhotos(photoCount: number, notes: string): AiVisionResult {
  const generatedAt = new Date().toISOString();
  const n = Math.max(0, photoCount);
  const lower = notes.toLowerCase();

  const items: VisionSuggestion[] = [];

  if (n >= 1) {
    items.push({
      id: "v1",
      category: "Structural",
      finding:
        n >= 3
          ? "Ceiling/wall planes suggest possible settlement or patch history in main living areas."
          : "Limited angles — confirm floor-level square and bearing paths on second pass.",
      suggestedAction: "Verify with level line + engineer if cracks run diagonally through openings.",
      estCostBand: n >= 3 ? "$4k–$12k" : "$2k–$8k (confirm scope)",
      priority: "High",
    });
  }

  if (n >= 2) {
    items.push({
      id: "v2",
      category: "Systems",
      finding: "MEP rough-in age unclear from photos; budget contingency recommended.",
      suggestedAction: "Scope panel, water heater, and HVAC cabinet serial/plate photos next visit.",
      estCostBand: "$8k–$22k",
      priority: "Medium",
    });
  }

  if (lower.includes("roof") || lower.includes("leak")) {
    items.push({
      id: "v3",
      category: "Exterior",
      finding: "Notes mention roof/leaks — prioritize decking inspection and chimney flashing.",
      suggestedAction: "Drone or ladder inspection + bid from two roofers with leak warranty.",
      estCostBand: "$6k–$18k",
      priority: "High",
    });
  }

  if (n >= 4) {
    items.push({
      id: "v4",
      category: "Interior / cosmetic",
      finding: "Kitchen/bath finishes appear dated; strong ARV lift if layout stays intact.",
      suggestedAction: "Quote cabinet refinish vs. replace; align flooring transitions to exits.",
      estCostBand: "$12k–$35k",
      priority: "Medium",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "v0",
      category: "Interior / cosmetic",
      finding: "Add photos of kitchens, baths, and mechanical areas for targeted renovation line items.",
      suggestedAction: "Capture wide + detail shots per room; re-run AI Vision after upload.",
      estCostBand: "—",
      priority: "Low",
    });
  }

  const confidencePct = Math.min(92, 42 + n * 12 + (lower.length > 40 ? 6 : 0));
  let overallRisk: AiVisionResult["overallRisk"] = "Moderate";
  if (items.some((i) => i.priority === "High")) overallRisk = "Elevated";
  if (n >= 4 && overallRisk !== "Elevated") overallRisk = "Low";

  const summary =
    n === 0
      ? "No photos yet — upload images for room-by-room renovation suggestions."
      : `Prioritize ${items.filter((i) => i.priority === "High").length} high-priority item(s); overall rehab scope appears ${overallRisk.toLowerCase()} vs. typical cosmetic flips.`;

  return {
    generatedAt,
    confidencePct,
    summary,
    items,
    overallRisk,
    photoCountUsed: n,
  };
}
