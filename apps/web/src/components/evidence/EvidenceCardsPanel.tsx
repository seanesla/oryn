"use client";

import { useMemo, useRef, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  Bookmark,
  Filter,
  Info,
  Search,
  ShieldQuestion,
  Workflow,
} from "lucide-react";

import type { DisagreementType, EvidenceCard, SessionArtifacts } from "@/lib/contracts";
import type { RuntimeActions } from "@/lib/runtimeTypes";
import { cn } from "@/lib/cn";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Divider } from "@/components/ui/Divider";
import { Input } from "@/components/ui/Input";

const disputeTypes: Array<DisagreementType> = [
  "Factual",
  "Causal",
  "Definition",
  "Values",
  "Prediction",
];

const confidenceOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const disputeOrder: Record<DisagreementType, number> = {
  Factual: 0,
  Causal: 1,
  Definition: 2,
  Values: 3,
  Prediction: 4,
};

function toneForConfidence(c: EvidenceCard["confidence"]) {
  if (c === "High") return "good";
  if (c === "Medium") return "warn";
  return "bad";
}

function explainDisputeType(t: DisagreementType) {
  if (t === "Factual") return "The disagreement is about what is true in the world (numbers, events, quotes, measurements).";
  if (t === "Causal") return "The disagreement is about whether X caused Y, and which confounders or mechanisms matter.";
  if (t === "Definition") return "The disagreement is about what terms mean or what metric is being used (category boundaries).";
  if (t === "Values") return "The disagreement is about tradeoffs and priorities (even with shared facts).";
  return "The disagreement is about future outcomes (forecasts, scenarios, uncertainty).";
}

export function EvidenceCardsPanel({
  session,
  actions,
}: {
  session: SessionArtifacts;
  actions: RuntimeActions;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [sortBy, setSortBy] = useState<"confidence" | "dispute">("confidence");
  const [pinnedFirst, setPinnedFirst] = useState(true);
  const [query, setQuery] = useState("");
  const [confFilter, setConfFilter] = useState<Array<EvidenceCard["confidence"]>>([]);
  const [typeFilter, setTypeFilter] = useState<Array<DisagreementType>>([]);

  const hasActiveFilters = Boolean(query.trim()) || confFilter.length > 0 || typeFilter.length > 0;
  const hasAnyEvidenceCards = session.evidenceCards.length > 0;

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = session.evidenceCards;

    if (!session.constraints.showLowConfidence) {
      list = list.filter((c) => c.confidence !== "Low");
    }

    if (confFilter.length > 0) {
      list = list.filter((c) => confFilter.includes(c.confidence));
    }

    if (typeFilter.length > 0) {
      list = list.filter((c) => typeFilter.includes(c.disagreementType));
    }

    if (q) {
      list = list.filter((c) => c.claimText.toLowerCase().includes(q));
    }

    list = [...list].sort((a, b) => {
      if (pinnedFirst && Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      if (sortBy === "confidence") {
        return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      }
      return disputeOrder[a.disagreementType] - disputeOrder[b.disagreementType];
    });

    return list;
  }, [confFilter, pinnedFirst, query, session.constraints.showLowConfidence, session.evidenceCards, sortBy, typeFilter]);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">Evidence Cards</div>
          <div className="mt-1 text-xs text-[color:var(--muted-fg)]">
            Each card must include a quote + a counter-frame.
          </div>
        </div>
        <Badge tone={session.pipeline.evidenceBuilding ? "warn" : "good"}>
          {session.pipeline.evidenceBuilding ? "Live building" : `${session.evidenceCards.length} cards`}
        </Badge>
      </div>

      <Divider className="my-4" />

      <div className="grid gap-3">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-fg)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search within claims"
              name="claims-search"
              placeholder="Search within claims…"
              className="pl-9"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="text-sm font-semibold tracking-[-0.02em]">Filters</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[color:var(--muted-fg)]">
                Narrow what you see without changing the underlying session.
              </DialogDescription>
              <Divider className="my-3" />
              <div className="grid gap-4">
                <div>
                  <div className="text-xs font-medium text-[color:var(--muted-fg)]">Dispute type</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {disputeTypes.map((t) => {
                      const active = typeFilter.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setTypeFilter((prev) =>
                              active ? prev.filter((x) => x !== t) : [...prev, t]
                            )
                          }
                          className={cn(
                            "rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium",
                            active
                              ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[color:var(--fg)]"
                              : "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[color:var(--muted-fg)]">Confidence</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["High", "Medium", "Low"] as const).map((c) => {
                      const active = confFilter.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setConfFilter((prev) =>
                              active ? prev.filter((x) => x !== c) : [...prev, c]
                            )
                          }
                          className={cn(
                            "rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium",
                            active
                              ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[color:var(--fg)]"
                              : "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]"
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                  <div>
                    <div className="text-sm">Pinned first</div>
                    <div className="text-xs text-[color:var(--muted-fg)]">Keeps critical claims visible.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPinnedFirst((p) => !p)}
                    className={cn(
                      "rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-medium",
                      pinnedFirst
                        ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--card))]"
                        : "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] text-[color:var(--muted-fg)]"
                    )}
                  >
                    {pinnedFirst ? "On" : "Off"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConfFilter([]);
                      setTypeFilter([]);
                      setQuery("");
                    }}
                  >
                    Clear
                  </Button>
                  <DialogClose asChild>
                    <Button>Done</Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-[color:var(--muted-fg)]">Sort</div>
            <button
              type="button"
              onClick={() => setSortBy("confidence")}
              className={cn(
                "rounded-[var(--radius-sm)] border px-2 py-1 text-xs",
                sortBy === "confidence"
                  ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[color:var(--fg)]"
                  : "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] text-[color:var(--muted-fg)]"
              )}
            >
              By confidence
            </button>
            <button
              type="button"
              onClick={() => setSortBy("dispute")}
              className={cn(
                "rounded-[var(--radius-sm)] border px-2 py-1 text-xs",
                sortBy === "dispute"
                  ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--card))] text-[color:var(--fg)]"
                  : "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] text-[color:var(--muted-fg)]"
              )}
            >
              By dispute type
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${cards.length}-${sortBy}-${pinnedFirst}`}
              className="text-[11px] text-[color:var(--muted-fg)]"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 3 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
            >
              Showing {cards.length}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Divider className="my-4" />

      <div className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {cards.map((c) => (
            <motion.article
              key={c.id}
              layout
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }}
              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
            <div
              className={cn(
              "rounded-[var(--radius-sm)] border p-3",
              c.pinned
                ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_6%,var(--card))]"
                : "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_84%,transparent)]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.01em] text-[color:var(--fg)]">
                    {c.claimText}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="accent">{c.disagreementType}</Badge>
                    <Badge tone={toneForConfidence(c.confidence)}>{c.confidence}</Badge>
                    {c.pinned ? <Badge tone="warn">Pinned</Badge> : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  aria-label={c.pinned ? "Unpin card" : "Pin card"}
                  title={c.pinned ? "Unpin card" : "Pin card"}
                  onClick={() => actions.togglePin(c.id)}
                >
                  <Bookmark className={cn("h-4 w-4", c.pinned ? "text-[color:var(--accent)]" : "text-[color:var(--muted-fg)]")} />
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                  <div className="text-[11px] font-medium text-[color:var(--muted-fg)]">Evidence</div>
                  {c.evidence.slice(0, 1).map((e) => (
                    <div key={e.url} className="mt-2 text-xs leading-relaxed text-[color:var(--fg)]">
                      <span className="text-[color:var(--muted-fg)]">“</span>
                      {e.quote}
                      <span className="text-[color:var(--muted-fg)]">”</span>
                      <div className="mt-1">
                        <a
                          className="text-[color:var(--muted-fg)] underline decoration-[color:color-mix(in_oklab,var(--accent)_40%,transparent)] underline-offset-2 hover:text-[color:var(--fg)]"
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {e.domain ?? e.url}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                  <div className="text-[11px] font-medium text-[color:var(--muted-fg)]">Counter-evidence / counter-frame</div>
                  {c.counterEvidence.slice(0, 1).map((e) => (
                    <div key={e.url} className="mt-2 text-xs leading-relaxed text-[color:var(--fg)]">
                      <span className="text-[color:var(--muted-fg)]">“</span>
                      {e.quote}
                      <span className="text-[color:var(--muted-fg)]">”</span>
                      <div className="mt-1">
                        <a
                          className="text-[color:var(--muted-fg)] underline decoration-[color:color-mix(in_oklab,var(--accent)_40%,transparent)] underline-offset-2 hover:text-[color:var(--fg)]"
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {e.domain ?? e.url}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Info className="h-4 w-4" />
                      Explain dispute type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle className="text-sm font-semibold tracking-[-0.02em]">{c.disagreementType} dispute</DialogTitle>
                    <DialogDescription className="mt-2 text-sm text-[color:var(--muted-fg)]">
                      {explainDisputeType(c.disagreementType)}
                    </DialogDescription>
                    <Divider className="my-3" />
                    <div className="text-xs text-[color:var(--muted-fg)]">
                      This label is a UI guardrail: it forces the system to separate definitional arguments from factual checks.
                    </div>
                    <div className="mt-4 flex justify-end">
                      <DialogClose asChild>
                        <Button>Close</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Workflow className="h-4 w-4" />
                      Show retrieval trace
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle className="text-sm font-semibold tracking-[-0.02em]">Retrieval trace for this card</DialogTitle>
                    <DialogDescription className="mt-1 text-xs text-[color:var(--muted-fg)]">
                      Which tool outputs fed it.
                    </DialogDescription>
                    <Divider className="my-3" />
                    <div className="space-y-2">
                      {(c.traceRef?.toolCallIds ?? []).map((id, index) => {
                        const call = session.trace.toolCalls.find((t) => t.id === id);
                        if (!call) return null;
                        return (
                          <div key={`${id}-${index}`} className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-3">
                            <div className="text-xs font-medium text-[color:var(--fg)]">{call.queryText}</div>
                            <div className="mt-1 text-[11px] text-[color:var(--muted-fg)]">
                              results: {call.resultsCount} · selected: {call.selectedSourceDomains.join(", ")}
                            </div>
                            <div className="mt-1 text-[11px] text-[color:var(--muted-fg)]">why: {call.selectionWhy}</div>
                          </div>
                        );
                      })}
                      {(c.traceRef?.toolCallIds ?? []).length === 0 ? (
                        <div className="text-sm text-[color:var(--muted-fg)]">No trace references (mock).</div>
                      ) : null}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <DialogClose asChild>
                        <Button>Close</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ShieldQuestion className="h-4 w-4" />
                      Ask follow-up
                    </Button>
                  </DialogTrigger>
                  <FollowUpDialog session={session} actions={actions} />
                </Dialog>
              </div>
            </div>
            </motion.article>
          ))}
        </AnimatePresence>

        {cards.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_84%,transparent)] p-4 text-sm text-[color:var(--muted-fg)]">
            {!hasAnyEvidenceCards
              ? session.pipeline.evidenceBuilding
                ? "Building evidence cards…"
                : "Waiting on evidence cards…"
              : hasActiveFilters
                ? "No cards match your current search/filters."
                : "No cards are visible with the current session constraints."}
            {hasAnyEvidenceCards && hasActiveFilters ? (
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfFilter([]);
                    setTypeFilter([]);
                    setQuery("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function FollowUpDialog({
  session,
  actions,
}: {
  session: SessionArtifacts;
  actions: RuntimeActions;
}) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <DialogContent>
      <DialogTitle className="text-sm font-semibold tracking-[-0.02em]">Ask a follow-up question</DialogTitle>
      <DialogDescription className="mt-1 text-xs text-[color:var(--muted-fg)]">
        This gets appended as a user turn.
      </DialogDescription>
      <Divider className="my-3" />
      <textarea
        value={text}
        name="follow-up-question"
        aria-label="Follow-up question"
        onChange={(e) => {
          setText(e.target.value);
          setErr(null);
        }}
        placeholder="Example: Which data definition would flip this conclusion?"
        className={cn(
          "min-h-[110px] w-full resize-none rounded-[var(--radius-sm)] border border-[color:var(--border)]",
          "bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3 text-sm text-[color:var(--fg)]",
          "placeholder:text-[color:color-mix(in_oklab,var(--muted-fg)_70%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
        )}
      />
      {err ? (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--bad)_10%,var(--card))] p-3 text-sm">
          {err}
        </div>
      ) : null}
      <DialogClose asChild>
        <button ref={closeButtonRef} type="button" className="hidden" tabIndex={-1} aria-hidden="true" />
      </DialogClose>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] text-[color:var(--muted-fg)]">
          Evidence required: {session.evidenceCards.length > 0 ? "yes" : "no (blocked)"}
        </div>
        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={isSubmitting}
            onClick={async () => {
              if (submitLockRef.current) return;
              if (!text.trim()) {
                setErr("Type a question.");
                return;
              }
              if (session.evidenceCards.length === 0) {
                setErr("Evidence required. Narrow the claim.");
                return;
              }
              setErr(null);
              submitLockRef.current = true;
              setIsSubmitting(true);
              const now = Date.now();
              try {
                await actions.appendTranscript({
                  speaker: "user",
                  text: text.trim(),
                  timestampMs: now,
                  isPartial: false,
                  turnId: `user_followup_${now}`,
                });
                await actions.appendTranscript({
                  speaker: "agent",
                  text: "Got it. I’ll treat that as a narrowing question and rebuild the choice set with the missing frame in mind. (mock)",
                  timestampMs: now + 220,
                  isPartial: false,
                  turnId: `agent_followup_${now}`,
                });
                await actions.regenerateChoiceSet();
                setText("");
                closeButtonRef.current?.click();
              } catch {
                setErr("Could not submit follow-up. Try again.");
              } finally {
                submitLockRef.current = false;
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
