"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Clock, GitBranch, List } from "lucide-react";

import type { SessionArtifacts } from "@/lib/contracts";
import { cn } from "@/lib/cn";

import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

function fmt(ms: number) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function TracePanel({ session }: { session: SessionArtifacts }) {
  const shouldReduceMotion = useReducedMotion();
  const toolCalls = session.trace.toolCalls;

  const cardRefs = useMemo(() => {
    const out: Array<{ cardId: string; claim: string; toolCallIds: Array<string> }> = [];
    for (const c of session.evidenceCards) {
      out.push({
        cardId: c.id,
        claim: c.claimText,
        toolCallIds: session.trace.cardInputs[c.id]?.toolCallIds ?? c.traceRef?.toolCallIds ?? [],
      });
    }
    return out;
  }, [session.evidenceCards, session.trace.cardInputs]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">Retrieval Trace</div>
          <div className="mt-1 text-xs text-[color:var(--muted-fg)]">Tool calls, constraints, and why sources were selected.</div>
        </div>
        <Badge variant="counter" tone="accent">{toolCalls.length}</Badge>
      </div>

      <Tabs defaultValue="simple">
        <TabsList>
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="verbose">Verbose</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="mt-4">
          <div className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
            {toolCalls.map((t, index) => (
              <motion.div
                layout
                key={`${t.id}-${index}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8, filter: "blur(8px)" }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(5px)" }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, delay: index * 0.035 }}
                className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-[color:var(--fg)]">{t.queryText}</div>
                  <div className="flex items-center gap-1 text-[11px] text-[color:var(--muted-fg)]">
                    <Clock className="h-3.5 w-3.5" />
                    {fmt(t.timestampMs)}
                  </div>
                </div>
                <div className="mt-2 text-xs text-[color:var(--muted-fg)]">
                  results: <span className="text-[color:var(--fg)]">{t.resultsCount}</span> · selected: <span className="text-[color:var(--fg)]">{t.selectedSourceDomains.join(", ")}</span>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>

            {toolCalls.length === 0 ? (
              <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3 text-sm text-[color:var(--muted-fg)]">
                Waiting on trace events…
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="verbose" className="mt-4">
          <div className="space-y-3">
            <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[color:var(--muted-fg)]">
                <List className="h-4 w-4" />
                Tool calls
              </div>
              <Divider className="my-3" />
              <div className="space-y-2">
                {toolCalls.map((t, index) => (
                  <div key={`${t.id}-${index}`} className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_90%,transparent)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-[color:var(--fg)]">{t.queryText}</div>
                      <div className="text-[11px] text-[color:var(--muted-fg)]">{fmt(t.timestampMs)}</div>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs">
                      <div className="text-[color:var(--muted-fg)]">constraints</div>
                      <div className="flex flex-wrap gap-2">
                        {t.constraintsApplied.map((c, idx) => (
                          <span key={idx} className={cn(
                            "rounded-[calc(var(--radius-sm)-2px)] border border-[color:var(--border)]",
                            "bg-[color:color-mix(in_oklab,var(--card)_92%,transparent)] px-2 py-1 text-[11px] text-[color:var(--fg)]"
                          )}>
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="text-[color:var(--muted-fg)]">results</div>
                      <div className="text-[color:var(--fg)]">{t.resultsCount}</div>
                      <div className="text-[color:var(--muted-fg)]">selected + why</div>
                      <div className="text-[color:var(--fg)]">{t.selectedSourceDomains.join(", ")}</div>
                      <div className="text-[color:var(--muted-fg)]">{t.selectionWhy}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[color:var(--muted-fg)]">
                <GitBranch className="h-4 w-4" />
                Evidence-card inputs
              </div>
              <Divider className="my-3" />
              <div className="space-y-2">
                {cardRefs.map((c) => (
                  <div key={c.cardId} className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_90%,transparent)] p-3">
                    <div className="line-clamp-2 text-sm font-semibold text-[color:var(--fg)]">{c.claim}</div>
                    <div className="mt-2 text-xs text-[color:var(--muted-fg)]">
                      tool calls: <span className="text-[color:var(--fg)]">{c.toolCallIds.join(", ") || "(none)"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
