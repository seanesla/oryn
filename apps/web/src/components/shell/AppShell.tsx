"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { TooltipProvider } from "@/components/ui/Tooltip";
import { enterTransition } from "@/lib/motion";

import { AnimatedBackground } from "@/components/shell/AnimatedBackground";
import { LeftNav } from "@/components/shell/LeftNav";
import { TopBar } from "@/components/shell/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isLanding = pathname === "/";
  const hideRail = isLanding;

  return (
    <TooltipProvider>
      <div className="app-bg app-bg-dynamic">
        <AnimatedBackground landingMode={isLanding} />
        <div className="relative z-10">
          {!isLanding ? <TopBar /> : null}
          <div
            className={
              isLanding
                ? "mx-auto w-full max-w-[1600px] px-3 pb-10 pt-4 sm:px-6 sm:pt-6"
                : "mx-auto flex w-full max-w-[1600px] gap-0 px-3 pb-10 pt-14 sm:px-6"
            }
          >
            {!hideRail ? <LeftNav /> : null}
            <main className="min-w-0 flex-1">
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
        </div>
      </div>
    </TooltipProvider>
  );
}
