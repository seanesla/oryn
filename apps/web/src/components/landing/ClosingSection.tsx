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

      // Pinned scrub — same pattern as every other section.
      //
      // Edge-case for the last section: because maxScroll === pinEnd,
      // GSAP can release the pin at the exact boundary (subpixel rounding,
      // Lenis lerp overshoot, End key). When that happens the section
      // repositions inside the pin-spacer and .pin-spacer overflow:hidden
      // clips it → "content vanishes then reappears" (the duplicate).
      //
      // Fix: onLeave immediately re-fixes the section to the viewport so
      // the release is invisible. onEnterBack clears the override so GSAP
      // can manage the pin normally when scrolling back up.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionEl,
          start: "top top",
          end: () => "+=" + window.innerHeight * 0.6,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onLeave: () => {
            // Pin just released — force section back to fixed so the
            // reposition inside pin-spacer is never visible.
            // IMPORTANT: also clear transform because GSAP applies a
            // translate() to position the element at its natural scroll
            // offset after pin release. Without clearing it, the fixed
            // section is shifted down and only the logo peeks into view.
            gsap.set(sectionEl, {
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              zIndex: 10,
              transform: "none",
            });
          },
          onEnterBack: () => {
            // Scrolling back into pin range — clear overrides so GSAP
            // can manage the pin normally.
            gsap.set(sectionEl, {
              clearProps: "position,top,left,width,zIndex,transform",
            });
          },
        },
      });

      /* ── Lead-in: pinned but calm ── */
      tl.to({}, { duration: 0.08 });
      tl.addLabel("in");

      /* ── Entrance ── */
      tl.to(
          logo,
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.25,
            ease: "back.out(1.4)",
          },
          "in",
        )
        .to(
          headline,
          {
            scale: 1,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.35,
            ease: "power3.out",
          },
          "in+=0.06",
        )
        .to(
          chars,
          {
            autoAlpha: 1,
            scale: 1,
            stagger: { each: 0.015, from: "random" },
            duration: 0.28,
            ease: "back.out(1.7)",
          },
          "in+=0.1",
        )
        .to(body, { autoAlpha: 1, y: 0, duration: 0.2, ease: "power3.out" }, "in+=0.4")
        .to(ctas, { autoAlpha: 1, y: 0, duration: 0.18, ease: "power3.out" }, "in+=0.52")

        /* ── Hold: content stays visible ── */
        .to({}, { duration: 0.28 });

      return () => {
        split.revert();
        // Clean up the forced fixed positioning if it was applied
        gsap.set(sectionEl, {
          clearProps: "position,top,left,width,zIndex,transform",
        });
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
