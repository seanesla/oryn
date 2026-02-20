"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * LandingIntro — grand page-load animation for the Oryn landing page.
 *
 * Sequence:
 *   1. SVG stroke-draw: outer ring draws clockwise, inner rings stagger in.
 *   2. Gradient fill: the lens shape "lights up".
 *   3. Wordmark: "ORYN" chars stagger upward with spring ease.
 *   4. Hold: glow pulse.
 *   5. Exit: outer ring scales outward (SVG attribute animation via anime.js),
 *      overlay fades to transparent — galaxy explodes into view.
 *
 * Uses anime.js v4 for all SVG animations. Framer Motion handles the
 * overlay mount/unmount lifecycle.
 */

export function LandingIntro({ onComplete }: { onComplete: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  /* Skip entirely for reduced-motion users */
  const [done, setDone] = useState(Boolean(shouldReduceMotion));

  const finish = useCallback(() => {
    setDone(true);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (done || hasRun.current) return;
    hasRun.current = true;

    /* Dynamic import keeps anime.js out of the critical bundle for
       non-landing routes (it's only ~17 KB but still good practice). */
    let cancelled = false;

    (async () => {
      const { createTimeline, stagger, svg, utils } = await import("animejs");

      if (cancelled) return;

      const overlay = overlayRef.current;
      if (!overlay) {
        finish();
        return;
      }

      /* ── Gather SVG targets ── */
      const outerRing = overlay.querySelector<SVGEllipseElement>("#intro-outer-ring");
      const lensLeft = overlay.querySelector<SVGEllipseElement>("#intro-lens-left");
      const lensRight = overlay.querySelector<SVGEllipseElement>("#intro-lens-right");
      const lensFill = overlay.querySelector<SVGEllipseElement>("#intro-lens-fill");
      const wordmark = overlay.querySelector<HTMLElement>("[data-intro-wordmark]");
      const chars = overlay.querySelectorAll<HTMLSpanElement>("[data-intro-char]");
      const glow = overlay.querySelector<HTMLElement>("[data-intro-glow]");

      if (!outerRing || !lensLeft || !lensRight || !lensFill || !wordmark || !glow) {
        finish();
        return;
      }

      /* ── Initial state ── */
      utils.set(lensFill, { opacity: 0 });
      utils.set(glow, { opacity: 0 });
      utils.set(chars, { opacity: 0, translateY: 20 });

      /* Create drawables for stroke animation */
      const outerDrawable = svg.createDrawable(outerRing);
      const leftDrawable = svg.createDrawable(lensLeft);
      const rightDrawable = svg.createDrawable(lensRight);

      /* ── Build master timeline ── */
      const tl = createTimeline({
        autoplay: false,
        defaults: { ease: "outQuart" },
      });

      /* Phase 1 — Stroke draw (~1s) */
      tl.add(outerDrawable, {
        draw: ["0 0", "0 1"],
        duration: 900,
        ease: "inOutQuart",
      }, 0);

      tl.add(leftDrawable, {
        draw: ["0 0", "0 1"],
        duration: 700,
        ease: "inOutCubic",
      }, 200);

      tl.add(rightDrawable, {
        draw: ["0 0", "0 1"],
        duration: 700,
        ease: "inOutCubic",
      }, 300);

      /* Phase 2 — Fill lights up (~0.5s) */
      tl.add(lensFill, {
        opacity: [0, 1],
        duration: 450,
        ease: "inOutSine",
      }, 750);

      /* Glow pulse */
      tl.add(glow, {
        opacity: [0, 1],
        duration: 600,
        ease: "inOutSine",
      }, 800);

      /* Phase 3 — Wordmark chars stagger in (~0.4s) */
      tl.add(chars, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        ease: "outBack(3)",
        delay: stagger(60),
      }, 1000);

      /* Phase 4 — Hold (just let the timeline breathe) */
      /* We add a dummy tween to extend the timeline by the hold duration */
      tl.add(glow, {
        opacity: 1,
        duration: 600,
      }, 1500);

      /* Phase 5 — Exit */
      /* Wordmark fades out */
      tl.add(chars, {
        opacity: [1, 0],
        translateY: [0, -10],
        duration: 250,
        ease: "inQuad",
        delay: stagger(20),
      }, 2100);

      /* Inner shapes fade */
      tl.add([lensFill, leftDrawable, rightDrawable], {
        opacity: [1, 0],
        duration: 400,
        ease: "inQuad",
      }, 2200);

      /* Glow fades */
      tl.add(glow, {
        opacity: [1, 0],
        duration: 400,
        ease: "inQuad",
      }, 2200);

      /* Outer ring expands outward — the hero moment */
      tl.add(outerRing, {
        scale: [1, 18],
        opacity: [1, 0],
        duration: 900,
        ease: "inQuart",
      }, 2300);

      /* Overlay background fades */
      tl.add(overlay, {
        backgroundColor: ["rgba(0,0,0,0.98)", "rgba(0,0,0,0)"],
        duration: 800,
        ease: "inCubic",
        onComplete: () => {
          if (!cancelled) finish();
        },
      }, 2400);

      tl.play();
    })();

    return () => {
      cancelled = true;
    };
  }, [done, finish]);

  if (done) return null;

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="landing-intro-overlay"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-auto"
        >
          <div
            ref={overlayRef}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.98)" }}
          >
            {/* ── Inlined SVG logo (targetable by anime.js) ── */}
            <div className="relative flex items-center justify-center">
              {/* Glow aura behind the logo */}
              <div
                data-intro-glow
                className="absolute h-[280px] w-[280px] rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(37,99,235,0.2) 40%, transparent 70%)",
                  filter: "blur(30px)",
                  opacity: 0,
                }}
              />

              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 497.78 493.664"
                className="relative h-[140px] w-[140px]"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <linearGradient
                    id="intro-grad-fill"
                    x1="248.89" x2="248.89"
                    y1="111.43" y2="382.234"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#67e8f9" />
                    <stop offset=".35" stopColor="#2563eb" />
                    <stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient
                    id="intro-grad-ring"
                    x1="248.89" x2="248.89"
                    y1="3.698" y2="489.966"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#a855f7" />
                    <stop offset=".5" stopColor="#2563eb" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                  <clipPath id="intro-clip-lens" clipPathUnits="userSpaceOnUse">
                    <ellipse cx="335.978" cy="246.832" rx="131.559" ry="135.402" />
                  </clipPath>
                </defs>

                {/* Outer ring — stroke-drawn first */}
                <ellipse
                  id="intro-outer-ring"
                  cx="248.89" cy="246.832"
                  rx="246.551" ry="243.134"
                  fill="none"
                  stroke="url(#intro-grad-ring)"
                  strokeWidth="4"
                  style={{ transformOrigin: "248.89px 246.832px" }}
                />

                {/* Lens fill — faded in during Phase 2 */}
                <ellipse
                  id="intro-lens-fill"
                  cx="161.802" cy="246.832"
                  rx="131.559" ry="135.402"
                  fill="url(#intro-grad-fill)"
                  clipPath="url(#intro-clip-lens)"
                  opacity={0}
                />

                {/* Left inner ring */}
                <ellipse
                  id="intro-lens-left"
                  cx="161.802" cy="246.832"
                  rx="131.559" ry="135.402"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="4.785"
                />

                {/* Right inner ring */}
                <ellipse
                  id="intro-lens-right"
                  cx="335.978" cy="246.832"
                  rx="131.559" ry="135.402"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="4.785"
                />
              </svg>
            </div>

            {/* ── Wordmark ── */}
            <div
              data-intro-wordmark
              className="mt-6 flex items-center gap-[0.12em] font-serif text-[2.6rem] tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {"oryn".split("").map((char, i) => (
                <span
                  key={i}
                  data-intro-char
                  className="inline-block"
                  style={{ opacity: 0, transform: "translateY(20px)" }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
