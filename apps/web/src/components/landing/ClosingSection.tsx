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

      const logo = sectionEl.querySelector<HTMLElement>("[data-closing-logo]");
      const headline = sectionEl.querySelector<HTMLElement>("[data-closing-headline]");
      const body = sectionEl.querySelector<HTMLElement>("[data-closing-body]");
      const ctas = sectionEl.querySelector<HTMLElement>("[data-closing-ctas]");

      if (!logo || !headline || !body || !ctas) return;

      /* SplitText — character-level for the dramatic scale reveal */
      const split = new SplitText(headline, { type: "chars" });
      const chars = (split.chars ?? []) as HTMLElement[];

      /* Initial state: fully hidden */
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

      const revealTl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      revealTl
        .to(logo, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          ease: "back.out(1.35)",
        })
        .to(
          headline,
          {
            scale: 1,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.8,
          },
          "-=0.35",
        )
        .to(
          chars,
          {
            autoAlpha: 1,
            scale: 1,
            stagger: { each: 0.02, from: "random" },
            duration: 0.7,
            ease: "back.out(1.6)",
          },
          "-=0.55",
        )
        .to(body, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.45")
        .to(ctas, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.4");

      const trigger = ScrollTrigger.create({
        trigger: sectionEl,
        start: "top 15%",
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
            <Button size="lg" onClick={() => router.push("/app/co-reading")}>
              Open workspace <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push("/app/history")}>
              View history
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
