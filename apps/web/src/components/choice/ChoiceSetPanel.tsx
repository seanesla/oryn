"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { RefreshCcw, Sparkles, ExternalLink } from "lucide-react";

import type { SessionArtifacts } from "@/lib/contracts";
import type { MockRuntimeActions } from "@/lib/mockStream";
import { cn } from "@/lib/cn";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Slider } from "@/components/ui/Slider";

export function ChoiceSetPanel({
  session,
  actions,
}: {
  session: SessionArtifacts;
  actions: MockRuntimeActions;
}) {
  const shouldReduceMotion = useReducedMotion();
  const items = useMemo(() => session.choiceSet.slice(0, 3), [session.choiceSet]);
  const [dial, setDial] = useState(55);
  const [regenerating, setRegenerating] = useState(false);

  const dialLabel = dial < 40 ? "More credibility" : dial > 60 ? "More diversity" : "Balanced";

  async function handleRegenerate() {
    if (items.length !== 3 || regenerating) return;
    setRegenerating(true);
    await new Promise((resolve) => window.setTimeout(resolve, 320));
    actions.regenerateChoiceSet();
    await new Promise((resolve) => window.setTimeout(resolve, 380));
    setRegenerating(false);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">Next 3 Reads</div>
          <div className="mt-1 text-xs text-[color:var(--muted-fg)]">
            A deliberate choice set. Not a feed.
          </div>
        </div>
        <Badge tone="accent">
          <Sparkles className="h-3.5 w-3.5" />
          {items.length}/3
        </Badge>
      </div>

      <Divider className="my-4" />

      <div className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
        {items.map((i, idx) => (
          <motion.a
            layout
            key={`${i.id}-${i.reason}`}
            href={i.url}
            target="_blank"
            rel="noreferrer"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8, filter: "blur(8px)" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "block rounded-[var(--radius-sm)] border border-[color:var(--border)]",
              "bg-[color:color-mix(in_oklab,var(--card)_84%,transparent)] p-3",
              "transition hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="rounded-[calc(var(--radius-sm)-2px)] border border-[color:color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--card))] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--fg)]">
                    #{idx + 1}
                  </div>
                  <div className="truncate text-[11px] text-[color:var(--muted-fg)]">{i.domain}</div>
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.01em] text-[color:var(--fg)]">
                  {i.title}
                </div>
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--muted-fg)]" />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="accent">{i.frameLabel}</Badge>
              {i.opensMissingFrame ? <Badge tone="warn">opens a missing frame</Badge> : null}
              {i.isPrimarySource ? <Badge tone="good">primary source</Badge> : null}
            </div>

            <div className="mt-2 text-xs leading-relaxed text-[color:var(--muted-fg)]">{i.reason}</div>
          </motion.a>
        ))}
        </AnimatePresence>

        {items.length !== 3 ? (
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_84%,transparent)] p-3 text-sm text-[color:var(--muted-fg)]">
            Waiting on a complete choice set…
          </div>
        ) : null}
      </div>

      <Divider className="my-4" />

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-[color:var(--muted-fg)]">Regenerate with constraints</div>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={items.length !== 3 || regenerating}>
            <RefreshCcw className={cn("h-4 w-4", regenerating ? "animate-spin" : "")} />
            {regenerating ? "Regenerating" : "Regenerate"}
          </Button>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between text-[11px] text-[color:var(--muted-fg)]">
            <span>More credibility</span>
            <span className="text-[color:var(--fg)]">{dialLabel}</span>
            <span>More diversity</span>
          </div>
          <Slider value={[dial]} onValueChange={(v) => setDial(v[0] ?? 55)} min={0} max={100} step={1} />
        </div>
      </div>
    </Card>
  );
}
