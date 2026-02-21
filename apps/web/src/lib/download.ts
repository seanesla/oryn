import type { SessionArtifacts } from "@/lib/contracts";

/**
 * Trigger a browser download of the given content as a file.
 */
export function download(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Convert a session snapshot into a Markdown document.
 * This is the single canonical formatter used by both the nav export
 * dropdown and the runtime `exportSnapshot` helper.
 */
export function snapshotToMarkdown(s: SessionArtifacts): string {
  return [
    `# oryn session ${s.sessionId}`,
    "",
    `- Mode: ${s.mode}`,
    s.url ? `- URL: ${s.url}` : "- URL: (none)",
    s.domain ? `- Domain: ${s.domain}` : "",
    s.title ? `- Title: ${s.title}` : "",
    `- Evidence cards: ${s.evidenceCards.length}`,
    `- Citations used: ${s.epistemic.citationsUsed}`,
    "",
    "## Choice Set (Next 3 Reads)",
    ...s.choiceSet.slice(0, 3).map((i) => `- [${i.title}](${i.url}) — ${i.reason}`),
    "",
    "## Evidence Cards",
    ...s.evidenceCards.flatMap((c) => [
      `### ${c.claimText}`,
      "",
      `- Dispute: ${c.disagreementType}`,
      `- Confidence: ${c.confidence}`,
      "",
      "Evidence:",
      ...c.evidence.map((e) => `- \\"${e.quote}\\" (${e.url})`),
      "",
      "Counter-evidence:",
      ...c.counterEvidence.map((e) => `- \\"${e.quote}\\" (${e.url})`),
      "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}
