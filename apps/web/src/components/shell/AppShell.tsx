"use client";

import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { TooltipProvider } from "@/components/ui/Tooltip";
import { enterTransition } from "@/lib/motion";

import { LandingStickyBackgroundStage } from "@/components/landing/LandingStickyBackgroundStage";
import { AnimatedBackground } from "@/components/shell/AnimatedBackground";
import { LeftNav } from "@/components/shell/LeftNav";
import { TopBar } from "@/components/shell/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isLanding = pathname === "/";

  return (
    <TooltipProvider>
      <div className={isLanding ? "app-bg app-bg-dynamic app-bg-landing-page" : "app-bg app-bg-dynamic"}>
        {isLanding && !shouldReduceMotion ? (
          <ReactLenis
            root
            options={{
              smoothWheel: true,
              lerp: 0.08,
              duration: 1.15,
              orientation: "vertical",
              gestureOrientation: "vertical",
              syncTouch: false,
            }}
          />
        ) : null}
        {!isLanding ? <AnimatedBackground /> : null}
        {isLanding ? <LandingStickyBackgroundStage /> : null}
        <div className="relative z-10">
          {!isLanding ? <TopBar /> : null}
          {isLanding ? (
            <main className="relative w-full">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={shouldReduceMotion ? false : { opacity: 0, filter: "blur(8px)" }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
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
      </div>
    </TooltipProvider>
  );
}
