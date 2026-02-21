"use client";

import { useCallback, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { ScrollTrigger, SplitText, gsap, useGSAP, registerGsapPlugins } from "@/lib/gsap";

registerGsapPlugins();

/* ── Data ── */

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
    inputExample: "\u201CThis program reduced costs for the average household.\u201D",
    outputExample:
      "Evidence cards + counter-evidence, then 3 next reads: definition, distribution, replication.",
    guardrails: ["Evidence cards required", "Counter-frame included", "Trace is inspectable"],
    bestFor: ["briefs", "hearings", "reports", "think tank claims"],
  },
  {
    id: "research",
    label: "Research",
    title: "Compare papers without losing citations",
    subtitle: "Keep a trail from claim \u2192 quote \u2192 source \u2192 retrieval decision.",
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
    inputExample: "\u201CThis model is privacy-preserving and compliant by design.\u201D",
    outputExample:
      "Evidence cards scoped to definitions, threat model, and enforcement mechanisms.",
    guardrails: [
      "Unsupported factual claims blocked",
      "Constraints shown",
      "Only 3 deliberate next reads",
    ],
    bestFor: ["AI vendor eval", "security claims", "platform comparisons"],
  },
  {
    id: "media",
    label: "Media",
    title: "Fact-check without becoming a feed",
    subtitle: "High-signal counter-frames, not endless scrolling.",
    inputExample: "Drop a link to a viral article and the specific sentence you doubt.",
    outputExample:
      "A dispute map: what\u2019s factual vs causal vs values \u2014 and what\u2019s missing.",
    guardrails: ["Quote required", "Counter-evidence required", "Selection why is visible"],
    bestFor: ["reporting review", "headline drift", "metric definitions"],
  },
];

/* ── Component ── */

export function UseCasesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

  const defaultCase = USE_CASES[0]?.id ?? "policy";
  const [activeCase, setActiveCase] = useState<string>(defaultCase);

  /* Tab panels ref for GSAP-driven switching */
  const tabPanelsRef = useRef<HTMLElement[]>([]);

  const applyLineMasks = (lines: HTMLElement[]) => {
    const masks: HTMLElement[] = [];
    for (const line of lines) {
      const parent = line.parentNode;
      if (!parent) continue;
      const mask = document.createElement("div");
      mask.className = "split-line-mask";
      parent.insertBefore(mask, line);
      mask.appendChild(line);
      masks.push(mask);
    }
    return () => {
      for (const mask of masks) {
        const child = mask.firstChild;
        if (child) mask.parentNode?.insertBefore(child, mask);
        mask.remove();
      }
    };
  };

  /* ── Click-driven tab switch ── */
  const handleTabChange = useCallback((value: string) => {
    setActiveCase(value);
    const panels = tabPanelsRef.current;
    if (!panels.length) return;
    const idx = USE_CASES.findIndex((u) => u.id === value);
    panels.forEach((p, i) => {
      if (i === idx) {
        gsap.to(p, { autoAlpha: 1, x: 0, duration: 0.25, ease: "power3.out" });
      } else {
        gsap.to(p, { autoAlpha: 0, x: 0, duration: 0.15, ease: "power2.in" });
      }
    });
    panels.forEach((p, i) => {
      if (i === idx) {
        p.removeAttribute("aria-hidden");
        p.removeAttribute("inert");
      } else {
        p.setAttribute("aria-hidden", "true");
        p.setAttribute("inert", "");
      }
    });
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!sectionRef.current) return;

      const label = sectionRef.current.querySelector<HTMLElement>("[data-use-label]");
      const headline = sectionRef.current.querySelector<HTMLElement>("[data-use-headline]");
      const body = sectionRef.current.querySelector<HTMLElement>("[data-use-body]");
      const nav = sectionRef.current.querySelector<HTMLElement>("[data-use-nav]");
      const contentWrap = sectionRef.current.querySelector<HTMLElement>("[data-use-content]");
      const tabPanels = Array.from(
        sectionRef.current.querySelectorAll<HTMLElement>("[data-use-tab-panel]"),
      );
      tabPanelsRef.current = tabPanels;

      if (!label || !headline || !body || !nav || !contentWrap || tabPanels.length === 0) return;

      const split = new SplitText(headline, { type: "lines" });
      const lines = (split.lines ?? []) as HTMLElement[];
      const removeMasks = applyLineMasks(lines);

      /* Initial states */
      gsap.set(label, { autoAlpha: 0, y: 12 });
      gsap.set(lines, { autoAlpha: 0, yPercent: 120 });
      gsap.set(body, { autoAlpha: 0, y: 18 });
      gsap.set(nav, { autoAlpha: 0, y: 20 });
      gsap.set(contentWrap, { autoAlpha: 0, y: 30 });

      /* Tab panels: first visible, rest hidden with horizontal offset */
      tabPanels.forEach((p, i) => {
        gsap.set(p, { autoAlpha: i === 0 ? 1 : 0, x: i === 0 ? 0 : 60 });
      });

      const revealTl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      revealTl
        .to(label, { autoAlpha: 1, y: 0, duration: 0.45 })
        .to(
          lines,
          {
            autoAlpha: 1,
            yPercent: 0,
            stagger: 0.14,
            duration: 0.85,
            ease: "back.out(1.4)",
          },
          "-=0.15",
        )
        .to(body, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.6")
        .to(nav, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.4")
        .to(contentWrap, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.45");

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        once: true,
        onEnter: () => {
          revealTl.play(0);
        },
      });

      return () => {
        removeMasks();
        split.revert();
        trigger.kill();
        revealTl.kill();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      data-landing-scene="use"
      className="landing-scene landing-scene-solid flex min-h-[100svh] items-center"
    >
      <div className="relative mx-auto w-full max-w-[1680px] px-4 py-20 sm:px-6 lg:px-10">
        <div data-use-inner className="relative z-10">
          <div data-use-label className="section-label">
            Use Cases
          </div>

          <h2
            data-use-headline
            className="mt-7 max-w-[20ch] font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]"
            style={{ textShadow: "0 4px 32px rgba(0,0,0,0.5)" }}
          >
            Built for reading that matters.
          </h2>

          <p
            data-use-body
            className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
          >
            Pick a workflow. The UI stays the same: claims become evidence cards, traces stay
            inspectable, and you get a deliberate choice set instead of a feed.
          </p>

          {/* ── Custom nav: text labels with sliding accent underline ── */}
          <nav
            data-use-nav
            className="mt-10 flex items-center gap-6 border-b border-[color:color-mix(in_oklab,var(--border)_50%,transparent)] text-sm font-medium"
          >
            {USE_CASES.map((u) => (
              <button
                key={u.id}
                type="button"
                data-active={activeCase === u.id ? "true" : "false"}
                onClick={() => handleTabChange(u.id)}
                className="use-nav-item text-[color:var(--muted-fg)] transition-colors data-[active=true]:text-[color:var(--fg)]"
              >
                {u.label}
              </button>
            ))}
          </nav>

          {/* ── Tab content: stacked panels, GSAP controls visibility ── */}
          <div data-use-content className="mt-8 grid [&>*]:col-start-1 [&>*]:row-start-1">
            {USE_CASES.map((u) => (
              <div
                key={u.id}
                data-use-tab-panel={u.id}
                aria-hidden={activeCase !== u.id || undefined}
                {...(activeCase !== u.id ? { inert: true as unknown as boolean } : {})}
              >
                <UseCasePanel useCase={u} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Use-case panel: clean typography, no cards ── */

function UseCasePanel({ useCase: u }: { useCase: UseCase }) {
  return (
    <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
      {/* Left: title + examples */}
      <div>
        <div className="font-serif text-[clamp(1.35rem,3vw,2rem)] leading-[1.14] tracking-[-0.02em] text-gradient">
          {u.title}
        </div>
        <div className="mt-2 text-sm text-[color:var(--muted-fg)]">{u.subtitle}</div>

        <div className="mt-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
            Example input
          </div>
          <div className="accent-border-block mt-2 font-mono text-[12px] leading-relaxed text-[color:var(--fg)]">
            {u.inputExample}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
            What you get
          </div>
          <div className="accent-border-block-2 mt-2 text-[13px] leading-relaxed text-[color:var(--muted-fg)]">
            {u.outputExample}
          </div>
        </div>
      </div>

      {/* Right: guardrails + best for */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
          Guardrails
        </div>
        <div className="mt-3 grid gap-2.5">
          {u.guardrails.map((g) => (
            <div
              key={g}
              className="flex items-center gap-2.5 text-[13px] text-[color:var(--muted-fg)]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)] opacity-70" />
              {g}
            </div>
          ))}
        </div>

        <div className="mt-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
          Best for
        </div>
        <div className="mt-3 text-[13px] leading-relaxed text-[color:var(--muted-fg)]">
          {u.bestFor.join(" \u00B7 ")}
        </div>
      </div>
    </div>
  );
}
