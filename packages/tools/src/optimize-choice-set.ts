import type { ChoiceSetItem, EvidenceCard, SessionConstraints } from "@oryn/shared";
import type { SearchHit } from "./grounded-search";

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

type FrameLabel = "Measurement / definitions" | "Counter-frame" | "Corroboration";

/**
 * Selects 3 optimal next-reads from available search hits and evidence cards.
 *
 * Objectives:
 * - Maximize frame coverage (measurement, counter-frame, corroboration)
 * - Maximize independent corroboration (different domains)
 * - Include at least one credible counter-frame
 * - Minimize redundancy
 */
export function optimizeChoiceSet(
  cards: EvidenceCard[],
  hits: SearchHit[],
  constraints?: SessionConstraints,
): ChoiceSetItem[] {
  // Collect all candidate URLs from evidence cards + search hits
  const candidates: Array<{
    url: string;
    title: string;
    domain: string;
    frameLabel: FrameLabel;
    reason: string;
    isPrimarySource: boolean;
    score: number;
  }> = [];

  const seenUrls = new Set<string>();

  // Extract URLs from evidence cards (these are high-quality since we already vetted them)
  for (const card of cards) {
    for (const ev of card.evidence) {
      if (!ev.url || seenUrls.has(ev.url)) continue;
      seenUrls.add(ev.url);
      candidates.push({
        url: ev.url,
        title: ev.title ?? ev.url,
        domain: ev.domain ?? domainFromUrl(ev.url),
        frameLabel: "Corroboration",
        reason: `Supports "${clamp(card.claimText, 60)}" with direct evidence.`,
        isPrimarySource: /\.(gov|edu)$/.test(ev.domain ?? ""),
        score: 2,
      });
    }
    for (const ce of card.counterEvidence) {
      if (!ce.url || seenUrls.has(ce.url) || ce.url.includes("google.com/search")) continue;
      seenUrls.add(ce.url);
      candidates.push({
        url: ce.url,
        title: ce.title ?? ce.url,
        domain: ce.domain ?? domainFromUrl(ce.url),
        frameLabel: "Counter-frame",
        reason: `Offers an alternative perspective on "${clamp(card.claimText, 60)}".`,
        isPrimarySource: /\.(gov|edu)$/.test(ce.domain ?? ""),
        score: 3, // Counter-frames are high-value
      });
    }
  }

  // Add search hits not already in evidence
  for (const [i, h] of hits.entries()) {
    if (!h.url || seenUrls.has(h.url)) continue;
    seenUrls.add(h.url);
    const frame: FrameLabel = i === 0 ? "Measurement / definitions" : i === 1 ? "Counter-frame" : "Corroboration";
    candidates.push({
      url: h.url,
      title: h.title,
      domain: h.domain ?? domainFromUrl(h.url),
      frameLabel: frame,
      reason:
        frame === "Measurement / definitions"
          ? "Clarifies definitions and measurement."
          : frame === "Counter-frame"
            ? "Adds an explicit critique or alternative frame."
            : "Provides independent context to confirm or falsify the claim.",
      isPrimarySource: /\.(gov|edu)$/.test(h.domain ?? ""),
      score: 1,
    });
  }

  // Score and select: prioritize diversity of frames and domains
  // Boost primary sources
  for (const c of candidates) {
    if (c.isPrimarySource) c.score += 1;
  }

  // Boost based on diversity target
  const diversityTarget = constraints?.diversityTarget ?? "medium";
  if (diversityTarget === "high") {
    // Extra boost for counter-frames
    for (const c of candidates) {
      if (c.frameLabel === "Counter-frame") c.score += 1;
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Greedy selection: pick 3 with maximum frame + domain diversity
  const selected: typeof candidates = [];
  const usedFrames = new Set<string>();
  const usedDomains = new Set<string>();

  // First pass: one per frame label
  for (const c of candidates) {
    if (selected.length >= 3) break;
    if (!usedFrames.has(c.frameLabel)) {
      selected.push(c);
      usedFrames.add(c.frameLabel);
      usedDomains.add(c.domain);
    }
  }

  // Second pass: fill remaining with highest-score unused, preferring new domains
  for (const c of candidates) {
    if (selected.length >= 3) break;
    if (selected.includes(c)) continue;
    if (!usedDomains.has(c.domain)) {
      selected.push(c);
      usedDomains.add(c.domain);
    }
  }

  // Third pass: just fill if still under 3
  for (const c of candidates) {
    if (selected.length >= 3) break;
    if (!selected.includes(c)) {
      selected.push(c);
    }
  }

  const choiceSet: ChoiceSetItem[] = selected.map((c, i) => ({
    id: `next_${i + 1}`,
    title: c.title,
    url: c.url,
    domain: c.domain,
    frameLabel: c.frameLabel,
    reason: c.reason,
    opensMissingFrame: c.frameLabel === "Counter-frame" || c.frameLabel === "Measurement / definitions",
    isPrimarySource: c.isPrimarySource,
  }));

  // Fallback: if < 3, fill with Google Search links
  if (choiceSet.length < 3) {
    const fallbackQueries = [
      "primary sources and methodology",
      "strongest counter-frame critique",
      "corroborate claim with primary sources",
    ];
    for (const q of fallbackQueries) {
      if (choiceSet.length >= 3) break;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      if (choiceSet.some((c) => c.url === searchUrl)) continue;
      choiceSet.push({
        id: `next_fallback_${choiceSet.length + 1}`,
        title: `Search: ${clamp(q, 72)}`,
        url: searchUrl,
        domain: "google.com",
        frameLabel: "Search / grounding",
        reason: "Fallback when grounded sources are unavailable in this environment.",
        opensMissingFrame: true,
        isPrimarySource: false,
      });
    }
  }

  return choiceSet.slice(0, 3);
}
