"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate } from "motion/react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// ── Use case data ─────────────────────────────────────────────────────────────

type UseCase = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  inputExample: string;
  outputExample: string;
  guardrails: Array<string>;
  bestFor: Array<string>;
};

const USE_CASES: Array<UseCase> = [
  {
    id: "policy",
    label: "Policy",
    title: "Stress-test policy claims",
    subtitle: "Separate measurement disputes from causal arguments and value tradeoffs.",
    inputExample: "\"This program reduced costs for the average household.\"",
    outputExample: "Evidence cards + counter-evidence, then 3 next reads: definition, distribution, replication.",
    guardrails: ["Evidence cards required", "Counter-frame included", "Trace is inspectable"],
    bestFor: ["briefs", "hearings", "reports", "think tank claims"],
  },
  {
    id: "research",
    label: "Research",
    title: "Compare papers without losing citations",
    subtitle: "Keep a trail from claim -> quote -> source -> retrieval decision.",
    inputExample: "Paste a claim + the DOI/URL for two competing papers.",
    outputExample: "Side-by-side evidence cards, with missing frames called out explicitly.",
    guardrails: ["Prefer primary sources", "Definition drift flagged", "Series breaks highlighted"],
    bestFor: ["lit review", "method disputes", "replication checks"],
  },
  {
    id: "product",
    label: "Product",
    title: "Read technical docs like an auditor",
    subtitle: "Turn marketing assertions into traceable, testable claims.",
    inputExample: "\"This model is privacy-preserving and compliant by design.\"",
    outputExample: "Evidence cards scoped to definitions, threat model, and enforcement mechanisms.",
    guardrails: ["Unsupported factual claims blocked", "Constraints shown", "Only 3 deliberate next reads"],
    bestFor: ["AI vendor eval", "security claims", "platform comparisons"],
  },
  {
    id: "media",
    label: "Media",
    title: "Fact-check without becoming a feed",
    subtitle: "High-signal counter-frames, not endless scrolling.",
    inputExample: "Drop a link to a viral article and the specific sentence you doubt.",
    outputExample: "A dispute map: what's factual vs causal vs values — and what's missing.",
    guardrails: ["Quote required", "Counter-evidence required", "Selection why is visible"],
    bestFor: ["reporting review", "headline drift", "metric definitions"],
  },
];

// ── Section component ─────────────────────────────────────────────────────────

export function UseCasesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitScale = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0.97]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const exitBlur = useTransform(scrollYProgress, [0.76, 1], [0, 14]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  const defaultCase = USE_CASES[0]?.id ?? "policy";

  return (
    <section
      ref={sectionRef}
      data-landing-scene="use"
      className="landing-scene landing-scene-solid min-h-[110vh] py-20 sm:min-h-[120vh] sm:py-24 lg:min-h-[140vh] lg:py-0"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, scale: exitScale, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="section-label"
          >
            Use cases
          </motion.div>

          <div className="mt-7 grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            {/* Left: headline */}
            <div className="min-w-0">
              <motion.h2
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[20ch] font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]"
              >
                Built for reading that matters.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
              >
                Pick a workflow. The UI stays the same: claims become evidence cards, traces stay
                inspectable, and you get a deliberate choice set instead of a feed.
              </motion.p>

              <div className="mt-10 grid gap-3">
                {[
                  { t: "Inputs", d: "URL, claim, or position you're evaluating." },
                  { t: "Outputs", d: "Evidence cards + counter-frames + trace." },
                  { t: "Decision", d: "Three next reads, selected for coverage." },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] px-4 py-3"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">
                      {x.t}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--fg)]">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: tabbed use cases */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0"
            >
              <Tabs defaultValue={defaultCase}>
                <TabsList className="w-full justify-between">
                  {USE_CASES.map((u) => (
                    <TabsTrigger key={u.id} value={u.id} className="flex-1">
                      {u.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {USE_CASES.map((u) => (
                  <TabsContent key={u.id} value={u.id} className="mt-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="p-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
                          {u.title}
                        </div>
                        <div className="mt-2 text-sm font-semibold tracking-[-0.01em]">
                          {u.subtitle}
                        </div>
                        <div
                          aria-hidden
                          className="mt-6 h-px w-12 bg-[color:color-mix(in_oklab,var(--accent)_55%,transparent)] opacity-60"
                        />
                        <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
                          Example input
                        </div>
                        <div className="mt-2 rounded-[0.8rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] p-3 font-mono text-[12px] leading-relaxed text-[color:var(--fg)]">
                          {u.inputExample}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
                          What you get
                        </div>
                        <div className="mt-2 text-sm font-semibold tracking-[-0.01em]">
                          A decision surface, not a summary
                        </div>
                        <div
                          aria-hidden
                          className="mt-6 h-px w-12 bg-[color:color-mix(in_oklab,var(--accent-2)_52%,transparent)] opacity-60"
                        />
                        <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
                          Example output
                        </div>
                        <div className="mt-2 rounded-[0.8rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] p-3 text-[13px] leading-relaxed text-[color:var(--muted-fg)]">
                          {u.outputExample}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
                          Guardrails
                        </div>
                        <div className="mt-3 grid gap-2">
                          {u.guardrails.map((g) => (
                            <div
                              key={g}
                              className="flex items-center gap-2 text-sm text-[color:var(--fg)]"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] opacity-75" />
                              <span className="text-[13px] text-[color:var(--muted-fg)]">{g}</span>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
                          Best for
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {u.bestFor.map((t) => (
                            <Badge key={t} tone="neutral">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
