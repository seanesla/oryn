"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, useMotionTemplate } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function HeroSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const contentOpacity = useTransform(scrollYProgress, [0.25, 0.85], [1, 0]);
  const blurPx = useTransform(scrollYProgress, [0, 0.55], [0, 20]);
  const heroFilter = useMotionTemplate`blur(${blurPx}px)`;
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section
      ref={sectionRef}
      data-landing-scene="hero"
      className="landing-scene relative flex min-h-screen flex-col justify-center"
    >
      <div aria-hidden className="landing-hero-scrim" />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10"
        style={{ y: contentY, opacity: contentOpacity, filter: heroFilter }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="section-label mb-8"
        >
          Evidence-first AI co-reading
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.05, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[18ch] font-serif text-[clamp(2.85rem,7.6vw,5.7rem)] leading-[0.98] tracking-[-0.04em]"
        >
          {"Understand disagreement, "}
          <em className="not-italic text-[color:var(--accent)]">without losing</em>
          {" the evidence."}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.75, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-[44ch] text-[16px] leading-relaxed text-[color:var(--muted-fg)]"
        >
          Oryn separates factual, causal, and value disputes — building evidence cards
          with counter-frames and recommending only three deliberate next reads.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Button size="lg" onClick={() => router.push("/app")}>
            Open workspace <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push("/history")}>
            View history
          </Button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.52 }}
          className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-2"
        >
          {["Evidence cards required", "Counter-frame included", "Trace always visible"].map(
            (item) => (
              <div key={item} className="flex items-center gap-2 text-[12px] text-[color:var(--muted-fg)]">
                <span className="h-1 w-1 rounded-full bg-[color:var(--accent)] opacity-70" />
                {item}
              </div>
            ),
          )}
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ opacity: cueOpacity }}
        transition={{ duration: 1.2, delay: 1.1 }}
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-fg)]">
          Scroll
        </span>
        <ChevronDown className="h-4 w-4 animate-bounce text-[color:var(--muted-fg)]" />
      </motion.div>
    </section>
  );
}
