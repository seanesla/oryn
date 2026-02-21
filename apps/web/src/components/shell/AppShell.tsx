"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { TooltipProvider } from "@/components/ui/Tooltip";
import {
  enterTransition,
  crossBoundaryTransition,
  crossBoundaryExitTransition,
} from "@/lib/motion";
import { markIntroSeen } from "@/lib/intro-state";

import { LandingIntro } from "@/components/landing/LandingIntro";
import { LandingDotNav } from "@/components/landing/LandingDotNav";
import { LandingStickyBackgroundStage } from "@/components/landing/LandingStickyBackgroundStage";
import { GsapLenisProvider } from "@/components/landing/GsapLenisProvider";
import { FallingPattern } from "@/components/ui/falling-pattern";
import { NavRail } from "@/components/shell/NavRail";
import { MobileNavPill } from "@/components/shell/MobileNavPill";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = Boolean(shouldReduceMotion);
  const isLanding = pathname === "/";
  const zone = isLanding ? "landing" : "app";

  const [introComplete, setIntroComplete] = useState(
    !isLanding || reduceMotion
  );
  const handleIntroComplete = useCallback(() => {
    markIntroSeen();
    setIntroComplete(true);
  }, []);

  /* ── Zone transition variants ───────────────────────────────────────
   *
   * The animation is split into two layers so that `filter: blur()`
   * (which creates a CSS containing block) never lives on the same
   * element as position:fixed children.
   *
   *   outer  →  clipPath + opacity   (safe for position:fixed)
   *   inner  →  filter: blur()       (only wraps scrollable page content)
   *
   * All position:fixed elements (backgrounds, NavRail, MobileNavPill,
   * LandingDotNav) live in the outer layer.  The inner layer only
   * contains <main> page content — no position:fixed descendants — so
   * the persistent `filter: blur(0px)` inline style that Framer Motion
   * leaves behind is harmless.
   *
   * Both layers use variant propagation: parent labels cascade to the
   * child automatically — no explicit initial/animate/exit needed on
   * the inner div.
   * ─────────────────────────────────────────────────────────────────── */

  const zoneVariants = useMemo(() => {
    if (reduceMotion) {
      return {
        hidden: {},
        visible: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0 } },
      };
    }
    return {
      hidden: { opacity: 0, clipPath: "inset(3% round 24px)" },
      visible: {
        opacity: 1,
        clipPath: "inset(0% round 0px)",
        transition: crossBoundaryTransition(false),
      },
      exit: {
        opacity: 0,
        clipPath: "inset(2% round 16px)",
        transition: crossBoundaryExitTransition(false),
      },
    };
  }, [reduceMotion]);

  const contentVariants = useMemo(() => {
    if (reduceMotion) {
      return { hidden: {}, visible: {}, exit: {} };
    }
    return {
      hidden: { filter: "blur(12px)" },
      visible: {
        filter: "blur(0px)",
        transition: crossBoundaryTransition(false),
      },
      exit: {
        filter: "blur(12px)",
        transition: crossBoundaryExitTransition(false),
      },
    };
  }, [reduceMotion]);

  // Lock body scroll while the intro animation is playing so the user
  // cannot scroll through the landing page behind the overlay.
  useEffect(() => {
    if (!isLanding || introComplete) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLanding, introComplete]);

  // On page load / refresh, disable the browser's automatic scroll
  // restoration and force scroll back to the top. Without this the
  // browser remembers the previous scroll offset and restores it.
  useEffect(() => {
    if (!isLanding) return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, [isLanding]);

  /* ── Inner page-level transitions (within the same zone) ──────────── */

  const pageContent = isLanding ? (
    <main className="relative z-10 w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={enterTransition(reduceMotion)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
  ) : (
    <div className="relative z-10 mx-auto flex w-full max-w-[1600px] gap-0 px-3 pb-24 pt-4 md:pb-10 md:pl-20 sm:px-6">
      <main className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 6, filter: "blur(8px)" }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3, filter: "blur(4px)" }}
            transition={enterTransition(reduceMotion)}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );

  /* ── Outer zone-level transition (landing ↔ app) ─────────────────── */

  return (
    <TooltipProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={zone}
          className={
            isLanding
              ? "app-bg app-bg-dynamic app-bg-landing-page"
              : "app-bg app-bg-inner"
          }
          variants={zoneVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* ── Fixed-position backgrounds ──────────────────────────
           *  Outside the blur layer — clipPath + opacity on the
           *  outer wrapper do NOT create a containing block, so
           *  position:fixed children stay viewport-relative.
           * ───────────────────────────────────────────────────────── */}
          {!isLanding ? (
            <>
              <div className="pointer-events-none fixed inset-0 z-0">
                <FallingPattern
                  className="h-full [mask-image:radial-gradient(ellipse_at_center,transparent,var(--bg))]"
                />
              </div>
              {/* Dark scrim — dims the app-page background ~50% */}
              <div className="pointer-events-none fixed inset-0 z-[1] bg-black/35" />
            </>
          ) : null}
          {isLanding ? <LandingStickyBackgroundStage /> : null}
          {isLanding && !introComplete ? (
            <LandingIntro onComplete={handleIntroComplete} />
          ) : null}

          {/* ── Fixed-position navigation ───────────────────────────
           *  Also outside the blur layer so position:fixed + z-50
           *  keeps them viewport-relative and above all content.
           * ───────────────────────────────────────────────────────── */}
          {!isLanding ? <NavRail /> : null}
          {!isLanding ? <MobileNavPill /> : null}
          {isLanding ? <LandingDotNav /> : null}

          {/* ── Content layer (blur isolated here) ──────────────────
           *  filter:blur() only wraps scrollable <main> content.
           *  No position:fixed descendants live inside this wrapper,
           *  so the persistent blur(0px) inline style is harmless.
           *  Variant label is inherited from the parent motion.div.
           * ───────────────────────────────────────────────────────── */}
          <motion.div
            className="relative min-h-screen"
            variants={contentVariants}
          >
            {isLanding && !shouldReduceMotion ? (
              <GsapLenisProvider>{pageContent}</GsapLenisProvider>
            ) : (
              pageContent
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
}
