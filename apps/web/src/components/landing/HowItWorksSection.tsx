"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";

import { ScrollTrigger, SplitText, gsap, useGSAP, registerGsapPlugins } from "@/lib/gsap";

registerGsapPlugins();

/* ── Data ── */

const STEPS = [
  {
    num: "01",
    label: "Start",
    text: "Drop in a URL, paste a claim, or describe a position you're trying to evaluate.",
  },
  {
    num: "02",
    label: "Review",
    text: "oryn surfaces evidence cards with counter-frames — grounded claims, not summaries.",
  },
  {
    num: "03",
    label: "Decide",
    text: "Choose from three deliberate next reads, selected for coverage not engagement loops.",
  },
];

/* ── Component ── */

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!sectionRef.current) return;

      const label = sectionRef.current.querySelector<HTMLElement>("[data-how-label]");
      const headline = sectionRef.current.querySelector<HTMLElement>("[data-how-headline]");
      const cursor = sectionRef.current.querySelector<HTMLElement>("[data-how-cursor]");
      const body = sectionRef.current.querySelector<HTMLElement>("[data-how-body]");
      const leftCol = sectionRef.current.querySelector<HTMLElement>("[data-how-left]");
      const rightCol = sectionRef.current.querySelector<HTMLElement>("[data-how-right]");
      const steps = Array.from(
        sectionRef.current.querySelectorAll<HTMLElement>("[data-how-step]"),
      );
      const stepNums = Array.from(
        sectionRef.current.querySelectorAll<HTMLElement>("[data-how-step-num]"),
      );
      const stepTexts = Array.from(
        sectionRef.current.querySelectorAll<HTMLElement>("[data-how-step-text]"),
      );
      const drawLine = sectionRef.current.querySelector<SVGLineElement>("[data-how-draw-line]");

      if (!label || !headline || !cursor || !body || !leftCol || !rightCol) return;
      if (steps.length === 0 || !drawLine) return;
      if (stepNums.length < 3 || stepTexts.length < 3) return;

      /* SplitText — char-by-char typewriter on headline */
      const split = new SplitText(headline, { type: "chars" });
      gsap.set(split.chars, { autoAlpha: 0 });

      /* Initial states */
      gsap.set(label, { autoAlpha: 0, y: 12 });
      gsap.set(cursor, { autoAlpha: 0 });
      gsap.set(body, { autoAlpha: 0, y: 18 });
      gsap.set(leftCol, { x: -50, autoAlpha: 0 });

      /* Steps: numbers revealed via circle clip-path, text slides from right */
      stepNums.forEach((n) => {
        gsap.set(n, { clipPath: "circle(0% at 50% 50%)", autoAlpha: 1 });
      });
      stepTexts.forEach((t) => {
        gsap.set(t, { autoAlpha: 0, x: 40 });
      });

      /* SVG line: set up stroke-dasharray for draw effect */
      const lineLength = drawLine.getTotalLength();
      gsap.set(drawLine, { strokeDasharray: lineLength, strokeDashoffset: lineLength });

      const revealTl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      revealTl
        .to(leftCol, { x: 0, autoAlpha: 1, duration: 0.6 })
        .to(label, { autoAlpha: 1, y: 0, duration: 0.45 }, "-=0.35")
        .to(cursor, { autoAlpha: 1, duration: 0.1 }, "-=0.35")
        .to(
          split.chars,
          { autoAlpha: 1, stagger: 0.02, duration: 0.6, ease: "none" },
          "-=0.15",
        )
        .to(body, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.35")

        // Step 1
        .to(
          stepNums[0],
          { clipPath: "circle(100% at 50% 50%)", duration: 0.45 },
          ">-=0.1",
        )
        .to(stepTexts[0], { autoAlpha: 1, x: 0, duration: 0.55 }, "-=0.25")
        .to(drawLine, { strokeDashoffset: lineLength * 0.66, duration: 0.35, ease: "none" }, "-=0.35")

        // Step 2
        .to(stepNums[1], { clipPath: "circle(100% at 50% 50%)", duration: 0.45 }, ">+=0.15")
        .to(stepTexts[1], { autoAlpha: 1, x: 0, duration: 0.55 }, "-=0.25")
        .to(drawLine, { strokeDashoffset: lineLength * 0.33, duration: 0.35, ease: "none" }, "-=0.35")

        // Step 3
        .to(stepNums[2], { clipPath: "circle(100% at 50% 50%)", duration: 0.45 }, ">+=0.15")
        .to(stepTexts[2], { autoAlpha: 1, x: 0, duration: 0.55 }, "-=0.25")
        .to(drawLine, { strokeDashoffset: 0, duration: 0.35, ease: "none" }, "-=0.35");

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        once: true,
        onEnter: () => {
          revealTl.play(0);
        },
      });

      /* Cursor blink — independent infinite loop */
      gsap.to(cursor, {
        autoAlpha: 0.2,
        duration: 0.55,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
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
      data-landing-scene="how"
      className="landing-scene landing-scene-solid flex min-h-[100svh] items-center"
    >
      <div className="relative mx-auto w-full max-w-[1680px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="relative z-10 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          {/* ── Left: headline + body ── */}
          <div data-how-left className="min-w-0">
            <div data-how-label className="section-label">
              How It Works
            </div>

            <div className="mt-7 flex items-baseline gap-2">
              <h2
                data-how-headline
                className="max-w-[24ch] font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]"
                style={{ textShadow: "0 4px 32px rgba(0,0,0,0.5)" }}
              >
                Three moves. One decision.
              </h2>
              <span
                aria-hidden
                data-how-cursor
                className="inline-block h-[0.9em] w-[0.55ch] translate-y-[0.06em] rounded-sm bg-[color:var(--accent)]"
              />
            </div>

            <p
              data-how-body
              className="mt-7 max-w-[58ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
            >
              Start with a claim or URL, review evidence cards with counter-frames, then pick
              from three next reads selected for coverage.
            </p>
          </div>

          {/* ── Right: steps with SVG connecting line ── */}
          <div data-how-right className="relative grid gap-6">
            {/* SVG drawn line connecting step numbers */}
            <svg
              aria-hidden
              className="pointer-events-none absolute left-6 top-4 h-[calc(100%-2rem)] w-px sm:left-8"
            >
              <line
                data-how-draw-line
                x1="0"
                y1="0"
                x2="0"
                y2="100%"
                className="step-draw-line"
              />
            </svg>

            {STEPS.map((step) => (
              <div
                key={step.num}
                data-how-step
                className="relative grid grid-cols-[3.5rem_1fr] items-start gap-4 sm:grid-cols-[4.5rem_1fr]"
              >
                {/* Step number — circle clip-path reveal */}
                <div
                  data-how-step-num
                  className="step-num-outline font-serif text-[clamp(2.8rem,5vw,4rem)] tracking-[-0.06em]"
                >
                  {step.num}
                </div>

                {/* Step text — slides from right */}
                <div data-how-step-text>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">
                    {step.label}
                  </div>
                  <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-[color:var(--muted-fg)]">
                    {step.text}
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
