"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, useMotionTemplate } from "motion/react";
import { animate, onScroll } from "animejs";

import {
  ArrowRight,
  AudioLines,
  ChevronDown,
  FileSearch,
  ShieldCheck,
} from "lucide-react";

import { LandingDemoDock } from "@/components/landing/LandingDemoDock";
import {
  CutAccordionCascade,
  CutCTAStamp,
  CutGateLock,
  CutIrisPortal,
  CutTraceScan,
  CutTabsGlitch,
  CutWaveSweep,
} from "@/components/landing/SceneCuts";
import { useLandingDemoSession } from "@/components/landing/useLandingDemoSession";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

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

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "How do you prevent hallucinated facts?",
    a: "Factual claims require an evidence card with quotes + source URLs. Without evidence, the system must answer 'unknown' and ask for narrowing.",
  },
  {
    q: "What counts as evidence?",
    a: "At minimum: a quote (or concrete excerpt) plus a URL. Counter-evidence is attached alongside to keep the disagreement honest.",
  },
  {
    q: "Can I inspect the retrieval trace?",
    a: "Yes. Tool calls, constraints applied, selected domains, and why the system chose them are shown in the UI.",
  },
  {
    q: "Why only three next reads?",
    a: "Because a feed optimizes for engagement. Three options forces a deliberate choice set and reduces the 'infinite scroll' failure mode.",
  },
  {
    q: "Is this just summaries?",
    a: "No. The goal is decision support: evidence cards, counter-frames, and explicit dispute types — not vibe-based condensation.",
  },
  {
    q: "Does it help with value disputes too?",
    a: "Yes. Values disputes still benefit from clean fact surfaces and explicit tradeoffs. The UI keeps these layers separate.",
  },
  {
    q: "Can I use it without a URL?",
    a: "Yes. You can paste a claim directly. The system treats it as a claim-check and builds evidence cards from that target.",
  },
  {
    q: "Will it show me what's missing?",
    a: "Yes. Missing frames and missing sources are first-class output, not an afterthought.",
  },
];

type LandingDemo = ReturnType<typeof useLandingDemoSession>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("landing-smooth");
    return () => {
      html.classList.remove("landing-smooth");
    };
  }, []);

  const demo = useLandingDemoSession();

  return (
    <div className="relative z-10 w-full">
      <HeroSection />
      <FeaturesSection demo={demo} />
      <HowItWorksSection demo={demo} />
      <UseCasesSection />
      <FAQSection />
      <ClosingSection />
    </div>
  );
}

function FrameCorners({ inset = 18, size = 18, opacity = 0.55 }: { inset?: number; size?: number; opacity?: number }) {
  const common: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    borderColor: "color-mix(in oklab, var(--accent) 32%, var(--border))",
    borderStyle: "solid",
    opacity,
    pointerEvents: "none",
  };

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ ...common, left: inset, top: inset, borderLeftWidth: 1, borderTopWidth: 1 }} />
      <div style={{ ...common, right: inset, top: inset, borderRightWidth: 1, borderTopWidth: 1 }} />
      <div style={{ ...common, left: inset, bottom: inset, borderLeftWidth: 1, borderBottomWidth: 1 }} />
      <div style={{ ...common, right: inset, bottom: inset, borderRightWidth: 1, borderBottomWidth: 1 }} />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);

  // Track how far the hero has been scrolled away (0 = fully visible, 1 = fully gone)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Content drifts upward and fades as you leave the hero
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const contentOpacity = useTransform(scrollYProgress, [0.25, 0.85], [1, 0]);
  // Hero content blurs out as you scroll away — camera rack-focus effect
  const blurPx = useTransform(scrollYProgress, [0, 0.55], [0, 20]);
  const heroFilter = useMotionTemplate`blur(${blurPx}px)`;
  // Scroll cue vanishes almost immediately
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section ref={sectionRef} className="landing-scene relative flex min-h-screen flex-col justify-center">
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

        {/* Inline trust indicators — no pills, no borders */}
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
            )
          )}
        </motion.div>
      </motion.div>

      {/* Scroll cue — fades out as soon as you start scrolling */}
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

// ── Features ──────────────────────────────────────────────────────────────────

function FeaturesSection({ demo }: { demo: LandingDemo }) {
  return (
    <>
      <FeaturesIntroScene />
      {FEATURES.map((feature) => (
        <FeatureStrip key={feature.label} demo={demo} {...feature} />
      ))}
    </>
  );
}

function FeaturesIntroScene() {
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end start"],
  });

  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const exitBlur = useTransform(scrollYProgress, [0.75, 1], [0, 12]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  const cutProgress = useTransform(scrollYProgress, [0.6, 1], [0, 1]);

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;

    const anim = animate(label, {
      opacity: [0, 1],
      translateX: [-24, 0],
      ease: "outQuint",
      duration: 800,
      autoplay: onScroll({ target: label, enter: "bottom-=100 top", repeat: false }),
    });

    return () => {
      anim.revert();
    };
  }, []);

  return (
    <section
      ref={sceneRef}
      className="landing-scene landing-scene-solid landing-scene-intro min-h-[110vh] sm:min-h-[120vh] lg:min-h-[150vh]"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="w-full">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className="min-w-0">
              <div ref={labelRef} className="section-label" style={{ opacity: 0 }}>
                Why teams use it
              </div>
              <h2 className="mt-7 max-w-[22ch] font-serif text-[clamp(2.35rem,6.2vw,4.6rem)] leading-[1.01] tracking-[-0.04em]">
                Proof over persuasion.
              </h2>
              <p className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
                Oryn is built for high-stakes reading: it turns disagreement into explicit dispute types, forces evidence cards,
                and keeps the retrieval trace visible.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-2">
                <Badge tone="good">Evidence required</Badge>
                <Badge tone="accent">Trace visible</Badge>
                <Badge tone="warn">Counter-frame included</Badge>
                <Badge tone="neutral">No feeds</Badge>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {[
                  { k: "01", t: "Dispute typing", d: "Separate factual checks from value tradeoffs." },
                  { k: "02", t: "Evidence cards", d: "Quotes + links, plus counter-evidence." },
                  { k: "03", t: "Deliberate next reads", d: "Three options, selected for coverage." },
                ].map((x) => (
                  <Card key={x.k} className="p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
                      {x.k}
                    </div>
                    <div className="mt-2 text-sm font-semibold tracking-[-0.01em]">{x.t}</div>
                    <div className="mt-1 text-xs leading-relaxed text-[color:var(--muted-fg)]">{x.d}</div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[0.7rem] border border-[color:color-mix(in_oklab,var(--accent)_28%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))] text-[color:var(--accent)]">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
                      Transparency
                    </div>
                    <div className="mt-1 text-sm font-semibold tracking-[-0.01em]">See the path, not the vibes</div>
                    <div className="mt-1 text-xs leading-relaxed text-[color:var(--muted-fg)]">
                      Tool calls, constraints, and source selection are part of the UI.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[0.7rem] border border-[color:color-mix(in_oklab,var(--accent-2)_28%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent-2)_10%,var(--surface-2))] text-[color:var(--accent-2)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
                      Contract
                    </div>
                    <div className="mt-1 text-sm font-semibold tracking-[-0.01em]">Unsupported claims get blocked</div>
                    <div className="mt-1 text-xs leading-relaxed text-[color:var(--muted-fg)]">
                      No evidence card means the agent must answer unknown, then ask for narrowing.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:col-span-2 lg:col-span-1">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[0.7rem] border border-[color:color-mix(in_oklab,var(--accent)_28%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))] text-[color:var(--accent)]">
                    <AudioLines className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
                      Live session
                    </div>
                    <div className="mt-1 text-sm font-semibold tracking-[-0.01em]">Voice-native, with barge-in</div>
                    <div className="mt-1 text-xs leading-relaxed text-[color:var(--muted-fg)]">
                      Talk naturally. Interrupt any time. Evidence updates as you go.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <CutIrisPortal progress={cutProgress} />
      </motion.div>
    </section>
  );
}

function FeatureStrip({
  demo,
  icon,
  label,
  title,
  body,
  bullets,
  reverse,
  cardVariant,
}: FeatureItem & { demo: LandingDemo }) {
  const rowRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll-driven scene progress: 0 at entry, 1 when the scene is fully passed.
  const { scrollYProgress } = useScroll({
    target: rowRef,
    offset: ["start start", "end start"],
  });

  // Depth drift while you scroll through the scene.
  const textY = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const cardY = useTransform(scrollYProgress, [0, 1], [56, -56]);

  // Exit motion so it feels like you travel to the next scene (no snapping).
  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitScale = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0.965]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const exitBlur = useTransform(scrollYProgress, [0.76, 1], [0, 14]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  const cutProgress = useTransform(scrollYProgress, [0.7, 1], [0, 1]);

  const bgClass =
    cardVariant === 0
      ? "landing-scene-feature-live"
      : cardVariant === 1
        ? "landing-scene-feature-trace"
        : "landing-scene-feature-contract";

  const dockTabs =
    cardVariant === 0
      ? (["transcript", "evidence", "next"] as const)
      : cardVariant === 1
        ? (["trace", "evidence", "transcript"] as const)
        : (["contract", "evidence", "trace"] as const);
  const dockDefault = dockTabs[0];
  const dockTitle = title.replace(/\n/g, " ");

  useEffect(() => {
    const textEl = textRef.current;
    const cardEl = cardRef.current;
    if (!textEl || !cardEl) return;

    // Text side: curtain wipes in from the outside edge toward center
    const textClipFrom = reverse
      ? "inset(0% 0% 0% 100%)"
      : "inset(0% 100% 0% 0%)";
    const cardClipFrom = reverse
      ? "inset(0% 100% 0% 0%)"
      : "inset(0% 0% 0% 100%)";

    const a1 = animate(textEl, {
      clipPath: [textClipFrom, "inset(0% 0% 0% 0%)"],
      ease: "outQuint",
      duration: 950,
      autoplay: onScroll({ target: textEl, enter: "bottom-=120 top", repeat: false }),
    });

    const a2 = animate(cardEl, {
      clipPath: [cardClipFrom, "inset(0% 0% 0% 0%)"],
      ease: "outQuint",
      duration: 950,
      delay: 110,
      autoplay: onScroll({ target: cardEl, enter: "bottom-=120 top", repeat: false }),
    });

    return () => {
      a1.revert();
      a2.revert();
    };
  }, [reverse]);

  return (
    <section
      ref={rowRef}
      className={[
        "landing-scene landing-scene-solid",
        bgClass,
        "min-h-[120vh] py-20 sm:py-24",
        "lg:min-h-[170vh] lg:py-0",
      ].join(" ")}
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, scale: exitScale, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div
          className={[
            "flex w-full flex-col gap-10",
            "md:flex-row md:items-center md:gap-16",
            reverse ? "md:flex-row-reverse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Text side — glass card, drifts gently with scroll */}
          <motion.div style={{ y: textY }} className="flex-1">
            <div
              ref={textRef}
              className="landing-text-rail relative max-w-2xl pr-2"
              style={{
                clipPath: reverse
                  ? "inset(0% 0% 0% 100%)"
                  : "inset(0% 100% 0% 0%)",
              }}
            >
              <div className="section-label mb-6">{label}</div>
              <h2 className="max-w-[17ch] whitespace-pre-line font-serif text-[clamp(2.1rem,4.8vw,3.35rem)] leading-[1.04] tracking-[-0.035em]">
                {title}
              </h2>
              <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
                {body}
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {bullets.map((b, bi) => (
                  <div key={b} className="relative">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)] opacity-70">
                      Signal {String(bi + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-2 text-[13px] leading-relaxed text-[color:var(--muted-fg)]">
                      {b}
                    </div>
                    <div className="mt-5 h-px w-10 bg-[color:color-mix(in_oklab,var(--accent)_58%,transparent)] opacity-65" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Shine glass card side — drifts faster, deeper in space */}
          <div
            ref={cardRef}
            className="flex flex-1 items-center justify-center"
            style={{
              clipPath: reverse
                ? "inset(0% 100% 0% 0%)"
                : "inset(0% 0% 0% 100%)",
            }}
          >
            <motion.div style={{ y: cardY }} className="w-full max-w-[560px]">
              <LandingDemoDock
                session={demo.session}
                actions={demo.actions}
                icon={icon}
                label={label}
                title={dockTitle}
                subtitle={body}
                tabs={[...dockTabs]}
                defaultTab={dockDefault}
              />
            </motion.div>
          </div>
        </div>

        {cardVariant === 0 ? <CutWaveSweep progress={cutProgress} /> : null}
        {cardVariant === 1 ? <CutTraceScan progress={cutProgress} /> : null}
        {cardVariant === 2 ? <CutGateLock progress={cutProgress} /> : null}
      </motion.div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorksSection({ demo }: { demo: LandingDemo }) {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitScale = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0.97]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const exitBlur = useTransform(scrollYProgress, [0.76, 1], [0, 14]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  const cutProgress = useTransform(scrollYProgress, [0.72, 1], [0, 1]);

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;

    const a1 = animate(label, {
      opacity: [0, 1],
      translateX: [-24, 0],
      ease: "outQuint",
      duration: 800,
      autoplay: onScroll({ target: label, enter: "bottom-=100 top", repeat: false }),
    });

    return () => {
      a1.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-scene landing-scene-solid landing-scene-how min-h-[125vh] py-20 sm:min-h-[145vh] sm:py-24 lg:min-h-[185vh] lg:py-0"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, scale: exitScale, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="w-full">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="min-w-0">
              <div ref={labelRef} className="section-label" style={{ opacity: 0 }}>
                How a session works
              </div>
              <h2 className="mt-7 max-w-[22ch] font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]">
                Three moves.
                <br />
                One decision.
              </h2>
              <p className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
                Start with a claim or URL, review evidence cards with counter-frames, then pick from three next reads selected for coverage.
              </p>

              <div className="mt-10 grid gap-4">
                {STEPS.map((step) => (
                  <Card key={step.num} className="p-4">
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
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <LandingDemoDock
                session={demo.session}
                actions={demo.actions}
                icon={<ArrowRight className="h-6 w-6" />}
                label="Session flow"
                title="Input -> evidence -> next reads"
                subtitle="A compact preview of the same panels you use in the workspace."
                tabs={["transcript", "evidence", "trace", "next"]}
                defaultTab="transcript"
              />
            </div>
          </div>
        </div>

        <CutTabsGlitch progress={cutProgress} />
      </motion.div>
    </section>
  );
}

// ── Use cases ────────────────────────────────────────────────────────────────

function UseCasesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitScale = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0.97]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const exitBlur = useTransform(scrollYProgress, [0.76, 1], [0, 14]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  const cutProgress = useTransform(scrollYProgress, [0.72, 1], [0, 1]);

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;

    const anim = animate(label, {
      opacity: [0, 1],
      translateX: [-24, 0],
      ease: "outQuint",
      duration: 800,
      autoplay: onScroll({ target: label, enter: "bottom-=100 top", repeat: false }),
    });

    return () => {
      anim.revert();
    };
  }, []);

  const defaultCase = USE_CASES[0]?.id ?? "policy";

  return (
    <section
      ref={sectionRef}
      className="landing-scene landing-scene-solid landing-scene-use min-h-[125vh] py-20 sm:min-h-[145vh] sm:py-24 lg:min-h-[185vh] lg:py-0"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, scale: exitScale, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="w-full">
          <div ref={labelRef} className="section-label" style={{ opacity: 0 }}>
            Use cases
          </div>

          <div className="mt-7 grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="min-w-0">
              <h2 className="max-w-[20ch] font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]">
                Built for reading that matters.
              </h2>
              <p className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
                Pick a workflow. The UI stays the same: claims become evidence cards, traces stay inspectable, and you get a deliberate choice set instead of a feed.
              </p>

              <div className="mt-10 grid gap-3">
                {[
                  { t: "Inputs", d: "URL, claim, or position you're evaluating." },
                  { t: "Outputs", d: "Evidence cards + counter-frames + trace." },
                  { t: "Decision", d: "Three next reads, selected for coverage." },
                ].map((x) => (
                  <div key={x.t} className="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">
                      {x.t}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--fg)]">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0">
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
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">{u.title}</div>
                        <div className="mt-2 text-sm font-semibold tracking-[-0.01em]">{u.subtitle}</div>
                        <div aria-hidden className="mt-6 h-px w-12 bg-[color:color-mix(in_oklab,var(--accent)_55%,transparent)] opacity-60" />
                        <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">Example input</div>
                        <div className="mt-2 rounded-[0.8rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] p-3 font-mono text-[12px] leading-relaxed text-[color:var(--fg)]">
                          {u.inputExample}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">What you get</div>
                        <div className="mt-2 text-sm font-semibold tracking-[-0.01em]">A decision surface, not a summary</div>
                        <div aria-hidden className="mt-6 h-px w-12 bg-[color:color-mix(in_oklab,var(--accent-2)_52%,transparent)] opacity-60" />
                        <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">Example output</div>
                        <div className="mt-2 rounded-[0.8rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] p-3 text-[13px] leading-relaxed text-[color:var(--muted-fg)]">
                          {u.outputExample}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">Guardrails</div>
                        <div className="mt-3 grid gap-2">
                          {u.guardrails.map((g) => (
                            <div key={g} className="flex items-center gap-2 text-sm text-[color:var(--fg)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] opacity-75" />
                              <span className="text-[13px] text-[color:var(--muted-fg)]">{g}</span>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">Best for</div>
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
            </div>
          </div>
        </div>

        <CutAccordionCascade progress={cutProgress} />
      </motion.div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitScale = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0.97]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const exitBlur = useTransform(scrollYProgress, [0.76, 1], [0, 14]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  const cutProgress = useTransform(scrollYProgress, [0.72, 1], [0, 1]);

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;

    const anim = animate(label, {
      opacity: [0, 1],
      translateX: [-24, 0],
      ease: "outQuint",
      duration: 800,
      autoplay: onScroll({ target: label, enter: "bottom-=100 top", repeat: false }),
    });

    return () => {
      anim.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-scene landing-scene-solid landing-scene-faq min-h-[125vh] py-20 sm:min-h-[145vh] sm:py-24 lg:min-h-[175vh] lg:py-0"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, scale: exitScale, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="w-full">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="min-w-0">
              <div ref={labelRef} className="section-label" style={{ opacity: 0 }}>
                FAQ
              </div>
              <h2 className="mt-7 max-w-[20ch] font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]">
                Less magic.
                <br />
                More receipts.
              </h2>
              <p className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
                These are the guardrails that make the interface feel high-trust instead of AI slop.
              </p>

              <Card className="mt-10 p-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">If you remember one thing</div>
                <div className="mt-3 grid gap-2 text-sm">
                  {[
                    "Factual claims require evidence cards.",
                    "Counter-frames are required, not optional.",
                    "Trace is part of the interface.",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-2 text-[13px] text-[color:var(--muted-fg)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-2)] opacity-80" />
                      {t}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="min-w-0">
              <Card className="p-4">
                <Accordion type="single" collapsible defaultValue="faq_0">
                  {FAQ_ITEMS.map((item, idx) => (
                    <AccordionItem
                      key={item.q}
                      value={`faq_${idx}`}
                      className={idx === FAQ_ITEMS.length - 1 ? "py-1" : "border-b border-[color:var(--border-soft)] py-1"}
                    >
                      <AccordionTrigger className="text-sm">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-[13px] leading-relaxed text-[color:var(--muted-fg)]">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            </div>
          </div>
        </div>

        <CutCTAStamp progress={cutProgress} />
      </motion.div>
    </section>
  );
}

// ── Closing CTA ───────────────────────────────────────────────────────────────

function ClosingSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const exitOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);
  const exitScale = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0.97]);
  const exitY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const exitBlur = useTransform(scrollYProgress, [0.76, 1], [0, 14]);
  const exitFilter = useMotionTemplate`blur(${exitBlur}px)`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const anim = animate(el, {
      opacity: [0, 1],
      translateY: [24, 0],
      ease: "outQuint",
      duration: 900,
      autoplay: onScroll({ target: el, enter: "bottom-=140 top", repeat: false }),
    });

    return () => { anim.revert(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-scene landing-scene-solid landing-scene-close min-h-[125vh] py-24 sm:py-28 lg:min-h-[165vh] lg:py-0"
    >
      <motion.div
        style={{ opacity: exitOpacity, y: exitY, scale: exitScale, filter: exitFilter }}
        className="relative mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
      >
        <div className="w-full">
          <div
            ref={ref}
            className="w-full"
            style={{ opacity: 0 }}
          >
            <div className="mx-auto w-full max-w-6xl">
              <div className="relative overflow-hidden rounded-[32px_12px_32px_12px] border border-[color:color-mix(in_oklab,var(--border)_64%,transparent)] bg-[color:color-mix(in_oklab,var(--surface-2)_20%,transparent)] px-6 py-10 backdrop-blur-[26px] backdrop-saturate-[165%] sm:px-10 sm:py-12">
                <div aria-hidden className="hud-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
                <FrameCorners inset={20} size={20} opacity={0.55} />

                <div className="relative grid gap-10 md:grid-cols-[1.6fr_1fr] md:items-end">
                  <div className="text-left">
                    <div className="section-label">High-trust decision support</div>
                    <h2 className="mt-7 font-serif text-[clamp(2.2rem,5.6vw,4rem)] leading-[1.02] tracking-[-0.035em]">
                      Built for reading that matters.
                    </h2>
                    <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
                      The workspace is one click away. Every session is traceable, every claim is sourced.
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted-fg)] opacity-70">
                      Start a session
                    </div>
                    <div className="mt-4 flex md:justify-end">
                      <Button size="lg" onClick={() => router.push("/app")}>
                        Open workspace <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-6 text-[12px] leading-relaxed text-[color:var(--muted-fg)] opacity-75">
                      No feeds. No engagement loops. Just evidence.
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden
                  className="mt-10 h-px w-full bg-[linear-gradient(to_right,transparent,color-mix(in_oklab,var(--accent)_42%,transparent),color-mix(in_oklab,var(--accent-2)_34%,transparent),color-mix(in_oklab,var(--accent)_42%,transparent),transparent)] opacity-70"
                />

                <div className="relative mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      icon: <AudioLines className="h-4 w-4" />,
                      t: "Live transcript",
                      d: "Talk naturally. The transcript and evidence update in the same pane.",
                    },
                    {
                      icon: <FileSearch className="h-4 w-4" />,
                      t: "Retrieval trace",
                      d: "Inspect tool calls and why sources were selected. Nothing is hidden.",
                    },
                    {
                      icon: <ShieldCheck className="h-4 w-4" />,
                      t: "Epistemic contract",
                      d: "Unsupported factual claims are blocked until evidence exists.",
                    },
                  ].map((x) => (
                    <div
                      key={x.t}
                      className="rounded-[0.9rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_88%,transparent)] p-4"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.65rem] border border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_8%,var(--surface-3))] text-[color:var(--accent)]">
                          {x.icon}
                        </span>
                        {x.t}
                      </div>
                      <div className="mt-3 text-[13px] leading-relaxed text-[color:var(--muted-fg)]">{x.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
