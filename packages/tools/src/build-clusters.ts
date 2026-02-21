import type { DisagreementCluster, DisagreementType, EvidenceCard } from "@oryn/shared";

const CLUSTER_TITLES: Record<DisagreementType, string> = {
  Definition: "What terms and metrics mean",
  Causal: "Causal mechanism and confounders",
  Values: "Tradeoffs and priorities",
  Prediction: "Forecasts and uncertainty",
  Factual: "What is factually true",
};

/**
 * Groups evidence cards into clusters by disagreement type.
 */
export function buildClusters(cards: EvidenceCard[]): DisagreementCluster[] {
  const byType = new Map<DisagreementType, EvidenceCard[]>();
  for (const c of cards) {
    const arr = byType.get(c.disagreementType) ?? [];
    arr.push(c);
    byType.set(c.disagreementType, arr);
  }

  const clusters: DisagreementCluster[] = [];
  let idx = 1;
  for (const [t, arr] of byType.entries()) {
    const allDomains = arr
      .flatMap((c) => [...c.evidence, ...c.counterEvidence])
      .map((q) => q.domain)
      .filter(Boolean) as string[];
    const counts = new Map<string, number>();
    for (const d of allDomains) counts.set(d, (counts.get(d) ?? 0) + 1);

    clusters.push({
      id: `cluster_${idx++}`,
      title: CLUSTER_TITLES[t] ?? "Other",
      claimIds: arr.map((c) => c.id),
      representativeClaims: arr.slice(0, 2).map((c) => c.claimText),
      sources: Array.from(counts.entries()).map(([domain, count]) => ({ domain, count })),
      whatsMissing: [
        "A primary-source definition or dataset link.",
        "An independent replication or third-party critique.",
      ],
    });
  }
  return clusters;
}
