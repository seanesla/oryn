"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
} from "motion/react";

import { cn } from "@/lib/cn";
import { ScrollTrigger } from "@/lib/gsap";

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
 * Determines the active section from ScrollTrigger pin ranges rather
 * than `elementsFromPoint` hit-testing. This is immune to the layout
 * glitches that occur during GSAP pin/unpin transitions (which caused
 * the dot nav to briefly flicker to wrong sections during gaps).
 *
 * Rules:
 *  1. Scroll inside a pinned range → that section is active.
 *  2. Scroll before the first pin   → first section (hero).
 *  3. Scroll after the last pin     → last section.
 *  4. Scroll in a gap between pins  → the section we just left
 *     (keeps the previous section active until the next one pins).
 */
function useActiveSection(): number {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    let raf = 0;

    const compute = () => {
      raf = 0;
      const scroll = window.scrollY;

      // Build a sorted list of { sectionIndex, start, end } from all
      // pinned ScrollTriggers that belong to a landing scene.
      const ranges: Array<{ idx: number; start: number; end: number }> = [];
      for (const st of ScrollTrigger.getAll()) {
        if (!st.pin || !Number.isFinite(st.start) || !Number.isFinite(st.end))
          continue;
        const scene = (st.trigger as HTMLElement)?.getAttribute?.(
          "data-landing-scene",
        );
        if (!scene) continue;
        const idx = SECTIONS.findIndex((s) => s.scene === scene);
        if (idx === -1) continue;
        ranges.push({ idx, start: st.start, end: st.end });
      }

      ranges.sort((a, b) => a.start - b.start);

      // No triggers registered yet (intro still playing) — stay on hero.
      if (!ranges.length) return;

      let next = activeRef.current;

      // 1. Inside a pinned range → that section.
      for (const r of ranges) {
        if (scroll >= r.start && scroll <= r.end) {
          next = r.idx;
          break;
        }
      }

      // 2. Before the first section → first section.
      if (next === activeRef.current && scroll < ranges[0].start) {
        next = ranges[0].idx;
      }

      // 3. After the last section → last section.
      if (
        next === activeRef.current &&
        scroll > ranges[ranges.length - 1].end
      ) {
        next = ranges[ranges.length - 1].idx;
      }

      // 4. In a gap → keep the section we just left.
      //    (next is still activeRef.current — no change needed)

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
}: {
  index: number;
  scene: string;
  label: string;
  isActive: boolean;
  reducedMotion: boolean;
}) {
  const scrollTo = useCallback(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-landing-scene="${scene}"]`
    );
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [scene]);

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
        delay: reducedMotion ? 0 : ENTRANCE_DELAY + index * 0.06,
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

  /* Delay render until intro animation finishes. */
  const [visible, setVisible] = useState(reducedMotion);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => setVisible(true), ENTRANCE_DELAY * 1000);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

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
          />
        ))}
      </nav>
    </LayoutGroup>
  );
}
