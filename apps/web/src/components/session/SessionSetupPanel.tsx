"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { CheckCircle2, Loader2 } from "lucide-react";

import type { SessionMode } from "@/lib/contracts";
import { createSession } from "@/lib/sessions";
import { useConstraints } from "@/lib/useConstraints";
import { cn } from "@/lib/cn";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { Segmented } from "@/components/ui/Segmented";

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function toAnalyzeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Could not start the session. Please try again.";
}

export function SessionSetupPanel() {
  const router = useRouter();

  const [mode, setMode] = useState<SessionMode>("co-reading");
  const [url, setUrl] = useState("");
  const [claimText, setClaimText] = useState("");
  const { constraints } = useConstraints();

  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = useMemo(() => {
    if (mode === "co-reading") return url.trim().length > 0;
    return claimText.trim().length > 0;
  }, [claimText, mode, url]);

  async function handleAnalyze() {
    setError(null);

    try {
      if (mode === "co-reading") {
        const d = domainFromUrl(url);
        if (!d) {
          setError("That URL doesn’t look valid. Paste a full link starting with http(s).");
          return;
        }
        setFetchingMeta(true);
        setDomain(null);
        setTitle(null);
        // Lightweight UX delay so the UI doesn't feel like a hard jump.
        await new Promise((r) => setTimeout(r, 250));

        const guessedTitle = "Co-reading session";
        setDomain(d);
        setTitle(guessedTitle);
        setFetchingMeta(false);

        const session = await createSession({ mode, url, title: guessedTitle, constraints });
        router.push(`/app/session/${session.sessionId}`);
        return;
      }

      if (!claimText.trim()) {
        setError("Type the claim you want checked.");
        return;
      }

      const session = await createSession({ mode, title: claimText.trim(), constraints });
      router.push(`/app/session/${session.sessionId}`);
    } catch (err) {
      setFetchingMeta(false);
      setError(toAnalyzeErrorMessage(err));
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold tracking-[-0.02em]">Session setup</div>
              <div className="text-xs text-[color:var(--muted-fg)]">Clean start. Strict grounding contract.</div>
            </div>
            <Badge tone="good">Backend live</Badge>
          </div>
          <Divider className="mt-2" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-[color:var(--muted-fg)]">Mode</div>
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v as SessionMode);
              setError(null);
            }}
            options={[
              { value: "co-reading", label: "Co-Reading (URL)" },
              { value: "claim-check", label: "Claim Check (no URL)" },
            ]}
          />
        </div>

        {mode === "co-reading" ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-medium text-[color:var(--muted-fg)]">URL</div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                aria-label="Session URL"
                name="session-url"
                placeholder="Paste a link…"
                inputMode="url"
              />
              <Button
                className="sm:w-44"
                onClick={handleAnalyze}
                disabled={!canAnalyze || fetchingMeta}
              >
                {fetchingMeta ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Analyze
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: domain || title || fetchingMeta ? 1 : 0, y: domain || title || fetchingMeta ? 0 : 8, filter: "blur(0px)" }}
              className="rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] p-3 text-xs text-[color:var(--muted-fg)]"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: fetchingMeta ? "var(--warn)" : "var(--good)" }} />
                <span className="text-[color:var(--fg)]">
                  {fetchingMeta ? "Fetching article metadata…" : domain ? "Metadata fetched" : ""}
                </span>
              </div>
              {domain ? <div className="mt-2">Domain: <span className="text-[color:var(--fg)]">{domain}</span></div> : null}
              {title ? <div className="mt-1">Title: <span className="text-[color:var(--fg)]">{title}</span></div> : null}
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-medium text-[color:var(--muted-fg)]">Claim</div>
            <textarea
              value={claimText}
              onChange={(e) => {
                setClaimText(e.target.value);
                setError(null);
              }}
              aria-label="Claim to analyze"
              name="claim-text"
              placeholder="Type the claim you heard…"
              className={cn(
                "min-h-[110px] w-full resize-none rounded-[var(--radius-sm)] border border-[color:var(--border)]",
                "bg-[color:color-mix(in_oklab,var(--card)_92%,transparent)] p-3 text-sm text-[color:var(--fg)]",
                "placeholder:text-[color:color-mix(in_oklab,var(--muted-fg)_70%,transparent)]",
                "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              )}
            />
            <Button onClick={handleAnalyze} disabled={!canAnalyze}>
              <CheckCircle2 className="h-4 w-4" />
              Analyze
            </Button>
          </div>
        )}

        {error ? (
          <div className="rounded-[0.65rem] border border-[color:color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--bad)_10%,var(--surface-2))] p-3 text-sm text-[color:var(--fg)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_84%,transparent)] p-4">
          <div className="text-xs font-medium text-[color:var(--muted-fg)]">Live indicators</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-[color:var(--border)]" />
              Content extracted
            </div>
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-[color:var(--border)]" />
              Claims extracted
            </div>
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 text-[color:var(--muted-fg)]" />
              Evidence building
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
