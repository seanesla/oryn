import type {
  ChoiceSetItem,
  DisagreementCluster,
  EvidenceCard,
  SessionConstraints,
  Trace,
} from "@/lib/contracts";

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function makeInitialArtifacts(input: {
  sessionId: string;
  url?: string;
  title?: string;
  constraints: SessionConstraints;
}) {
  const domain = input.url ? domainFromUrl(input.url) : undefined;

  const trace: Trace = {
    toolCalls: [],
    cardInputs: {},
  };

  const evidenceCards: Array<EvidenceCard> = [
    {
      id: "card_1",
      claimText: "The policy change reduced total costs for the average household.",
      disagreementType: "Causal",
      confidence: "Medium",
      evidence: [
        {
          quote:
            "We observed a statistically significant decline in out-of-pocket spending in the 12 months following implementation, concentrated in the lowest income quintile.",
          url: "https://example.edu/paper/policy-costs-2024",
          title: "Working paper: Policy costs (2024)",
          domain: "example.edu",
        },
      ],
      counterEvidence: [
        {
          quote:
            "Average costs fell, but premiums increased for a subset of households and the distributional effects depend on baseline plan choice.",
          url: "https://example.org/analysis/distributional-effects",
          title: "Distributional effects note",
          domain: "example.org",
        },
      ],
      pinned: true,
      traceRef: { toolCallIds: [] },
    },
    {
      id: "card_2",
      claimText: "The article’s headline matches what the underlying report actually measured.",
      disagreementType: "Definition",
      confidence: "High",
      evidence: [
        {
          quote:
            "The metric is defined as year-over-year change in seasonally adjusted employment, not net job creation.",
          url: "https://example.gov/reports/metrics-definition",
          title: "Methodology appendix",
          domain: "example.gov",
        },
      ],
      counterEvidence: [
        {
          quote:
            "The report’s own summary uses the term 'job creation' as shorthand, which creates room for interpretive mismatch.",
          url: "https://example.com/news/report-summary-terminology",
          title: "Summary terminology discussion",
          domain: "example.com",
        },
      ],
      traceRef: { toolCallIds: [] },
    },
    {
      id: "card_3",
      claimText: "The key factual dispute is whether the reported number is comparable to prior years.",
      disagreementType: "Factual",
      confidence: "Low",
      evidence: [
        {
          quote:
            "A break in the series occurred after the survey redesign; values before and after are not directly comparable without adjustment.",
          url: "https://example.gov/data/series-breaks",
          title: "Data notes",
          domain: "example.gov",
        },
      ],
      counterEvidence: [
        {
          quote:
            "When adjusted using the agency’s recommended bridge factors, the trend direction remains consistent.",
          url: "https://example.edu/blog/bridge-factors",
          title: "Bridge-factor explainer",
          domain: "example.edu",
        },
      ],
      traceRef: { toolCallIds: [] },
    },
    {
      id: "card_4",
      claimText: "Even if the facts are accepted, the disagreement is about acceptable tradeoffs.",
      disagreementType: "Values",
      confidence: "High",
      evidence: [
        {
          quote:
            "The tradeoff is explicit: the proposal prioritizes coverage expansion over short-term price stability.",
          url: "https://example.gov/hearing/transcript",
          title: "Hearing transcript",
          domain: "example.gov",
        },
      ],
      counterEvidence: [
        {
          quote:
            "Opponents frame the same tradeoff as an avoidable burden, arguing that alternative designs achieve similar coverage at lower volatility.",
          url: "https://example.org/alt-designs",
          title: "Alternative designs brief",
          domain: "example.org",
        },
      ],
      traceRef: { toolCallIds: [] },
    },
  ];

  const clusters: Array<DisagreementCluster> = [
    {
      id: "cluster_1",
      title: "What the metric actually measures",
      claimIds: ["card_2", "card_3"],
      representativeClaims: [
        "Headline uses a different definition than the report.",
        "Series break affects comparability across years.",
      ],
      sources: [
        { domain: "example.gov", count: 2 },
        { domain: "example.edu", count: 1 },
      ],
      whatsMissing: [
        "A direct quote from the report’s executive summary that uses the disputed wording.",
        "A third-party replication of the adjusted series.",
      ],
    },
    {
      id: "cluster_2",
      title: "Causal claim: costs, distribution, and who pays",
      claimIds: ["card_1"],
      representativeClaims: [
        "Average costs decline but distribution matters.",
        "Some households see premium increases.",
      ],
      sources: [
        { domain: "example.edu", count: 1 },
        { domain: "example.org", count: 1 },
      ],
      whatsMissing: [
        "A primary dataset or codebook link for the cost measure.",
      ],
    },
    {
      id: "cluster_3",
      title: "Values dispute: acceptable tradeoffs",
      claimIds: ["card_4"],
      representativeClaims: [
        "Expansion vs stability is the core tradeoff.",
        "Alternative designs are framed as lower-volatility.",
      ],
      sources: [
        { domain: "example.gov", count: 1 },
        { domain: "example.org", count: 1 },
      ],
      whatsMissing: [
        "A quantified model of volatility under each design.",
      ],
    },
  ];

  const choiceSet: Array<ChoiceSetItem> = [
    {
      id: "next_1",
      title: "Methodology appendix (definitions + caveats)",
      url: "https://example.gov/reports/metrics-definition",
      domain: "example.gov",
      frameLabel: "Measurement / definitions",
      reason: "Clarifies what was actually measured and where headlines often drift.",
      opensMissingFrame: true,
      isPrimarySource: true,
    },
    {
      id: "next_2",
      title: "Distributional effects note (who benefits, who pays)",
      url: "https://example.org/analysis/distributional-effects",
      domain: "example.org",
      frameLabel: "Distribution / tradeoffs",
      reason: "Adds the missing 'who wins vs who loses' lens to the causal claim.",
      opensMissingFrame: true,
    },
    {
      id: "next_3",
      title: "Bridge-factor explainer (series break adjustment)",
      url: "https://example.edu/blog/bridge-factors",
      domain: "example.edu",
      frameLabel: "Comparability / adjustment",
      reason: "Tests whether the trend holds after the series break is corrected.",
      opensMissingFrame: false,
    },
  ];

  return {
    domain,
    title: input.title,
    evidenceCards,
    clusters,
    choiceSet,
    trace,
  };
}
