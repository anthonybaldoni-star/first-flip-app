/**
 * Prompt-injection mitigation for LLM inputs (PRD). Strip obvious instruction overrides.
 * Server-side validation is still required for production APIs.
 */
export function sanitizeUserPrompt(input: string): string {
  const stripped = input
    .replace(/\bignore (previous|all) instructions\b/gi, "[removed]")
    .replace(/\bsystem:\s*/gi, "")
    .replace(/\bassistant:\s*/gi, "")
    .trim();
  return stripped.slice(0, 8000);
}
