import type {
  Confidence,
  DisagreementType,
  EvidenceCard,
  EvidenceQuote,
} from "@oryn/shared";
import type { ExtractedContent } from "./fetch-and-extract";
import type { SearchHit } from "./grounded-search";
import { clamp } from "./fetch-and-extract";

export type BuildCardsInput = {
  claimTexts: string[];
  disagreementTypes: DisagreementType[];
  evidenceHits: SearchHit[];
  counterHits: SearchHit[];
  extractedByUrl: Map<string, ExtractedContent>;
  sessionUrl?: string;
  sessionTitle?: string;
  toolCallIds: [string, string];
};

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function pickQuote(h: SearchHit): string {
  return clamp(h.snippet ?? h.title ?? h.url, 220);
}

function confidenceFrom(evidenceCount: number, counterCount: number): Confidence {
  if (evidenceCount >= 1 && counterCount >= 1) return "Medium";
  if (evidenceCount >= 1) return "Low";
  return "Low";
}

/**
 * Assembles EvidenceCard[] from claims, search hits, and extracted content.
 * Each card pairs evidence with counter-evidence and maintains the epistemic contract
 * (every card has at least one URL).
 */
export function buildEvidenceCards(input: BuildCardsInput): EvidenceCard[] {
  const {
    claimTexts,
    disagreementTypes,
    evidenceHits,
    counterHits,
    extractedByUrl,
    sessionUrl,
    sessionTitle,
    toolCallIds,
  } = input;

  const maxCards = 4;
  const cards: EvidenceCard[] = [];

  for (const [idx, cText] of claimTexts.slice(0, maxCards).entries()) {
    const disagreementType = disagreementTypes[idx] ?? "Factual";
    const evHits = evidenceHits.slice(idx, idx + 1);
    const ctHits = counterHits.slice(idx, idx + 1);

    const evidence: EvidenceQuote[] = evHits.map((h) => {
      const ex = extractedByUrl.get(h.url);
      return {
        quote: clamp(ex?.quotes[0] ?? pickQuote(h), 220),
        url: h.url,
        title: ex?.title ?? h.title,
        domain: h.domain ?? domainFromUrl(h.url),
      };
    });

    const counterEvidence: EvidenceQuote[] = ctHits.map((h) => {
      const ex = extractedByUrl.get(h.url);
      return {
        quote: clamp(ex?.quotes[0] ?? pickQuote(h), 220),
        url: h.url,
        title: ex?.title ?? h.title,
        domain: h.domain ?? domainFromUrl(h.url),
      };
    });

    // Fallback: use the session URL as evidence surface
    if (evidence.length === 0 && sessionUrl) {
      evidence.push({
        quote: clamp(cText, 220),
        url: sessionUrl,
        title: sessionTitle,
        domain: domainFromUrl(sessionUrl),
      });
    }
    if (counterEvidence.length === 0 && sessionUrl) {
      counterEvidence.push({
        quote: "Missing frame: the article may omit relevant counter-evidence or alternative definitions.",
        url: sessionUrl,
        title: sessionTitle,
        domain: domainFromUrl(sessionUrl),
      });
    }

    // Fallback for claim-check mode with no URL
    if (evidence.length === 0 && !sessionUrl) {
      const q = `primary sources for claim: ${cText}`;
      evidence.push({
        quote: clamp(cText, 220),
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        title: `Search: ${clamp(q, 72)}`,
        domain: "google.com",
      });
    }
    if (counterEvidence.length === 0 && !sessionUrl) {
      const q = `counter-evidence for claim: ${cText}`;
      counterEvidence.push({
        quote: "Missing frame: seek the strongest critique and alternative assumptions.",
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        title: `Search: ${clamp(q, 72)}`,
        domain: "google.com",
      });
    }

    cards.push({
      id: `card_${idx + 1}`,
      claimText: clamp(cText, 180),
      disagreementType,
      confidence: confidenceFrom(evidence.length, counterEvidence.length),
      evidence,
      counterEvidence,
      pinned: idx === 0,
      traceRef: { toolCallIds },
    });
  }

  return cards;
}
