"use client";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SplitText, gsap, useGSAP, registerGsapPlugins } from "@/lib/gsap";

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

      const logo = sectionRef.current.querySelector<HTMLElement>("[data-closing-logo]");
      const headline = sectionRef.current.querySelector<HTMLElement>("[data-closing-headline]");
      const body = sectionRef.current.querySelector<HTMLElement>("[data-closing-body]");
      const ctas = sectionRef.current.querySelector<HTMLElement>("[data-closing-ctas]");

      if (!logo || !headline || !body || !ctas) return;

      /* SplitText — character-level for the dramatic scale reveal */
      const split = new SplitText(headline, { type: "chars" });
      const chars = (split.chars ?? []) as HTMLElement[];

      /* Initial state: never fully blank at pin start */
      gsap.set(logo, { autoAlpha: 1, scale: 0.9, y: 0 });
      gsap.set(headline, {
        scale: 1.12,
        autoAlpha: 1,
        filter: "blur(6px)",
        transformOrigin: "50% 50%",
      });
      gsap.set(chars, { autoAlpha: 0.75 });
      gsap.set(body, { autoAlpha: 1, y: 10 });
      gsap.set(ctas, { autoAlpha: 1, y: 10 });

      /* Entrance timeline — plays once when section scrolls into view */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      });

      tl
        /* Logo scales in with glow */
        .to(logo, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          ease: "back.out(1.4)",
        }, 0)
        /* Headline zooms into focus */
        .to(headline, {
          scale: 1,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 0.8,
          ease: "power3.out",
        }, 0.1)
        /* Characters stagger in with slight random delay */
        .to(
          chars,
          {
            autoAlpha: 1,
            stagger: { each: 0.02, from: "random" },
            duration: 0.5,
            ease: "power2.out",
          },
          0.2,
        )
        /* Body + CTAs fade in after headline settles */
        .to(body, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.5)
        .to(ctas, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, 0.7);

      return () => {
        split.revert();
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
