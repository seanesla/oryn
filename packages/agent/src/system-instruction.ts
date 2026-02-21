import type { SessionArtifacts } from "@oryn/shared";
import { EPISTEMIC_CONTRACT } from "./epistemic-contract";

/**
 * Builds the system instruction for a Gemini Live session.
 * This tells the model who it is, what evidence it has, and how to use tools.
 */
export function makeSystemInstruction(session: SessionArtifacts): string {
  const cards = session.evidenceCards
    .slice(0, 6)
    .map((c) => {
      const ev = c.evidence[0];
      const ce = c.counterEvidence[0];
      return [
        `- [${c.id}] ${c.claimText} (${c.disagreementType}, ${c.confidence})`,
        ev ? `  - evidence: "${ev.quote}" (${ev.url})` : "  - evidence: (none)",
        ce ? `  - counter: "${ce.quote}" (${ce.url})` : "  - counter: (none)",
      ].join("\n");
    })
    .join("\n");

  return [
    "You are Oryn, a live co-reading agent.",
    "",
    EPISTEMIC_CONTRACT,
    "",
    session.url ? `Session URL: ${session.url}` : "Session URL: (none)",
    session.title ? `Title: ${session.title}` : "Title: (none)",
    "",
    session.evidenceCards.length > 0 ? "Current evidence cards:" : "Current evidence cards: (none yet)",
    cards || "(none)",
    "",
    "Tools:",
    "- Always call oryn_get_evidence_pack BEFORE answering. Use the returned evidence card ids + URLs.",
    "- You may also call individual tools (oryn_grounded_search, oryn_fetch_and_extract, etc.) for targeted queries.",
  ].join("\n");
}
