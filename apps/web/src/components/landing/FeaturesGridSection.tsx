"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { AudioLines, FileSearch, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/cn";
import { ScrollTrigger, SplitText, gsap, useGSAP, registerGsapPlugins } from "@/lib/gsap";

registerGsapPlugins();

/* ── Data ── */

interface FeatureBlock {
  icon: ReactNode;
  label: string;
  title: string;
  body: string;
  accentVar: "--accent" | "--accent-2";
}

const FEATURES: FeatureBlock[] = [
  {
    icon: <AudioLines className="h-10 w-10 sm:h-12 sm:w-12" />,
    label: "Live session",
    title: "Voice-native, instant interruption",
    body: "Talk naturally while oryn listens, analyzes, and structures your conversation into a live transcript — updating evidence cards in real time.",
    accentVar: "--accent",
  },
  {
    icon: <FileSearch className="h-10 w-10 sm:h-12 sm:w-12" />,
    label: "Transparency layer",
    title: "Every claim shows its retrieval path",
    body: "Every factual assertion is linked to query steps, source selection criteria, and ranking decisions. Nothing is hidden from the audit trail.",
    accentVar: "--accent-2",
  },
  {
    icon: <ShieldCheck className="h-10 w-10 sm:h-12 sm:w-12" />,
    label: "Epistemic contract",
    title: "Unsupported claims blocked by design",
    body: "The system cannot surface a factual claim until it can attach an evidence card and a citation path. Enforced at the architecture level.",
    accentVar: "--accent",
  },
];

/* ── Component ── */

export function FeaturesGridSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!sectionRef.current) return;

      const label = sectionRef.current.querySelector<HTMLElement>("[data-feat-label]");
      const headline = sectionRef.current.querySelector<HTMLElement>("[data-feat-headline]");
      const body = sectionRef.current.querySelector<HTMLElement>("[data-feat-body]");
      const blocks = Array.from(
        sectionRef.current.querySelectorAll<HTMLElement>("[data-feat-block]"),
      );

      if (!label || !headline || !body || blocks.length === 0) return;

      /* SplitText on headline — word-level spring */
      const split = new SplitText(headline, { type: "words" });
      const words = (split.words ?? []) as HTMLElement[];

      /* Initial states */
      gsap.set(label, { autoAlpha: 0, y: 14 });
      gsap.set(words, { autoAlpha: 0, y: 44, rotateZ: -4, transformOrigin: "0% 100%" });
      gsap.set(body, { autoAlpha: 0, y: 22 });
      blocks.forEach((block, i) => {
        gsap.set(block, { autoAlpha: 0, x: i % 2 === 0 ? -90 : 90, y: 16 });
      });

      const revealTl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      revealTl
        .to(label, { autoAlpha: 1, y: 0, duration: 0.45 })
        .to(
          words,
          {
            autoAlpha: 1,
            y: 0,
            rotateZ: 0,
            stagger: { each: 0.03, from: "center" },
            duration: 0.9,
            ease: "back.out(1.6)",
          },
          "-=0.2",
        )
        .to(body, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.55")
        .to(
          blocks,
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            stagger: 0.12,
            duration: 0.7,
            ease: "power3.out",
          },
          "-=0.25",
        );

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        // "top 2px" fires when the section's top is 2px from the viewport
        // top, giving 2px of subpixel tolerance so a snap that lands 1px
        // short still fires the reveal during the smooth scroll approach.
        start: "top 2px",
        once: true,
        onEnter: () => {
          revealTl.play(0);
        },
      });

      return () => {
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
      data-landing-scene="features"
      className="landing-scene landing-scene-solid flex min-h-[100svh] items-center"
    >
      <div className="relative mx-auto w-full max-w-[1680px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="relative z-10">
          <div data-feat-label className="section-label">
            Features
          </div>

          <h2
            data-feat-headline
            className="mt-7 max-w-[22ch] font-serif text-[clamp(2.35rem,6.2vw,4.6rem)] leading-[1.01] tracking-[-0.04em]"
            style={{ textShadow: "0 4px 32px rgba(0,0,0,0.5)" }}
          >
            Proof over persuasion.
          </h2>

          <p
            data-feat-body
            className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
          >
            oryn is built for high-stakes reading: it turns disagreement into explicit dispute
            types, forces{" "}
            <span className="text-gradient font-medium">evidence cards</span>, and keeps the{" "}
            <span className="text-gradient font-medium">retrieval trace</span> visible.
          </p>

          {/* ── Feature blocks: no cards, alternating left/right, gradient titles ── */}
          <div className="mt-14 grid gap-12 lg:mt-16 lg:gap-14">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.label}
                data-feat-block
                className={cn(
                  "relative flex max-w-[700px] items-start gap-5 sm:gap-7",
                  i % 2 === 1 && "ml-auto flex-row-reverse text-right",
                )}
              >
                {/* Decorative icon — large, tinted, translucent */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center opacity-25 sm:h-14 sm:w-14"
                  style={{ color: `var(${feature.accentVar})` }}
                >
                  {feature.icon}
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-fg)]">
                    {feature.label}
                  </div>
                  <div
                    className={cn(
                      "mt-2 font-serif text-[clamp(1.35rem,3vw,2rem)] leading-[1.14] tracking-[-0.02em]",
                      feature.accentVar === "--accent" ? "text-gradient" : "text-gradient-reverse",
                    )}
                  >
                    {feature.title}
                  </div>
                  <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-[color:var(--muted-fg)]">
                    {feature.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
