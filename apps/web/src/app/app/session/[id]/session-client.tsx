"use client";

import { useEffect } from "react";

import { motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ChoiceSetPanel } from "@/components/choice/ChoiceSetPanel";
import { EvidenceCardsPanel } from "@/components/evidence/EvidenceCardsPanel";
import { LiveAudioConsole } from "@/components/session/LiveAudioConsole";
import { DetailDrawer } from "@/components/session/DetailDrawer";
import { enterTransition } from "@/lib/motion";
import { useSessionRuntime } from "@/lib/useSessionRuntime";

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
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="panel-elevated min-w-0 rounded-[0.82rem] p-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Active Session</div>
          <div className="mt-1 truncate font-serif text-[clamp(1.3rem,2.6vw,1.9rem)] leading-tight tracking-[-0.02em]">
            {title}
          </div>
          <div className="mt-1 truncate text-xs text-[color:var(--muted-fg)]">{subtitle}</div>
        </div>
        <div className="panel-muted flex flex-wrap items-center gap-2 rounded-[0.7rem] p-2">
          <motion.div layout transition={{ duration: 0.2 }}>
            <Badge tone={s.pipeline.contentExtracted ? "good" : "neutral"}>
              Content {s.pipeline.contentExtracted ? "extracted" : "pending"}
            </Badge>
          </motion.div>
          <motion.div layout transition={{ duration: 0.2 }}>
            <Badge tone={s.pipeline.claimsExtracted ? "good" : "neutral"}>
              Claims {s.pipeline.claimsExtracted ? "extracted" : "pending"}
            </Badge>
          </motion.div>
          <motion.div
            layout
            animate={
              shouldReduceMotion
                ? undefined
                : s.pipeline.evidenceBuilding
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
            }
            transition={{ duration: 0.35 }}
          >
            <Badge tone={s.pipeline.evidenceBuilding ? "warn" : "good"}>
              Evidence {s.pipeline.evidenceBuilding ? "building" : "ready"}
            </Badge>
          </motion.div>
          <DetailDrawer session={s} />
        </div>
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
      <div className="hidden lg:grid lg:grid-cols-[320px_minmax(560px,1fr)] lg:gap-4">
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
