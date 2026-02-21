"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { TooltipProvider } from "@/components/ui/Tooltip";
import { enterTransition } from "@/lib/motion";

import { LandingIntro } from "@/components/landing/LandingIntro";
import { LandingDotNav } from "@/components/landing/LandingDotNav";
import { LandingStickyBackgroundStage } from "@/components/landing/LandingStickyBackgroundStage";
import { GsapLenisProvider } from "@/components/landing/GsapLenisProvider";
import { AnimatedBackground } from "@/components/shell/AnimatedBackground";
import { LeftNav } from "@/components/shell/LeftNav";
import { TopBar } from "@/components/shell/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isLanding = pathname === "/";
  const [introComplete, setIntroComplete] = useState(!isLanding || Boolean(shouldReduceMotion));
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);

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

  const shellContent = (
    <div className="relative z-10">
      {!isLanding ? <TopBar /> : null}
      {isLanding ? <LandingDotNav /> : null}
      {isLanding ? (
        <main className="relative w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={enterTransition(Boolean(shouldReduceMotion))}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      ) : (
        <div className="mx-auto flex w-full max-w-[1600px] gap-0 px-3 pb-10 pt-14 sm:px-6">
          <LeftNav />
          <main className="relative min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 6, filter: "blur(8px)" }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -3, filter: "blur(4px)" }}
                transition={enterTransition(Boolean(shouldReduceMotion))}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <div className={isLanding ? "app-bg app-bg-dynamic app-bg-landing-page" : "app-bg app-bg-dynamic"}>
        {!isLanding ? <AnimatedBackground /> : null}
        {isLanding ? <LandingStickyBackgroundStage /> : null}
        {isLanding && !introComplete ? (
          <LandingIntro onComplete={handleIntroComplete} />
        ) : null}
        {isLanding && !shouldReduceMotion ? <GsapLenisProvider>{shellContent}</GsapLenisProvider> : shellContent}
      </div>
    </TooltipProvider>
  );
}
