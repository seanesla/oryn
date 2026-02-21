"use client";

import { useEffect } from "react";

import { motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ChoiceSetPanel } from "@/components/choice/ChoiceSetPanel";
import { EvidenceCardsPanel } from "@/components/evidence/EvidenceCardsPanel";
import { LiveAudioConsole } from "@/components/session/LiveAudioConsole";
import { DetailDrawer } from "@/components/session/DetailDrawer";
import { enterTransition } from "@/lib/motion";
import { useSessionRuntime } from "@/lib/useSessionRuntime";
import { cn } from "@/lib/cn";

/* ── Pipeline stepper ── */

type StepState = "pending" | "active" | "done";

function PipelineStepper({
  content,
  claims,
  evidence,
}: {
  content: boolean;
  claims: boolean;
  evidence: boolean; // true = still building
}) {
  const steps: Array<{ label: string; state: StepState }> = [
    { label: "Content", state: content ? "done" : "active" },
    { label: "Claims", state: claims ? "done" : content ? "active" : "pending" },
    {
      label: "Evidence",
      state: !evidence && claims ? "done" : claims ? "active" : "pending",
    },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-0">
          {/* Step circle + label */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300",
                step.state === "done"
                  ? "bg-[color:var(--good)] text-[color:var(--bg)]"
                  : step.state === "active"
                    ? "bg-[color:color-mix(in_oklab,var(--accent)_24%,var(--surface-2))] text-[color:var(--accent)] ring-1 ring-[color:color-mix(in_oklab,var(--accent)_40%,transparent)]"
                    : "bg-[color:var(--surface-3)] text-[color:var(--muted-fg)]"
              )}
            >
              {step.state === "done" ? (
                <Check className="h-3 w-3" />
              ) : step.state === "active" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                step.state === "done"
                  ? "text-[color:var(--fg)]"
                  : step.state === "active"
                    ? "text-[color:var(--accent)]"
                    : "text-[color:var(--muted-fg)]"
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 ? (
            <div
              className={cn(
                "mx-2 h-px w-6 transition-colors duration-300",
                steps[i + 1]!.state !== "pending"
                  ? "bg-[color:color-mix(in_oklab,var(--accent)_40%,var(--border))]"
                  : "bg-[color:var(--border)]"
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function SessionClient({ sessionId }: { sessionId: string }) {
  const { runtime, actions } = useSessionRuntime(sessionId);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!runtime.state) return;
    if (runtime.state.pipeline.evidenceBuilding) return;
    if (runtime.state.evidenceCards.length > 0) return;
    actions.startAnalysis();
  }, [actions, runtime.state]);

  const s = runtime.state;

  if (runtime.isBooting) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8">
        <div className="panel-elevated rounded-[0.82rem] p-5 text-sm text-[color:var(--muted-fg)]">Loading session…</div>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8">
        <div className="panel-elevated rounded-[0.82rem] p-5 text-sm text-[color:var(--fg)]">Session not found.</div>
      </div>
    );
  }

  const title = s.title ?? (s.url ? "Untitled" : "Claim check");
  const subtitle = s.domain ?? (s.url ? s.url : "No URL");

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1600px] px-3 pb-10 pt-6 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* Title + subtitle */}
        <motion.div
          className="min-w-0"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--muted-fg)]">Active Session</div>
          <h1 className="mt-1 truncate font-serif text-[clamp(1.3rem,2.6vw,1.9rem)] leading-tight tracking-[-0.02em]">
            {title}
          </h1>
          <div className="mt-0.5 truncate text-xs text-[color:var(--muted-fg)]">{subtitle}</div>
        </motion.div>

        {/* Pipeline stepper + Detail Drawer */}
        <motion.div
          className="flex flex-wrap items-center gap-4"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <PipelineStepper
            content={s.pipeline.contentExtracted}
            claims={s.pipeline.claimsExtracted}
            evidence={s.pipeline.evidenceBuilding}
          />
          <DetailDrawer session={s} />
        </motion.div>
      </div>

      {/* Mobile: 2 tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="talk">
          <TabsList className="w-full justify-between">
            <TabsTrigger value="talk" className="flex-1">Talk</TabsTrigger>
            <TabsTrigger value="evidence" className="flex-1">Evidence</TabsTrigger>
          </TabsList>
          <TabsContent value="talk" className="mt-4">
            <LiveAudioConsole session={s} />
          </TabsContent>
          <TabsContent value="evidence" className="mt-4 space-y-4">
            <EvidenceCardsPanel session={s} actions={actions} />
            <ChoiceSetPanel session={s} actions={actions} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: 2-column */}
      <div className="hidden lg:grid lg:grid-cols-[380px_minmax(560px,1fr)] lg:gap-5">
        <motion.div
          className="space-y-2"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(8px)"}}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={enterTransition(Boolean(shouldReduceMotion), 0)}
        >
          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Conversation</div>
          <LiveAudioConsole session={s} />
        </motion.div>

        <motion.div
          className="space-y-4"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={enterTransition(Boolean(shouldReduceMotion), 0.06)}
        >
          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Primary Evidence</div>
          <div className="panel-elevated rounded-[0.9rem] p-1">
            <EvidenceCardsPanel session={s} actions={actions} />
          </div>
          <ChoiceSetPanel session={s} actions={actions} />
        </motion.div>
      </div>
    </div>
  );
}
