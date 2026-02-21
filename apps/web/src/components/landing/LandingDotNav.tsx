"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
} from "motion/react";
import { useLenis } from "lenis/react";

import { cn } from "@/lib/cn";
import { hasSeenIntro } from "@/lib/intro-state";

/* ─── Config ───────────────────────────────────────────────── */

/** Delay entrance so it syncs with the LandingIntro animation. */
const ENTRANCE_DELAY = 2.6;

/** Sections mapped to their `data-landing-scene` attribute values. */
const SECTIONS = [
  { scene: "hero", label: "Intro" },
  { scene: "features", label: "Features" },
  { scene: "how", label: "How It Works" },
  { scene: "use", label: "Use Cases" },
  { scene: "closing", label: "Get Started" },
] as const;

/** Spring config for the layoutId ring morph. */
const RING_SPRING = { type: "spring", stiffness: 340, damping: 28, mass: 0.7 } as const;

/** Ease curve matching the project's MOTION_EASE. */
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─── Hook: track which section is visible ─────────────────── */

/**
 * Determines the active section based on section top offsets.
 *
 * We use a "probe" line partway down the viewport so the active dot
 * doesn't flicker when you're near a boundary.
 */
function useActiveSection(): number {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    let raf = 0;

    const compute = () => {
      raf = 0;
      const probe = window.scrollY + window.innerHeight * 0.35;

      let next = 0;
      for (let i = 0; i < SECTIONS.length; i++) {
        const scene = SECTIONS[i].scene;
        const el = document.querySelector<HTMLElement>(
          `[data-landing-scene="${scene}"]`,
        );
        if (!el) continue;

        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= probe) next = i;
      }

      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
      }
    };

    const requestCompute = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(compute);
    };

    // Initial compute after layout.
    requestCompute();
    window.addEventListener("scroll", requestCompute, { passive: true });
    window.addEventListener("resize", requestCompute);

    return () => {
      window.removeEventListener("scroll", requestCompute);
      window.removeEventListener("resize", requestCompute);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return active;
}

/* ─── Individual dot ───────────────────────────────────────── */

function Dot({
  index,
  scene,
  label,
  isActive,
  reducedMotion,
  skipEntranceDelay,
}: {
  index: number;
  scene: string;
  label: string;
  isActive: boolean;
  reducedMotion: boolean;
  skipEntranceDelay: boolean;
}) {
  const lenis = useLenis();

  const scrollTo = useCallback(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-landing-scene="${scene}"]`
    );
    if (!el) return;

    // Prefer Lenis scrollTo so the snap system stays in sync.
    // Fall back to native scrollIntoView if Lenis isn't ready yet.
    if (lenis) {
      lenis.scrollTo(el);
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, [scene, lenis]);

  return (
    <motion.button
      onClick={scrollTo}
      className="group relative flex items-center justify-end"
      aria-label={`Scroll to ${label}`}
      // Staggered entrance
      initial={reducedMotion ? false : { opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: reducedMotion || skipEntranceDelay ? 0 : ENTRANCE_DELAY + index * 0.06,
        ease: EASE,
      }}
    >
      {/* ── Label: fades in to the left of the active dot ── */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            className={cn(
              "absolute right-full mr-3 whitespace-nowrap",
              "text-[11px] font-medium tracking-wide uppercase",
              "text-[color:var(--accent)]",
              "pointer-events-none select-none"
            )}
            initial={reducedMotion ? false : { opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* ── Dot container (fixed hit area) ── */}
      <div className="relative flex h-5 w-5 items-center justify-center">
        {/* Ring that morphs between dots via layoutId */}
        {isActive && (
          <motion.div
            layoutId="dot-ring"
            className="absolute inset-0 rounded-full border border-[color:var(--accent)]"
            style={{
              boxShadow: "0 0 10px color-mix(in oklab, var(--accent) 35%, transparent)",
            }}
            transition={RING_SPRING}
          />
        )}

        {/* Inner dot */}
        <motion.div
          className={cn(
            "rounded-full transition-colors duration-200",
            isActive
              ? "bg-[color:var(--accent)]"
              : "bg-[color:var(--muted-fg)] opacity-30 group-hover:opacity-60"
          )}
          animate={{
            width: isActive ? 8 : 6,
            height: isActive ? 8 : 6,
            boxShadow: isActive
              ? "0 0 14px color-mix(in oklab, var(--accent) 50%, transparent)"
              : "none",
          }}
          whileHover={!isActive ? { scale: 1.35 } : undefined}
          transition={RING_SPRING}
        />
      </div>
    </motion.button>
  );
}

/* ─── Main component ───────────────────────────────────────── */

export function LandingDotNav() {
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);
  const activeIndex = useActiveSection();

  /* Delay render until intro animation finishes.
     Skip the wait entirely when navigating back from /app — intro already played. */
  const skipDelay = reducedMotion || hasSeenIntro();
  const [visible, setVisible] = useState(skipDelay);
  useEffect(() => {
    if (skipDelay) return;
    const timer = setTimeout(() => setVisible(true), ENTRANCE_DELAY * 1000);
    return () => clearTimeout(timer);
  }, [skipDelay]);

  if (!visible) return null;

  return (
    <LayoutGroup>
      <nav
        aria-label="Page section navigation"
        className={cn(
          "fixed top-1/2 z-50 -translate-y-1/2",
          "flex flex-col items-end gap-5",
          // Desktop: right-6, mobile: shift inward slightly
          "right-4 sm:right-5 md:right-6"
        )}
      >
        {SECTIONS.map((section, i) => (
          <Dot
            key={section.scene}
            index={i}
            scene={section.scene}
            label={section.label}
            isActive={i === activeIndex}
            reducedMotion={reducedMotion}
            skipEntranceDelay={skipDelay}
          />
        ))}
      </nav>
    </LayoutGroup>
  );
}
