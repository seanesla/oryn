"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { animate, stagger, onScroll } from "animejs";

import {
  ArrowRight,
  AudioLines,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/Button";

// ── Pre-computed decorations (deterministic — avoids hydration mismatch) ──────

const WAVEFORM_HEIGHTS = [32, 68, 44, 92, 56, 80, 36, 64, 50, 84, 40, 74, 28, 62, 48];

const TRACE_STEPS = [
  "query  →  semantic search",
  "rank   →  source trust score",
  "filter →  date + domain check",
  "select →  top 3 sources",
];

const CONTRACT_ITEMS = ["Factual claim required", "Evidence card attached", "Citation path shown"];

// ── Feature data ──────────────────────────────────────────────────────────────

interface FeatureItem {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  bullets: string[];
  reverse: boolean;
  cardVariant: 0 | 1 | 2;
}

const FEATURES: FeatureItem[] = [
  {
    icon: <AudioLines className="h-6 w-6" />,
    label: "Live session",
    title: "Voice-native, with\ninstant interruption",
    body: "Talk naturally while Oryn listens, analyzes, and structures your conversation into a live transcript — updating evidence cards in real time as you speak.",
    bullets: ["Interrupt at any moment", "Live transcript generation", "Evidence updates on the fly"],
    reverse: false,
    cardVariant: 0,
  },
  {
    icon: <FileSearch className="h-6 w-6" />,
    label: "Transparency layer",
    title: "Every claim shows\nits retrieval path",
    body: "Every factual assertion is linked to query steps, source selection criteria, and ranking decisions. Nothing is hidden from the audit trail.",
    bullets: ["Query step visibility", "Source selection trace", "Ranking decision audit"],
    reverse: true,
    cardVariant: 1,
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    label: "Epistemic contract",
    title: "Unsupported claims\nare blocked by design",
    body: "The system cannot surface a factual claim until it can attach an evidence card and a citation path. This is enforced at the architecture level, not by policy.",
    bullets: [
      "Architecture-level enforcement",
      "Required citation path",
      "Counter-frame always included",
    ],
    reverse: false,
    cardVariant: 2,
  },
];

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="relative z-10 w-full">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ClosingSection />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative flex min-h-screen flex-col justify-center">
      <div className="mx-auto w-full max-w-7xl px-8 sm:px-12 lg:px-20">

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
          className="max-w-[16ch] font-serif text-[clamp(3.2rem,8.5vw,6rem)] leading-[0.97] tracking-[-0.04em]"
        >
          Understand disagreement,{" "}
          <em className="not-italic text-[color:var(--accent)]">without losing</em>
          {" "}the evidence.
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

        {/* Inline trust indicators — no pills, no borders */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.52 }}
          className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-2"
        >
          {["Evidence cards required", "Counter-frame included", "Trace always visible"].map(
            (item) => (
              <div key={item} className="flex items-center gap-2 text-[12px] text-[color:var(--muted-fg)]">
                <span className="h-1 w-1 rounded-full bg-[color:var(--accent)] opacity-70" />
                {item}
              </div>
            )
          )}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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

// ── Features ──────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section className="pb-10 pt-4">
      <div className="mx-auto w-full max-w-7xl px-8 sm:px-12 lg:px-20">
        <div className="section-label mb-16">Why teams use it</div>
        {FEATURES.map((feature, i) => (
          <FeatureStrip key={i} {...feature} index={i} />
        ))}
      </div>
    </section>
  );
}

function FeatureStrip({
  icon,
  label,
  title,
  body,
  bullets,
  reverse,
  cardVariant,
  index,
}: FeatureItem & { index: number }) {
  const textRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textEl = textRef.current;
    const cardEl = cardRef.current;
    if (!textEl || !cardEl) return;

    const xFrom = reverse ? 50 : -50;
    const xCard = reverse ? -50 : 50;

    const a1 = animate(textEl, {
      opacity: [0, 1],
      translateX: [xFrom, 0],
      ease: "outQuint",
      duration: 950,
      autoplay: onScroll({ target: textEl, enter: "top 92%" }),
    });

    const a2 = animate(cardEl, {
      opacity: [0, 1],
      translateX: [xCard, 0],
      ease: "outQuint",
      duration: 950,
      delay: 110,
      autoplay: onScroll({ target: cardEl, enter: "top 92%" }),
    });

    return () => {
      a1.revert();
      a2.revert();
    };
  }, [reverse]);

  const isLast = index === FEATURES.length - 1;

  return (
    <div
      className={[
        "flex flex-col gap-12 py-20",
        "md:flex-row md:items-center md:gap-20",
        reverse ? "md:flex-row-reverse" : "",
        !isLast ? "border-b border-[color:color-mix(in_oklab,var(--border)_36%,transparent)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Text side */}
      <div ref={textRef} className="flex-1" style={{ opacity: 0 }}>
        <div className="section-label mb-5">{label}</div>
        <h2 className="max-w-[16ch] whitespace-pre-line font-serif text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.06] tracking-[-0.03em]">
          {title}
        </h2>
        <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
          {body}
        </p>
        <ul className="mt-8 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[13px] text-[color:var(--muted-fg)]">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--accent)]" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Shine glass card side */}
      <div
        ref={cardRef}
        className="flex flex-1 items-center justify-center"
        style={{ opacity: 0 }}
      >
        <div className="shine-card w-full max-w-sm rounded-[1.25rem] p-8">
          {/* Icon */}
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[0.65rem] border border-[color:color-mix(in_oklab,var(--accent)_22%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--surface-2))] text-[color:var(--accent)]">
            {icon}
          </div>

          {/* Label + title */}
          <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
            {label}
          </div>
          <div className="mt-1.5 whitespace-pre-line font-serif text-[1.1rem] leading-snug tracking-[-0.02em]">
            {title}
          </div>

          {/* Decoration */}
          <FeatureCardDecoration variant={cardVariant} />
        </div>
      </div>
    </div>
  );
}

function FeatureCardDecoration({ variant }: { variant: 0 | 1 | 2 }) {
  if (variant === 0) {
    return (
      <div className="mt-7 flex h-10 items-end gap-0.5">
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${h}%`,
              background: `color-mix(in oklab, var(--accent) ${50 + (i % 3) * 15}%, var(--accent-2))`,
              opacity: 0.45,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 1) {
    return (
      <div className="mt-7 space-y-2.5">
        {TRACE_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: `color-mix(in oklab, var(--accent) ${60 + i * 8}%, var(--accent-2))`,
                opacity: 0.65,
              }}
            />
            <span className="font-mono text-[10px] text-[color:var(--muted-fg)] opacity-65">
              {step}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-7 space-y-3">
      {CONTRACT_ITEMS.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)] opacity-60" />
          <span className="text-[12px] text-[color:var(--muted-fg)] opacity-70">{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;

    const items = el.querySelectorAll(".step-item");
    const anim = animate(items, {
      opacity: [0, 1],
      translateY: [28, 0],
      ease: "outQuint",
      duration: 850,
      delay: stagger(160),
      autoplay: onScroll({ target: el, enter: "top 88%" }),
    });

    return () => { anim.revert(); };
  }, []);

  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-7xl px-8 sm:px-12 lg:px-20">
        <div className="section-label mb-16">How a session works</div>
        <div ref={stepsRef} className="grid gap-14 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.num} className="step-item" style={{ opacity: 0 }}>
              <div className="font-serif text-[5.5rem] leading-none tracking-[-0.05em] text-[color:color-mix(in_oklab,var(--accent)_22%,transparent)]">
                {step.num}
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">
                {step.label}
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--muted-fg)]">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Closing CTA ───────────────────────────────────────────────────────────────

function ClosingSection() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const anim = animate(el, {
      opacity: [0, 1],
      translateY: [24, 0],
      ease: "outQuint",
      duration: 900,
      autoplay: onScroll({ target: el, enter: "top 90%" }),
    });

    return () => { anim.revert(); };
  }, []);

  return (
    <section className="py-36">
      <div
        ref={ref}
        className="mx-auto w-full max-w-7xl px-8 text-center sm:px-12 lg:px-20"
        style={{ opacity: 0 }}
      >
        <div className="mb-8 flex justify-center">
          <div className="section-label">High-trust decision support</div>
        </div>
        <h2 className="font-serif text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] tracking-[-0.035em]">
          Built for reading that matters.
        </h2>
        <p className="mx-auto mt-6 max-w-[42ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
          The workspace is one click away. Every session is traceable, every claim is sourced.
        </p>
        <div className="mt-10">
          <Button size="lg" onClick={() => router.push("/app")}>
            Open workspace <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
