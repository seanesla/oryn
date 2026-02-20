"use client";

import { useRef } from "react";
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

      const headline = sectionRef.current.querySelector<HTMLElement>("[data-closing-headline]");
      const body = sectionRef.current.querySelector<HTMLElement>("[data-closing-body]");
      const ctas = sectionRef.current.querySelector<HTMLElement>("[data-closing-ctas]");

      if (!headline || !body || !ctas) return;

      /* SplitText — character-level for the dramatic scale reveal */
      const split = new SplitText(headline, { type: "chars" });
      const chars = (split.chars ?? []) as HTMLElement[];

      /* Initial state: headline huge + blurred, body/ctas hidden */
      gsap.set(headline, {
        scale: 1.8,
        autoAlpha: 0,
        filter: "blur(14px)",
        transformOrigin: "50% 50%",
      });
      gsap.set(chars, { autoAlpha: 0 });
      gsap.set(body, { autoAlpha: 0, y: 24 });
      gsap.set(ctas, { autoAlpha: 0, y: 18 });

      /* Trigger-based: play when entering viewport, reverse when leaving */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      tl
        /* Headline zooms into focus */
        .to(headline, {
          scale: 1,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 1.1,
          ease: "power3.out",
        })
        /* Characters stagger in with slight random delay */
        .to(
          chars,
          {
            autoAlpha: 1,
            stagger: { each: 0.02, from: "random" },
            duration: 0.6,
            ease: "power2.out",
          },
          0.15,
        )
        /* Body + CTAs fade in after headline settles */
        .to(body, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.55)
        .to(ctas, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.7);

      return () => {
        split.revert();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[60vh] flex-col items-center justify-center px-4 py-28 sm:px-6 lg:px-10"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
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
    </section>
  );
}
