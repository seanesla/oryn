import type { GoogleGenAI } from "@google/genai";
import type { DisagreementType } from "@oryn/shared";
import { splitSentences } from "./fetch-and-extract";

export type ExtractedClaim = {
  text: string;
  tag: DisagreementType;
};

function guessDisagreementType(claimText: string): DisagreementType {
  const c = claimText.toLowerCase();
  if (/(means|defined as|definition|metric|measured as)/.test(c)) return "Definition";
  if (/(will|forecast|expected|likely|projected|by \d{4})/.test(c)) return "Prediction";
  if (/(should|ought|fair|unfair|tradeoff|values|moral)/.test(c)) return "Values";
  if (/(cause|led to|due to|because|resulted in|impact|reduced|increased)/.test(c)) return "Causal";
  return "Factual";
}

/**
 * Extracts atomic claims from text and tags each with a disagreement type.
 *
 * Primary path: uses Gemini structured JSON output for semantic extraction.
 * Fallback: splits text into sentences and tags via regex heuristic.
 */
export async function extractClaims(
  text: string,
  ai?: GoogleGenAI,
  model?: string,
): Promise<ExtractedClaim[]> {
  // Try Gemini-powered extraction first
  if (ai) {
    try {
      return await extractClaimsWithGemini(text, ai, model);
    } catch {
      // Fall through to heuristic
    }
  }

  // Heuristic fallback: sentence splitting + regex tagging
  const sentences = splitSentences(text).slice(0, 4);
  return sentences.map((s) => ({
    text: s,
    tag: guessDisagreementType(s),
  }));
}

async function extractClaimsWithGemini(
  text: string,
  ai: GoogleGenAI,
  model?: string,
): Promise<ExtractedClaim[]> {
  const modelId = model?.trim() || "gemini-2.0-flash";

  const prompt = `Extract the main factual claims from the following text. For each claim, provide:
- "text": the atomic claim as a single sentence
- "tag": one of "Factual", "Causal", "Definition", "Values", "Prediction"

Return ONLY a JSON array. Example:
[{"text": "GDP grew 3% in Q2", "tag": "Factual"}, {"text": "Tax cuts caused the growth", "tag": "Causal"}]

Text to analyze:
${text.slice(0, 3000)}`;

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

  const validTags = new Set<string>(["Factual", "Causal", "Definition", "Values", "Prediction"]);

  return parsed
    .filter((item: any) => typeof item.text === "string" && validTags.has(item.tag))
    .slice(0, 8)
    .map((item: any) => ({ text: item.text, tag: item.tag as DisagreementType }));
}

export { guessDisagreementType };
