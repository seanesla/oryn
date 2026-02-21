"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock } from "lucide-react";

import type { SessionListItem } from "@/lib/contracts";
import { listSessions, refreshSessions } from "@/lib/sessions";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/*
 * Deterministically generate a color-bar segment distribution from the
 * sessionId string. Each session gets its own unique "fingerprint" stripe
 * that is visually interesting and consistent across renders.
 */
function sessionColorSegments(sessionId: string): number[] {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash + sessionId.charCodeAt(i)) & 0xffffffff;
  }
  const raw = [
    Math.abs(hash % 40) + 18,
    Math.abs((hash >> 8) % 30) + 12,
    Math.abs((hash >> 16) % 22) + 8,
    Math.abs((hash >> 24) % 18) + 6,
    Math.abs((hash >> 4) % 12) + 4,
  ];
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => (w / total) * 100);
}

const STRIPE_COLORS = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--warn)",
  "var(--bad)",
  "color-mix(in oklab, var(--accent) 55%, var(--accent-2))",
];

/* ------------------------------------------------------------------ */
/*  Dispute color bar                                                   */
/* ------------------------------------------------------------------ */

function DisputeBar({ sessionId }: { sessionId: string }) {
  const segments = sessionColorSegments(sessionId);
  return (
    <div className="mt-3 flex h-[3px] overflow-hidden rounded-full gap-[2px]">
      {segments.map((pct, i) => (
        <div
          key={i}
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: STRIPE_COLORS[i], opacity: 0.65 }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Session card                                                       */
/* ------------------------------------------------------------------ */

function SessionCard({
  session,
  index,
}: {
  session: SessionListItem;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.055, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <Link
        href={`/app/session/${session.sessionId}`}
        className={
          "group block rounded-[var(--radius-lg)] border border-[color:var(--border)] " +
          "bg-[color:color-mix(in_oklab,var(--card)_82%,transparent)] p-4 " +
          "transition-all duration-200 " +
          "hover:border-[color:color-mix(in_oklab,var(--accent)_40%,var(--border))] " +
          "hover:bg-[color:color-mix(in_oklab,var(--card)_95%,transparent)] " +
          "hover:shadow-[var(--shadow-glow)]"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--fg)]">
              {session.domain ?? "(no domain)"}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-[color:var(--muted-fg)]">
              {session.url ?? (session.mode === "claim-check" ? "Claim check" : "")}
            </div>
          </div>
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--muted-fg)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>

        <DisputeBar sessionId={session.sessionId} />

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[color:var(--muted-fg)]">
          <span>
            <span className="font-medium text-[color:var(--fg)]">{session.claimsCount}</span>
            {" "}{session.claimsCount === 1 ? "claim" : "claims"}
          </span>
          <span aria-hidden className="text-[color:var(--border-strong)]">&middot;</span>
          <span className="capitalize">{session.mode.replace("-", " ")}</span>
          <span aria-hidden className="text-[color:var(--border-strong)]">&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(session.createdAtMs)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ghost / empty-state skeleton cards                                  */
/* ------------------------------------------------------------------ */

function GhostCards() {
  return (
    <div className="relative">
      {/* Three progressively-fading ghost cards */}
      {[1, 0.55, 0.25].map((opacity, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity, y: 0 }}
          transition={{ delay: i * 0.09, duration: 0.45 }}
          className="mb-2 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border-soft)] p-4"
          style={{
            background: "color-mix(in oklab, var(--surface-3) 28%, transparent)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div
                className="h-3.5 w-28 rounded"
                style={{ background: "var(--surface-2)" }}
              />
              <div
                className="h-2.5 w-44 rounded"
                style={{
                  background: "color-mix(in oklab, var(--surface-2) 55%, transparent)",
                }}
              />
            </div>
          </div>
          <div
            className="mt-3 h-[3px] rounded-full"
            style={{ background: "var(--surface-2)" }}
          />
          <div className="mt-2.5 flex gap-3">
            <div
              className="h-2 w-14 rounded"
              style={{
                background: "color-mix(in oklab, var(--surface-2) 55%, transparent)",
              }}
            />
            <div
              className="h-2 w-10 rounded"
              style={{
                background: "color-mix(in oklab, var(--surface-2) 40%, transparent)",
              }}
            />
          </div>
        </motion.div>
      ))}

      {/* Centered label over first ghost */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none"
      >
        <p className="rounded-full border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-2)_80%,transparent)] px-3.5 py-1.5 text-[11px] font-medium text-[color:var(--muted-fg)] backdrop-blur-sm">
          Your first analysis will appear here
        </p>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  RecentSessionCards (exported)                                      */
/* ------------------------------------------------------------------ */

export function RecentSessionCards() {
  const [sessions, setSessions] = useState<Array<SessionListItem> | null>(null);

  useEffect(() => {
    /* Show cached list immediately while fresh data loads */
    const cached = listSessions();
    // Avoid sync setState in effect body (eslint rule).
    Promise.resolve().then(() => setSessions(cached));

    refreshSessions(8)
      .then((list) => setSessions(list))
      .catch(() => {
        /* Keep the cached list on error */
      });
  }, []);

  const isLoading = sessions === null;

  return (
    <div className="flex flex-col gap-3">
      {/* Section label */}
      <div className="section-label">Recent Sessions</div>

      {isLoading ? (
        /* Skeleton pulse while fetching */
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-[color:var(--border-soft)] p-4 animate-pulse"
              style={{
                background: "color-mix(in oklab, var(--card) 50%, transparent)",
                opacity: 1 - i * 0.25,
              }}
            >
              <div
                className="h-3.5 w-32 rounded"
                style={{ background: "var(--surface-3)" }}
              />
              <div
                className="mt-2 h-[3px] rounded-full"
                style={{ background: "var(--surface-3)" }}
              />
              <div className="mt-2.5 flex gap-3">
                <div
                  className="h-2 w-16 rounded"
                  style={{
                    background: "color-mix(in oklab, var(--surface-3) 60%, transparent)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <GhostCards />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {sessions.map((s, i) => (
              <SessionCard key={s.sessionId} session={s} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
