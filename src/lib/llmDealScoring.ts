/**
 * LLM deal scoring — optional OpenAI call when EXPO_PUBLIC_OPENAI_API_KEY is set.
 * Falls back to deterministic heuristic (Expo Go / CI friendly). Production should move scoring behind a gated Edge Function.
 */

export type LlmScoreBundle = {
  llmScore: number;
  rationale: string;
  /** Display as approximate confidence in the score (PRD-style confidence factor). */
  confidencePct: number;
  scoredAt: string;
  scoringSource: "remote_llm" | "local_heuristic";
};

export type DealScoreInput = {
  address: string;
  listPrice: number;
  arvEstimate: number;
  region: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic pseudo-score for offline / no-key environments. */
export function scoreDealHeuristic(deal: DealScoreInput): Omit<LlmScoreBundle, "scoredAt" | "scoringSource"> {
  const margin = (deal.arvEstimate - deal.listPrice) / Math.max(deal.listPrice, 1);
  const score = clamp(Math.round(50 + margin * 120), 0, 100);
  const rationale =
    score >= 75
      ? "Strong margin vs. list; comps support upside with moderate rehab risk."
      : score >= 55
        ? "Acceptable spread; verify rehab scope and holding timeline."
        : "Thin margin or elevated risk; negotiate or pass pending diligence.";
  const confidencePct = clamp(Math.round(10 + (100 - Math.abs(score - 62)) / 8), 4, 18);
  return { llmScore: score, rationale, confidencePct };
}

function bundleLocal(deal: DealScoreInput): LlmScoreBundle {
  const h = scoreDealHeuristic(deal);
  return {
    ...h,
    scoredAt: new Date().toISOString(),
    scoringSource: "local_heuristic",
  };
}

/**
 * Full scoring path: tries Chat Completions JSON when API key present; otherwise heuristic.
 * Set EXPO_PUBLIC_OPENAI_API_KEY (and optionally EXPO_PUBLIC_OPENAI_MODEL, default gpt-4o-mini).
 */
export async function scoreDealWithLlmAsync(deal: DealScoreInput): Promise<LlmScoreBundle> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const model = process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey?.trim()) {
    return bundleLocal(deal);
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 14_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You rank residential flip deals. Respond with JSON only: {"score":number 0-100,"rationale":string max 280 chars,"confidencePct":number 4-25 estimating certainty of the score}.',
          },
          {
            role: "user",
            content: JSON.stringify({
              address: deal.address,
              listPrice: deal.listPrice,
              arvEstimate: deal.arvEstimate,
              region: deal.region,
            }),
          },
        ],
      }),
    });

    if (!res.ok) {
      return bundleLocal(deal);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return bundleLocal(deal);

    let parsed: { score?: number; rationale?: string; confidencePct?: number };
    try {
      parsed = JSON.parse(raw) as {
        score?: number;
        rationale?: string;
        confidencePct?: number;
      };
    } catch {
      return bundleLocal(deal);
    }

    const llmScore = clamp(Number(parsed.score) || 0, 0, 100);
    const rationale =
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim().slice(0, 320)
        : scoreDealHeuristic(deal).rationale;
    const confidencePct = clamp(Number(parsed.confidencePct) || 12, 4, 25);

    return {
      llmScore,
      rationale,
      confidencePct,
      scoredAt: new Date().toISOString(),
      scoringSource: "remote_llm",
    };
  } catch {
    return bundleLocal(deal);
  } finally {
    clearTimeout(t);
  }
}
