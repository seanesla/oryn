"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowRight, Clock, Search } from "lucide-react";

import { listSessions } from "@/lib/sessions";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function fmt(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString();
}

export function HistoryClient() {
  const [sessions, setSessions] = useState<ReturnType<typeof listSessions>>([]);

  useEffect(() => {
    let cancelled = false;
    /* The list endpoint no longer exists; use local cache only. */
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSessions(listSessions());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      {/* ── Page header ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[clamp(1.5rem,3.2vw,2.2rem)] leading-tight tracking-[-0.02em]">
            History
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted-fg)]">
            Recent sessions from your workspace.
          </p>
        </div>
        <Badge variant="counter" tone="accent">{sessions.length}</Badge>
      </div>

      {/* ── Session list or empty state ── */}
      {sessions.length === 0 ? (
        /* ── Empty state: centered CTA ── */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--surface-2))]">
            <Search className="h-6 w-6 text-[color:var(--accent)]" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-[color:var(--fg)]">No sessions yet</h2>
          <p className="mt-2 max-w-sm text-sm text-[color:var(--muted-fg)]">
            Start by analyzing a URL or checking a claim. Your sessions will appear here.
          </p>
          <Link href="/app/co-reading">
            <Button className="mt-5">
              Start a session
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        /* ── Session rows ── */
        <div className="space-y-2">
          {sessions.map((s) => (
            <Link
              key={s.sessionId}
              href={`/app/session/${s.sessionId}`}
              className="group block rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-4 transition-all hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] hover:shadow-[var(--shadow-glow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--fg)]">
                    {s.domain ?? "(no domain)"}
                  </div>
                  <div className="mt-1 truncate text-xs text-[color:var(--muted-fg)]">
                    {s.url ?? (s.mode === "claim-check" ? "Claim check" : "")}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--muted-fg)] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              {/* Inline text metadata instead of badge row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--muted-fg)]">
                <span className="capitalize">{s.mode.replace("-", " ")}</span>
                <span aria-hidden className="text-[color:var(--border-strong)]">&middot;</span>
                <span>{s.claimsCount} claims</span>
                <span aria-hidden className="text-[color:var(--border-strong)]">&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {fmt(s.createdAtMs)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
