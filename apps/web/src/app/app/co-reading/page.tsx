"use client";

import { motion } from "motion/react";

import { ClaimTicker } from "@/components/home/ClaimTicker";
import { RecentSessionCards } from "@/components/home/RecentSessionCards";
import { SessionSetupPanel } from "@/components/session/SessionSetupPanel";

export default function AppHomePage() {
  return (
    <div className="relative z-10 w-full pb-20 pt-10 sm:pt-14">
      {/* ── Full-width headline (highest visual priority) ── */}
      <motion.div
        className="mb-7 px-5 sm:px-8"
        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-[-0.035em]">
          Paste a URL to find where{" "}
          <span className="text-gradient-shimmer">sources disagree.</span>
        </h1>
        <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
          Oryn extracts claims, surfaces counter-evidence, and gives you three
          deliberate next reads — no feed, no rabbit hole.
        </p>
      </motion.div>

      {/* ── Ambient claim ticker (decorative, desktop-only) ── */}
      <motion.div
        className="mb-8 px-5 sm:px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.7 }}
      >
        <ClaimTicker />
      </motion.div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_380px] lg:gap-10 xl:gap-12">
        {/* LEFT: session setup (primary action) */}
        <motion.div
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <SessionSetupPanel />
        </motion.div>

        {/* RIGHT: recent sessions sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:border-l lg:border-[color:var(--border-soft)] lg:pl-10 xl:pl-12"
        >
          <RecentSessionCards />
        </motion.div>
      </div>
    </div>
  );
}
