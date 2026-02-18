"use client";

import { useEffect } from "react";

import { motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ChoiceSetPanel } from "@/components/choice/ChoiceSetPanel";
import { DisagreementMapPanel } from "@/components/map/DisagreementMapPanel";
import { EvidenceCardsPanel } from "@/components/evidence/EvidenceCardsPanel";
import { EpistemicContractPanel } from "@/components/contract/EpistemicContractPanel";
import { TracePanel } from "@/components/trace/TracePanel";
import { LiveAudioConsole } from "@/components/session/LiveAudioConsole";
import { enterTransition } from "@/lib/motion";
import { useMockSessionRuntime } from "@/lib/mockStream";

export function SessionClient({ sessionId }: { sessionId: string }) {
  const { runtime, actions } = useMockSessionRuntime(sessionId);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    actions.startAnalysis();
  }, [actions]);

  const s = runtime.state;

  if (runtime.isBooting) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8">
        <Card className="p-5 text-sm text-[color:var(--muted-fg)]">Loading session…</Card>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8">
        <Card className="p-5 text-sm text-[color:var(--fg)]">Session not found.</Card>
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
        </div>
      </div>

      {/* Mobile: tabbed */}
      <div className="lg:hidden">
        <Tabs defaultValue="talk">
          <TabsList className="w-full justify-between">
            <TabsTrigger value="talk" className="flex-1">Talk</TabsTrigger>
            <TabsTrigger value="evidence" className="flex-1">Evidence</TabsTrigger>
            <TabsTrigger value="next" className="flex-1">Next</TabsTrigger>
          </TabsList>
          <TabsContent value="talk" className="mt-4">
            <LiveAudioConsole session={s} actions={actions} />
          </TabsContent>
          <TabsContent value="evidence" className="mt-4">
            <EvidenceCardsPanel session={s} actions={actions} />
          </TabsContent>
          <TabsContent value="next" className="mt-4 space-y-4">
            <ChoiceSetPanel session={s} actions={actions} />
            <Card className="p-4">
              <Tabs defaultValue="map">
                <TabsList>
                  <TabsTrigger value="map">Map</TabsTrigger>
                  <TabsTrigger value="trace">Trace</TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                </TabsList>
                <TabsContent value="map" className="mt-4">
                  <DisagreementMapPanel session={s} />
                </TabsContent>
                <TabsContent value="trace" className="mt-4">
                  <TracePanel session={s} />
                </TabsContent>
                <TabsContent value="contract" className="mt-4">
                  <EpistemicContractPanel session={s} />
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: 3-column */}
      <div className="hidden lg:grid lg:grid-cols-[320px_minmax(560px,1fr)_360px] lg:gap-4">
        <motion.div
          className="space-y-2"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(8px)"}
          }
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={enterTransition(Boolean(shouldReduceMotion), 0)}
        >
          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Conversation</div>
          <LiveAudioConsole session={s} actions={actions} />
        </motion.div>

        <motion.div
          className="space-y-2"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={enterTransition(Boolean(shouldReduceMotion), 0.06)}
        >
          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Primary Evidence</div>
          <div className="panel-elevated rounded-[0.9rem] p-1">
            <EvidenceCardsPanel session={s} actions={actions} />
          </div>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={enterTransition(Boolean(shouldReduceMotion), 0.12)}
          className="space-y-4"
        >
          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Next Actions</div>
          <ChoiceSetPanel session={s} actions={actions} />

          <Card className="p-4">
            <Tabs defaultValue="map">
              <TabsList>
                <TabsTrigger value="map">Disagreement Map</TabsTrigger>
                <TabsTrigger value="trace">Trace</TabsTrigger>
                <TabsTrigger value="contract">Contract</TabsTrigger>
              </TabsList>
              <TabsContent value="map" className="mt-4">
                <DisagreementMapPanel session={s} />
              </TabsContent>
              <TabsContent value="trace" className="mt-4">
                <TracePanel session={s} />
              </TabsContent>
              <TabsContent value="contract" className="mt-4">
                <EpistemicContractPanel session={s} />
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
