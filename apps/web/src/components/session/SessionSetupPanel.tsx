"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { CheckCircle2, Loader2 } from "lucide-react";

import type { SessionConstraints, SessionMode } from "@/lib/contracts";
import { createSession, defaultConstraints } from "@/lib/sessions";
import { cn } from "@/lib/cn";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { Switch } from "@/components/ui/Switch";

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

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 rounded-[0.45rem] px-3 text-xs font-medium transition",
              active
                ? "bg-[color:color-mix(in_oklab,var(--accent)_16%,var(--surface-2))] text-[color:var(--fg)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_30%,var(--border))]"
                : "text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SessionSetupPanel() {
  const router = useRouter();

  const [mode, setMode] = useState<SessionMode>("co-reading");
  const [url, setUrl] = useState("");
  const [claimText, setClaimText] = useState("");
  const [constraints, setConstraints] = useState<SessionConstraints>(defaultConstraints());

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
        router.push(`/session/${session.sessionId}`);
        return;
      }

      if (!claimText.trim()) {
        setError("Type the claim you want checked.");
        return;
      }

      const session = await createSession({ mode, title: claimText.trim(), constraints });
      router.push(`/session/${session.sessionId}`);
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

        <Accordion type="single" collapsible defaultValue="constraints">
          <AccordionItem value="constraints" className="border-0">
            <AccordionTrigger className="rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] px-3">
              Constraints
              <span className="text-xs font-normal text-[color:var(--muted-fg)]">
                (grounding + choice-set behavior)
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-1">
              <div className="grid gap-4 rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] p-4">
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-[color:var(--muted-fg)]">Source constraints</div>
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">Prefer primary sources</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Gov docs, papers, transcripts.</div>
                    </div>
                    <Switch
                      checked={constraints.sourceConstraints.includes("prefer_primary")}
                      onCheckedChange={(checked) =>
                        setConstraints((c) => ({
                          ...c,
                          sourceConstraints: checked
                            ? Array.from(new Set([...c.sourceConstraints, "prefer_primary"]))
                            : c.sourceConstraints.filter((x) => x !== "prefer_primary"),
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">Prefer local sources</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Regional reporting + direct stakeholders.</div>
                    </div>
                    <Switch
                      checked={constraints.sourceConstraints.includes("prefer_local")}
                      onCheckedChange={(checked) =>
                        setConstraints((c) => ({
                          ...c,
                          sourceConstraints: checked
                            ? Array.from(new Set([...c.sourceConstraints, "prefer_local"]))
                            : c.sourceConstraints.filter((x) => x !== "prefer_local"),
                        }))
                      }
                    />
                  </label>
                </div>

                <Divider />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-[color:var(--muted-fg)]">Diversity target</div>
                    <Segmented
                      value={constraints.diversityTarget}
                      onChange={(v) =>
                        setConstraints((c) => ({
                          ...c,
                          diversityTarget: v as SessionConstraints["diversityTarget"],
                        }))
                      }
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-[color:var(--muted-fg)]">Max citations</div>
                    <Segmented
                      value={String(constraints.maxCitations)}
                      onChange={(v) =>
                        setConstraints((c) => ({
                          ...c,
                          maxCitations: Number(v) as SessionConstraints["maxCitations"],
                        }))
                      }
                      options={[
                        { value: "3", label: "3" },
                        { value: "5", label: "5" },
                        { value: "8", label: "8" },
                      ]}
                    />
                  </div>
                </div>

                <Divider />

                <div className="grid gap-2">
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">Show low-confidence cards</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Keep uncertainty visible.</div>
                    </div>
                    <Switch
                      checked={constraints.showLowConfidence}
                      onCheckedChange={(checked) =>
                        setConstraints((c) => ({ ...c, showLowConfidence: checked }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">No commentary mode</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Only evidence cards, no narrative.</div>
                    </div>
                    <Switch
                      checked={constraints.noCommentaryMode}
                      onCheckedChange={(checked) =>
                        setConstraints((c) => ({ ...c, noCommentaryMode: checked }))
                      }
                    />
                  </label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
