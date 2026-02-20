"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate } from "motion/react";
import { AudioLines, FileSearch, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

// ── Feature data ──────────────────────────────────────────────────────────────

interface FeatureCard {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  accentVar: "--accent" | "--accent-2";
}

const FEATURES: FeatureCard[] = [
  {
    icon: <AudioLines className="h-5 w-5" />,
    label: "Live session",
    title: "Voice-native, with instant interruption",
    body: "Talk naturally while Oryn listens, analyzes, and structures your conversation into a live transcript — updating evidence cards in real time as you speak.",
    accentVar: "--accent",
  },
  {
    icon: <FileSearch className="h-5 w-5" />,
    label: "Transparency layer",
    title: "Every claim shows its retrieval path",
    body: "Every factual assertion is linked to query steps, source selection criteria, and ranking decisions. Nothing is hidden from the audit trail.",
    accentVar: "--accent-2",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    label: "Epistemic contract",
    title: "Unsupported claims are blocked by design",
    body: "The system cannot surface a factual claim until it can attach an evidence card and a citation path. Enforced at the architecture level, not by policy.",
    accentVar: "--accent",
  },
];

// ── Section component ─────────────────────────────────────────────────────────

export function FeaturesGridSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const exitBlur = useTransform(scrollYProgress, [0.75, 1], [0, 12]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  return (
    <section
      ref={sectionRef}
      data-landing-scene="features"
      className="landing-scene landing-scene-solid min-h-[110vh] sm:min-h-[120vh] lg:min-h-[140vh]"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="w-full">
          {/* Header */}
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="section-label"
            >
              Why teams use it
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 max-w-[22ch] font-serif text-[clamp(2.35rem,6.2vw,4.6rem)] leading-[1.01] tracking-[-0.04em]"
            >
              Proof over persuasion.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
            >
              Oryn is built for high-stakes reading: it turns disagreement into explicit dispute
              types, forces evidence cards, and keeps the retrieval trace visible.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 flex flex-wrap items-center gap-2"
            >
              <Badge tone="good">Evidence required</Badge>
              <Badge tone="accent">Trace visible</Badge>
              <Badge tone="warn">Counter-frame included</Badge>
              <Badge tone="neutral">No feeds</Badge>
            </motion.div>
          </div>

          {/* Feature cards grid */}
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 + idx * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Card className="h-full p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.7rem] border bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))]"
                      style={{
                        borderColor: `color-mix(in oklab, var(${feature.accentVar}) 28%, var(--border))`,
                        color: `var(${feature.accentVar})`,
                      }}
                    >
                      {feature.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
                        {feature.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold tracking-[-0.01em]">
                        {feature.title}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-[color:var(--muted-fg)]">
                    {feature.body}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
