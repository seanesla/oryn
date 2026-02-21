"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { SplitText, gsap, useGSAP, registerGsapPlugins } from "@/lib/gsap";

registerGsapPlugins();

/**
 * Loading animation takes ~3.2s. We delay the hero entrance so it starts
 * as the overlay begins fading (~2.4s in), creating a seamless handoff:
 * logo ring expands → overlay fades → hero text erupts from center.
 */
const INTRO_DELAY = 2.4;

/* Brand palette for the accent-word color shimmer (matches logo gradient) */
const SHIMMER_COLORS = ["#818cf8", "#67e8f9", "#a78bfa", "#818cf8"];

export function HeroSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!sectionRef.current) return;

      const brand = sectionRef.current.querySelector<HTMLElement>("[data-hero-brand]");
      const headline = sectionRef.current.querySelector<HTMLElement>("[data-hero-headline]");
      const subtitle = sectionRef.current.querySelector<HTMLElement>("[data-hero-subtitle]");
      const ctas = sectionRef.current.querySelector<HTMLElement>("[data-hero-ctas]");
      const cue = sectionRef.current.querySelector<HTMLElement>("[data-hero-cue]");

      if (!brand || !headline || !subtitle || !ctas || !cue) return;

      /* ── Character-level split for the burst animation ── */
      const split = new SplitText(headline, { type: "chars" });
      const allChars = (split.chars ?? []) as HTMLElement[];

      /* Identify which chars belong to the accent span (data-hero-shimmer)
         so we can apply the shimmer color effect after the burst. SplitText
         wraps each char in its own div, but they remain children of the
         original <span> — so we check closest(). */
      const shimmerSpan = headline.querySelector<HTMLElement>("[data-hero-shimmer]");
      const accentChars = shimmerSpan
        ? allChars.filter((ch) => shimmerSpan.contains(ch))
        : [];

      /* ── Initial state: everything hidden ── */
      gsap.set(brand, { autoAlpha: 0, y: 20, scale: 0.9 });
      gsap.set(allChars, { autoAlpha: 0, scale: 0, rotation: () => gsap.utils.random(-15, 15) });
      gsap.set(subtitle, { autoAlpha: 0, y: 14, filter: "blur(6px)" });
      gsap.set(ctas, { autoAlpha: 0, y: 12 });
      gsap.set(cue, { autoAlpha: 0 });

      /* Set accent chars to brand purple so they're colored on reveal */
      if (accentChars.length > 0) {
        gsap.set(accentChars, { color: "#818cf8" });
      }

      /* ── Entrance timeline — delayed to sync with loading animation exit ── */
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: INTRO_DELAY,
      });

      /* 1. Brand wordmark — scale-in */
      intro.to(brand, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "back.out(1.4)",
      });

      /* 2. THE MONEY SHOT — character burst from center.
         Every char starts scaled to 0 at its position, then springs outward.
         Center chars appear first, edges last. back.out gives the spring overshoot. */
      intro.to(allChars, {
        autoAlpha: 1,
        scale: 1,
        rotation: 0,
        stagger: { each: 0.012, from: "center" },
        duration: 1.2,
        ease: "back.out(1.7)",
      }, "-=0.15");

      /* 3. Subtitle — blur-resolve fade */
      intro.to(subtitle, {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "power2.out",
      }, "-=0.5");

      /* 4. CTAs — slide up */
      intro.to(ctas, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      }, "-=0.35");

      /* 5. Scroll cue — last to appear */
      intro.to(cue, {
        autoAlpha: 1,
        duration: 0.8,
        ease: "power2.out",
      }, "-=0.2");

      /* ── Continuous shimmer on accent chars ──
         After the entrance completes, cycle the accent chars through
         brand colors in a staggered wave. Pure GSAP — no CSS gradient
         clip needed (which would break with SplitText). */
      if (accentChars.length > 0) {
        gsap.to(accentChars, {
          keyframes: SHIMMER_COLORS.map((c) => ({ color: c, duration: 1.2 })),
          stagger: { each: 0.08, repeat: -1 },
          ease: "sine.inOut",
          delay: INTRO_DELAY + 2.5,
        });
      }

      // Release the compositing layer created by blur(0px).
      intro.eventCallback("onComplete", () => {
        gsap.set(subtitle, { clearProps: "filter" });
      });

      return () => {
        split.revert();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      data-landing-scene="hero"
      className="landing-scene relative flex min-h-screen flex-col items-center justify-center"
    >
      {/* 50 % dim overlay — sits between the galaxy bg and hero content */}
      <div className="pointer-events-none absolute inset-0 bg-black/50" />

      <div
        data-hero-content
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center sm:px-6 lg:px-10"
      >
        {/* Brand wordmark — large, nearly headline-sized */}
        <div
          data-hero-brand
          className="text-gradient mb-6 font-medium tracking-[0.15em] text-[clamp(2.5rem,6.5vw,5rem)] leading-none"
        >
          oryn
        </div>

        {/* Headline — centered, accent words colored via GSAP shimmer */}
        <h1
          data-hero-headline
          className="mx-auto font-serif text-[clamp(3rem,8vw,6rem)] leading-[0.96] tracking-[-0.04em]"
          style={{ textShadow: "0 4px 50px rgba(0,0,0,0.5)" }}
        >
          Understand disagreement,{" "}
          <span data-hero-shimmer>without losing</span>{" "}
          the evidence.
        </h1>

        {/* Subtitle — visible on the dark background */}
        <p
          data-hero-subtitle
          className="mt-8 max-w-[46ch] text-[16px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Drop in any article. See what&apos;s really being said — and what got left out.
        </p>

        {/* CTAs — centered */}
        <div data-hero-ctas className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" onClick={() => router.push("/app/co-reading")}>
            Open workspace <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push("/app/history")}>
            View history
          </Button>
        </div>


      </div>

      {/* Scroll cue */}
      <div
        data-hero-cue
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Scroll
        </span>
        <ChevronDown className="h-4 w-4 animate-bounce" style={{ color: "rgba(255,255,255,0.4)" }} />
      </div>
    </section>
  );
}
