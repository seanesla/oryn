"use client";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ScrollTrigger, SplitText, gsap, useGSAP, registerGsapPlugins } from "@/lib/gsap";

registerGsapPlugins();

export function ClosingSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);

  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!sectionRef.current) return;

      const sectionEl = sectionRef.current;

      const logo = sectionRef.current.querySelector<HTMLElement>("[data-closing-logo]");
      const headline = sectionRef.current.querySelector<HTMLElement>("[data-closing-headline]");
      const body = sectionRef.current.querySelector<HTMLElement>("[data-closing-body]");
      const ctas = sectionRef.current.querySelector<HTMLElement>("[data-closing-ctas]");

      if (!logo || !headline || !body || !ctas) return;

      /* SplitText — character-level for the dramatic scale reveal */
      const split = new SplitText(headline, { type: "chars" });
      const chars = (split.chars ?? []) as HTMLElement[];

      /* Initial state: fully hidden (matches how other sections start) */
      gsap.set(logo, { autoAlpha: 0, scale: 0.9, y: 20 });
      gsap.set(headline, {
        scale: 1.12,
        autoAlpha: 0,
        filter: "blur(6px)",
        transformOrigin: "50% 50%",
      });
      gsap.set(chars, { autoAlpha: 0, scale: 0 });
      gsap.set(body, { autoAlpha: 0, y: 20 });
      gsap.set(ctas, { autoAlpha: 0, y: 20 });

      // Phase 1: scrubbed entrance while the section scrolls into view.
      // This prevents the "vanilla scroll gap" between the previous pin ending
      // and this pin starting — content is visibly animating during that range.
      const enterTl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionEl,
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      enterTl
        .to(
          logo,
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: "back.out(1.4)",
          },
          0,
        )
        .to(
          headline,
          {
            scale: 1,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.42,
            ease: "power3.out",
          },
          0.06,
        )
        .to(
          chars,
          {
            autoAlpha: 1,
            scale: 1,
            stagger: { each: 0.015, from: "random" },
            duration: 0.34,
            ease: "back.out(1.7)",
          },
          0.12,
        )
        .to(body, { autoAlpha: 1, y: 0, duration: 0.26, ease: "power3.out" }, 0.48)
        .to(ctas, { autoAlpha: 1, y: 0, duration: 0.22, ease: "power3.out" }, 0.58);

      // Phase 2: pin + hold at the top.
      // No exit phase since this is the last section.
      const holdTl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionEl,
          start: "top top",
          end: () => "+=" + window.innerHeight * 0.8,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      holdTl.to({}, { duration: 1 });

      // Ensure measurements account for the pin-spacer insertion.
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });

      return () => {
        split.revert();

        enterTl.scrollTrigger?.kill();
        enterTl.kill();

        holdTl.scrollTrigger?.kill();
        holdTl.kill();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      data-landing-scene="closing"
      className="landing-scene landing-scene-solid flex min-h-[100svh] items-center justify-center"
    >
      <div className="relative mx-auto w-full max-w-2xl px-4 py-20 sm:px-6 lg:px-10">
        <div data-closing-inner className="flex flex-col items-center text-center">
          {/* Oryn logo mark */}
          <div
            data-closing-logo
            className="mb-8"
            style={{
              filter: "drop-shadow(0 0 32px rgba(139,92,246,0.5)) drop-shadow(0 0 14px rgba(37,99,235,0.35))",
            }}
          >
            <Image src="/orynlogo.svg" alt="oryn" width={110} height={110} priority />
          </div>

          <h2
            data-closing-headline
            className="font-serif text-[clamp(2.25rem,5.6vw,4.2rem)] leading-[1.02] tracking-[-0.04em]"
            style={{ textShadow: "0 4px 40px rgba(0,0,0,0.6)" }}
          >
            Start reading deliberately.
          </h2>

          <p
            data-closing-body
            className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
          >
            Evidence cards, counter-frames, and a trace you can inspect. No feeds, no
            summaries — just grounded claims and deliberate next reads.
          </p>

          <div data-closing-ctas className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={() => router.push("/app")}>
              Open workspace <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push("/history")}>
              View history
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
