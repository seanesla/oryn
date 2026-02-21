import type { GoogleGenAI } from "@google/genai";
import type { DisagreementType } from "@oryn/shared";
import type { ExtractedClaim } from "./extract-claims";
import type { SearchHit } from "./grounded-search";
import { guessDisagreementType } from "./extract-claims";

export type DisputeClassification = {
  claimText: string;
  disagreementType: DisagreementType;
  reasoning?: string;
};

/**
 * Classifies the disagreement type for each claim by comparing against sources.
 *
 * Primary path: uses Gemini structured JSON output.
 * Fallback: uses regex heuristic on claim text alone.
 */
export async function classifyDisagreement(
  claims: ExtractedClaim[],
  sources: SearchHit[],
  ai?: GoogleGenAI,
  model?: string,
): Promise<DisputeClassification[]> {
  // Try Gemini-powered classification first
  if (ai && claims.length > 0 && sources.length > 0) {
    try {
      return await classifyWithGemini(claims, sources, ai, model);
    } catch {
      // Fall through to heuristic
    }
  }

  // Heuristic fallback: regex on claim text only
  return claims.map((c) => ({
    claimText: c.text,
    disagreementType: c.tag ?? guessDisagreementType(c.text),
  }));
}

async function classifyWithGemini(
  claims: ExtractedClaim[],
  sources: SearchHit[],
  ai: GoogleGenAI,
  model?: string,
): Promise<DisputeClassification[]> {
  const modelId = model?.trim() || "gemini-2.0-flash";

  const claimsList = claims.map((c, i) => `${i + 1}. "${c.text}"`).join("\n");
  const sourcesList = sources
    .slice(0, 8)
    .map((s, i) => `${i + 1}. [${s.title}](${s.url})${s.snippet ? ` - ${s.snippet}` : ""}`)
    .join("\n");

  const prompt = `Given these claims and sources, classify each claim's disagreement type.

Claims:
${claimsList}

Sources:
${sourcesList}

For each claim, determine the primary disagreement type:
- "Factual": dispute about what is true (data, measurements, events)
- "Causal": dispute about what caused what
- "Definition": dispute about how terms or metrics are defined
- "Values": dispute about what should be done (tradeoffs, priorities)
- "Prediction": dispute about what will happen

Return ONLY a JSON array:
[{"claimText": "...", "disagreementType": "Factual", "reasoning": "brief explanation"}]`;

  const resp = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const raw = resp.text?.trim();
  if (!raw) throw new Error("Empty response");

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Not an array");

  const validTypes = new Set<string>(["Factual", "Causal", "Definition", "Values", "Prediction"]);

  return parsed
    .filter((item: any) => typeof item.claimText === "string" && validTypes.has(item.disagreementType))
    .map((item: any) => ({
      claimText: item.claimText,
      disagreementType: item.disagreementType as DisagreementType,
      reasoning: typeof item.reasoning === "string" ? item.reasoning : undefined,
    }));
}
