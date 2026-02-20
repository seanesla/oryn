"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { SplitText, gsap, useGSAP, registerGsapPlugins } from "@/lib/gsap";

registerGsapPlugins();

export function HeroSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

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

  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!sectionRef.current) return;

      const label = sectionRef.current.querySelector<HTMLElement>("[data-hero-label]");
      const headline = sectionRef.current.querySelector<HTMLElement>("[data-hero-headline]");
      const subtitle = sectionRef.current.querySelector<HTMLElement>("[data-hero-subtitle]");
      const ctas = sectionRef.current.querySelector<HTMLElement>("[data-hero-ctas]");
      const trust = sectionRef.current.querySelector<HTMLElement>("[data-hero-trust]");
      const cue = sectionRef.current.querySelector<HTMLElement>("[data-hero-cue]");

      if (!label || !headline || !subtitle || !ctas || !trust || !cue) return;

      const split = new SplitText(headline, { type: "lines" });
      const lines = (split.lines ?? []) as HTMLElement[];
      const removeMasks = applyLineMasks(lines);

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from(label, { autoAlpha: 0, y: 6, duration: 0.55 })
        .from(
          lines,
          {
            yPercent: 120,
            autoAlpha: 0,
            stagger: 0.14,
            duration: 1.15,
            ease: "power4.out",
          },
          "<0.05",
        )
        .from(subtitle, { autoAlpha: 0, y: 18, filter: "blur(8px)", duration: 0.75 }, "<0.18")
        .from(ctas, { autoAlpha: 0, y: 14, duration: 0.65 }, "<0.12")
        .from(trust, { autoAlpha: 0, duration: 0.9 }, "<0.18")
        .from(cue, { autoAlpha: 0, duration: 1.2 }, "<0.42");

      const exitTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * 1.2,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Multi-rate parallax dissolve: each layer drifts up at a different
      // speed, creating separation as the user scrolls. Targeted blur on
      // text elements only (small composite layers — GPU-friendly).
      exitTl
        .to(cue, { autoAlpha: 0, duration: 0.1, ease: "none" }, 0)
        // 1× rate — headline drifts fastest
        .to(label, { y: -220, autoAlpha: 0, duration: 1, ease: "none" }, 0)
        .to(headline, { y: -200, autoAlpha: 0, filter: "blur(6px)", duration: 1, ease: "none" }, 0)
        // 0.7× rate
        .to(subtitle, { y: -140, autoAlpha: 0, filter: "blur(4px)", duration: 1, ease: "none" }, 0)
        // 0.5× rate
        .to(ctas, { y: -100, autoAlpha: 0, duration: 1, ease: "none" }, 0)
        // 0.3× rate — trust indicators barely move
        .to(trust, { y: -60, autoAlpha: 0, duration: 1, ease: "none" }, 0);

      return () => {
        removeMasks();
        split.revert();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      data-landing-scene="hero"
      className="landing-scene relative flex min-h-screen flex-col justify-center"
    >
      <div aria-hidden className="landing-hero-scrim" />

      <div
        data-hero-content
        className="relative z-10 mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10"
      >
        {/* Eyebrow */}
        <div data-hero-label className="section-label mb-8">
          Evidence-first AI co-reading
        </div>

        {/* Headline */}
        <h1
          data-hero-headline
          className="max-w-[18ch] font-serif text-[clamp(2.85rem,7.6vw,5.7rem)] leading-[0.98] tracking-[-0.04em]"
        >
          Understand disagreement, <span className="text-[color:var(--accent)]">without losing</span> the evidence.
        </h1>

        {/* Subtitle */}
        <p
          data-hero-subtitle
          className="mt-8 max-w-[44ch] text-[16px] leading-relaxed text-[color:var(--muted-fg)]"
        >
          Oryn separates factual, causal, and value disputes — building evidence cards
          with counter-frames and recommending only three deliberate next reads.
        </p>

        {/* CTAs */}
        <div data-hero-ctas className="mt-10 flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={() => router.push("/app")}>
            Open workspace <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push("/history")}>
            View history
          </Button>
        </div>

        {/* Trust indicators */}
        <div data-hero-trust className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-2">
          {["Evidence cards required", "Counter-frame included", "Trace always visible"].map(
            (item) => (
              <div key={item} className="flex items-center gap-2 text-[12px] text-[color:var(--muted-fg)]">
                <span className="h-1 w-1 rounded-full bg-[color:var(--accent)] opacity-70" />
                {item}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Scroll cue */}
      <div
        data-hero-cue
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-fg)]">
          Scroll
        </span>
        <ChevronDown className="h-4 w-4 animate-bounce text-[color:var(--muted-fg)]" />
      </div>
    </section>
  );
}
