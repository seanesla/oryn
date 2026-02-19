"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Clock, ExternalLink, History } from "lucide-react";

import { listSessions, refreshSessions } from "@/lib/sessions";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";

function fmt(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString();
}

export function HistoryClient() {
  const [sessions, setSessions] = useState(() => listSessions());

  useEffect(() => {
    refreshSessions(10)
      .then((list) => setSessions(list))
      .catch(() => {
        // Keep cached list.
      });
  }, []);

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8">
      <section className="section-label">Session Log</section>
      <div className="panel-elevated mt-3 mb-6 flex flex-wrap items-end justify-between gap-4 rounded-[0.9rem] p-5">
        <div>
          <div className="font-serif text-[clamp(1.35rem,3.2vw,2rem)] leading-tight tracking-[-0.02em]">History</div>
          <div className="mt-2 text-sm text-[color:var(--muted-fg)]">Last 10 sessions (from backend).</div>
        </div>
        <Badge tone="accent">
          <History className="h-3.5 w-3.5" />
          {sessions.length}
        </Badge>
      </div>

      <Card className="p-5">
        <div className="text-sm font-semibold tracking-[-0.02em]">Sessions</div>
        <div className="mt-1 text-xs text-[color:var(--muted-fg)]">Click to reopen (read-only snapshot in UI).</div>
        <Divider className="my-4" />

        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.sessionId}
              href={`/session/${s.sessionId}`}
              className="block rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3 transition hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] hover:shadow-[var(--shadow-glow)]"
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
                <ExternalLink className="h-4 w-4 shrink-0 text-[color:var(--muted-fg)]" />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{s.mode}</Badge>
                <Badge tone="neutral">{s.claimsCount} claims</Badge>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[color:var(--muted-fg)]">
                  <Clock className="h-3.5 w-3.5" />
                  {fmt(s.createdAtMs)}
                </span>
              </div>
            </Link>
          ))}

          {sessions.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-4 text-sm text-[color:var(--muted-fg)]">
              No sessions yet. Start from Co-Reading.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
