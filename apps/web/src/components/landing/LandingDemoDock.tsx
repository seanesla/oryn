"use client";

import { useMemo } from "react";
import { useReducedMotion, motion } from "motion/react";

import type { SessionArtifacts, TranscriptChunk } from "@/lib/contracts";
import type { RuntimeActions } from "@/lib/runtimeTypes";
import { cn } from "@/lib/cn";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

import { ChoiceSetPanel } from "@/components/choice/ChoiceSetPanel";
import { EpistemicContractPanel } from "@/components/contract/EpistemicContractPanel";
import { EvidenceCardsPanel } from "@/components/evidence/EvidenceCardsPanel";
import { TracePanel } from "@/components/trace/TracePanel";

export type DockTabId = "transcript" | "evidence" | "trace" | "contract" | "next";

export function LandingDemoDock({
  session,
  actions,
  icon,
  label,
  title,
  subtitle,
  tabs,
  defaultTab,
  className,
}: {
  session: SessionArtifacts;
  actions: RuntimeActions;
  icon: React.ReactNode;
  label: string;
  title: string;
  subtitle?: string;
  tabs: Array<DockTabId>;
  defaultTab?: DockTabId;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const initial = defaultTab ?? tabs[0] ?? "evidence";
  const wsTone = session.wsState === "connected" ? "good" : session.wsState === "reconnecting" ? "warn" : "bad";

  const triggerLabel = (id: DockTabId) =>
    id === "transcript"
      ? "Transcript"
      : id === "evidence"
        ? "Evidence"
        : id === "trace"
          ? "Trace"
          : id === "contract"
            ? "Contract"
            : "Next";

  return (
    <div className={cn("relative", className)}>
      <div className="shine-card relative overflow-hidden rounded-[28px_10px_28px_10px] p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(120% 80% at 18% 0%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 60%), radial-gradient(120% 90% at 92% 12%, color-mix(in oklab, var(--accent-2) 10%, transparent), transparent 64%)",
          }}
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.65rem] border border-[color:color-mix(in_oklab,var(--accent)_22%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))] text-[color:var(--accent)]">
                {icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">
                  {label}
                </div>
                <div className="mt-1 truncate font-serif text-[1.05rem] leading-snug tracking-[-0.02em]">
                  {title}
                </div>
                {subtitle ? (
                  <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[color:var(--muted-fg)]">
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge tone="accent">Interactive demo</Badge>
              <div className="flex items-center gap-2">
                <Badge tone={wsTone}>{session.wsState}</Badge>
                <Badge tone="neutral">p50 {session.latencyMs.p50}ms</Badge>
              </div>
            </div>
          </div>

          <Tabs defaultValue={initial}>
            <TabsList className="mt-5 w-full justify-between">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t} className="flex-1">
                  {triggerLabel(t)}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-4">
              {tabs.includes("transcript") ? (
                <TabsContent value="transcript">
                  <ScrollArea className="h-[360px] sm:h-[420px]">
                    <TranscriptPreview session={session} reducedMotion={Boolean(shouldReduceMotion)} />
                  </ScrollArea>
                </TabsContent>
              ) : null}

              {tabs.includes("evidence") ? (
                <TabsContent value="evidence">
                  <ScrollArea className="h-[360px] sm:h-[420px]">
                    <div className="pr-2">
                      <EvidenceCardsPanel session={session} actions={actions} />
                    </div>
                  </ScrollArea>
                </TabsContent>
              ) : null}

              {tabs.includes("trace") ? (
                <TabsContent value="trace">
                  <ScrollArea className="h-[360px] sm:h-[420px]">
                    <div className="pr-2">
                      <Card className="p-4">
                        <TracePanel session={session} />
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              ) : null}

              {tabs.includes("contract") ? (
                <TabsContent value="contract">
                  <ScrollArea className="h-[360px] sm:h-[420px]">
                    <div className="pr-2">
                      <Card className="p-4">
                        <EpistemicContractPanel session={session} />
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              ) : null}

              {tabs.includes("next") ? (
                <TabsContent value="next">
                  <ScrollArea className="h-[360px] sm:h-[420px]">
                    <div className="pr-2">
                      <ChoiceSetPanel session={session} actions={actions} />
                    </div>
                  </ScrollArea>
                </TabsContent>
              ) : null}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function TranscriptPreview({
  session,
  reducedMotion,
}: {
  session: SessionArtifacts;
  reducedMotion: boolean;
}) {
  const items = useMemo(() => {
    const sorted = [...session.transcript].sort((a, b) => a.timestampMs - b.timestampMs);
    return sorted.slice(-10);
  }, [session.transcript]);

  const bubbleTone = (speaker: TranscriptChunk["speaker"]) => (speaker === "user" ? "accent" : "neutral");

  return (
    <div className="space-y-2 pr-2">
      {items.map((t, idx) => (
        <motion.div
          key={t.id}
          initial={reducedMotion ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1], delay: idx * 0.03 }}
          className={cn(
            "rounded-[0.7rem] border p-3",
            "border-[color:color-mix(in_oklab,var(--border)_68%,transparent)]",
            "bg-[color:color-mix(in_oklab,var(--surface-2)_26%,transparent)]"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Badge tone={bubbleTone(t.speaker)}>{t.speaker === "user" ? "You" : "Oryn"}</Badge>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-fg)] opacity-70">
              {t.isPartial ? "partial" : "final"}
            </div>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-[color:var(--fg)]">{t.text}</div>
        </motion.div>
      ))}

      {items.length === 0 ? (
        <div className="rounded-[0.7rem] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3 text-sm text-[color:var(--muted-fg)]">
          Transcript is empty.
        </div>
      ) : null}
    </div>
  );
}
