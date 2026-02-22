"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { RefreshCcw, ExternalLink } from "lucide-react";

import type { SessionArtifacts } from "@/lib/contracts";
import type { RuntimeActions } from "@/lib/runtimeTypes";
import { cn } from "@/lib/cn";
import { sanitizeExternalHref } from "@/lib/sanitizeHref";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";

export function ChoiceSetPanel({
  session,
  actions,
}: {
  session: SessionArtifacts;
  actions: RuntimeActions;
}) {
  const shouldReduceMotion = useReducedMotion();
  const items = useMemo(() => session.choiceSet.slice(0, 3), [session.choiceSet]);
  const [regenerating, setRegenerating] = useState(false);

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
        <Badge variant="counter" tone="accent">{items.length}/3</Badge>
      </div>

      <Divider className="my-4" />

      <div className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
        {items.map((i, idx) => (
          <motion.a
            layout
            key={`${i.id}-${i.reason}`}
            href={sanitizeExternalHref(i.url)}
            target="_blank"
            rel="noopener noreferrer"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8, filter: "blur(8px)" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "group block rounded-[var(--radius-sm)] border border-[color:var(--border)]",
              "bg-[color:color-mix(in_oklab,var(--card)_84%,transparent)]",
              "transition hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))]"
            )}
          >
            <div className="flex">
              {/* Large step number */}
              <div className="flex w-10 shrink-0 items-start justify-center pt-3.5">
                <span className="text-lg font-bold tabular-nums text-[color:color-mix(in_oklab,var(--accent)_50%,var(--muted-fg))]">
                  {idx + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 py-3 pr-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[color:var(--muted-fg)]">{i.domain}</div>
                    <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.01em] text-[color:var(--fg)]">
                      {i.title}
                    </div>
                  </div>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--muted-fg)] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                {/* Inline labels instead of badge row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <Badge variant="label" tone="accent">{i.frameLabel}</Badge>
                  {i.opensMissingFrame ? (
                    <span className="italic text-[color:var(--warn)]">opens a missing frame</span>
                  ) : null}
                  {i.isPrimarySource ? (
                    <span className="italic text-[color:var(--good)]">primary source</span>
                  ) : null}
                </div>

                <div className="mt-1.5 text-xs leading-relaxed text-[color:var(--muted-fg)]">{i.reason}</div>
              </div>
            </div>
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

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-[color:var(--muted-fg)]">Regenerate with constraints</div>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={items.length !== 3 || regenerating}>
          <RefreshCcw className={cn("h-4 w-4", regenerating ? "animate-spin" : "")} />
          {regenerating ? "Regenerating" : "Regenerate"}
        </Button>
      </div>
    </Card>
  );
}
