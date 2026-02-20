"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate } from "motion/react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

// ── Step data ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    label: "Start",
    text: "Drop in a URL, paste a claim, or describe a position you're trying to evaluate.",
  },
  {
    num: "02",
    label: "Review",
    text: "Oryn surfaces evidence cards with counter-frames — grounded claims, not summaries.",
  },
  {
    num: "03",
    label: "Decide",
    text: "Choose from three deliberate next reads, selected for coverage not engagement loops.",
  },
];

// ── Section component ─────────────────────────────────────────────────────────

export function HowItWorksSection() {
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

  return (
    <section
      ref={sectionRef}
      data-landing-scene="how"
      className="landing-scene landing-scene-solid min-h-[110vh] py-20 sm:min-h-[120vh] sm:py-24 lg:min-h-[140vh] lg:py-0"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, scale: exitScale, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="w-full">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            {/* Left: headline + description */}
            <div className="min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="section-label"
              >
                How a session works
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 max-w-[22ch] font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]"
              >
                Three moves.
                <br />
                One decision.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
              >
                Start with a claim or URL, review evidence cards with counter-frames, then pick
                from three next reads selected for coverage.
              </motion.p>
            </div>

            {/* Right: step cards */}
            <div className="grid gap-4">
              {STEPS.map((step, idx) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.7,
                    delay: 0.08 + idx * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-serif text-[2.4rem] leading-none tracking-[-0.06em] text-[color:color-mix(in_oklab,var(--accent)_26%,transparent)]">
                          {step.num}
                        </div>
                        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">
                          {step.label}
                        </div>
                      </div>
                      <Badge tone="neutral">guardrail {step.num}</Badge>
                    </div>
                    <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-[color:var(--muted-fg)]">
                      {step.text}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
