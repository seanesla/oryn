"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import type { SessionArtifacts } from "@/lib/contracts";

import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";

export function EpistemicContractPanel({ session }: { session: SessionArtifacts }) {
  const shouldReduceMotion = useReducedMotion();
  const unsupported = session.epistemic.unsupportedClaims;
  const cards = session.evidenceCards.length;
  const citations = session.epistemic.citationsUsed;

  const blocked = cards === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">Epistemic Contract</div>
          <div className="mt-1 text-xs text-[color:var(--muted-fg)]">No unsupported factual claims.</div>
        </div>
        <Badge variant="status" tone={blocked ? "warn" : "good"}>
          {blocked ? "Evidence pending" : "Enforced"}
        </Badge>
      </div>

      <AnimatePresence initial={false}>
        {blocked ? (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--bad)_10%,var(--card))] p-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--fg)]">
              <AlertTriangle className="h-4 w-4 text-[color:var(--bad)]" />
              Evidence required. Narrow the claim.
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted-fg)]">
              Until at least one evidence card exists, the agent must answer “unknown” and ask for clarification.
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Divider />

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] px-3 py-2">
          <div className="text-[11px] text-[color:var(--muted-fg)]">Unsupported claims</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={unsupported}
              className="mt-1 text-sm font-semibold text-[color:var(--fg)]"
              initial={shouldReduceMotion ? false : { opacity: 0.6, y: 4 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {unsupported}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] px-3 py-2">
          <div className="text-[11px] text-[color:var(--muted-fg)]">Evidence cards</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={cards}
              className="mt-1 text-sm font-semibold text-[color:var(--fg)]"
              initial={shouldReduceMotion ? false : { opacity: 0.6, y: 4 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {cards}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] px-3 py-2">
          <div className="text-[11px] text-[color:var(--muted-fg)]">Citations used</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={citations}
              className="mt-1 text-sm font-semibold text-[color:var(--fg)]"
              initial={shouldReduceMotion ? false : { opacity: 0.6, y: 4 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {citations}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Divider />

      <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3 text-xs text-[color:var(--muted-fg)]">
        Rule: a spoken factual claim must reference an evidence card. Evidence cards must include at least one quote and a source URL.
      </div>
    </div>
  );
}
