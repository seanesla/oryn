"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { CheckCircle2, Globe, Loader2, MessageSquareText } from "lucide-react";

import type { SessionMode } from "@/lib/contracts";
import { createSession } from "@/lib/sessions";
import { useConstraints } from "@/lib/useConstraints";
import { cn } from "@/lib/cn";

import {
  CLAIM_EXAMPLES,
  URL_EXAMPLES,
  useTypingPlaceholder,
} from "@/components/home/AnimatedPlaceholder";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  AnimatedUrlInput — overlays a typewriter placeholder on an         */
/*  otherwise plain <input> when the field is empty and unfocused      */
/* ------------------------------------------------------------------ */

function AnimatedUrlInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const typedText = useTypingPlaceholder(URL_EXAMPLES, !focused && !value);

  return (
    <div className="relative flex-1">
      {/* Typewriter overlay — only shown when input is empty and not focused */}
      {!value && !focused && (
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-0 overflow-hidden">
          <span className="truncate text-sm text-[color:color-mix(in_oklab,var(--muted-fg)_65%,transparent)]">
            {typedText}
          </span>
          {/* Blinking cursor */}
          <span
            aria-hidden
            className="ml-px inline-block h-[1.1em] w-[2px] rounded-[1px] animate-[cursor-blink_1s_step-end_infinite]"
            style={{ background: "color-mix(in oklab, var(--accent) 70%, transparent)" }}
          />
        </div>
      )}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Session URL"
        name="session-url"
        inputMode="url"
        disabled={disabled}
        placeholder="" /* empty — typewriter overlay handles idle state */
        className={cn(
          "h-10 w-full rounded-[0.56rem] border border-[color:color-mix(in_oklab,var(--border-strong)_62%,var(--border))]",
          "bg-[color:color-mix(in_oklab,var(--surface-2)_94%,transparent)] px-3 text-sm text-[color:var(--fg)]",
          "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          "transition-[border-color,box-shadow,background-color] duration-200",
          "disabled:opacity-60",
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AnimatedClaimTextarea — same treatment for the claim textarea      */
/* ------------------------------------------------------------------ */

function AnimatedClaimTextarea({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const typedText = useTypingPlaceholder(CLAIM_EXAMPLES, !focused && !value);

  return (
    <div className="relative">
      {/* Typewriter overlay */}
      {!value && !focused && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-start gap-0 overflow-hidden">
          <span className="text-sm leading-relaxed text-[color:color-mix(in_oklab,var(--muted-fg)_65%,transparent)]">
            {typedText}
          </span>
          <span
            aria-hidden
            className="ml-px mt-[2px] inline-block h-[1.1em] w-[2px] rounded-[1px] animate-[cursor-blink_1s_step-end_infinite]"
            style={{ background: "color-mix(in oklab, var(--accent) 70%, transparent)" }}
          />
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Claim to analyze"
        name="claim-text"
        placeholder=""
        disabled={disabled}
        className={cn(
          "min-h-[110px] w-full resize-none rounded-[var(--radius-sm)]",
          "border border-[color:color-mix(in_oklab,var(--border-strong)_62%,var(--border))]",
          "bg-[color:color-mix(in_oklab,var(--surface-2)_94%,transparent)] p-3 text-sm text-[color:var(--fg)]",
          "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          "transition-[border-color,box-shadow] duration-200",
          "disabled:opacity-60",
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DomainPill — animated domain chip that slides in after URL parse   */
/* ------------------------------------------------------------------ */

function DomainPill({
  domain,
  title,
  loading,
}: {
  domain: string | null;
  title: string | null;
  loading: boolean;
}) {
  const visible = loading || !!domain;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_80%,transparent)] px-3 py-2 text-xs text-[color:var(--muted-fg)]">
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-[color:var(--accent)]" />
                <span>Resolving source…</span>
              </>
            ) : (
              <>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--good)" }}
                />
                <span className="font-medium text-[color:var(--fg)]">{domain}</span>
                {title ? (
                  <>
                    <span className="text-[color:var(--border-strong)]">&mdash;</span>
                    <span className="truncate">{title}</span>
                  </>
                ) : null}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  SessionSetupPanel                                                  */
/* ------------------------------------------------------------------ */

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
          setError("That URL doesn't look valid. Paste a full link starting with http(s).");
          return;
        }
        setFetchingMeta(true);
        setDomain(null);
        setTitle(null);
        await new Promise((r) => setTimeout(r, 260));

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

  const isAnalyzing = fetchingMeta;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Mode picker ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            {
              id: "co-reading" as SessionMode,
              icon: Globe,
              title: "Analyze a URL",
              desc: "Paste an article link. Oryn extracts claims and finds counter-evidence.",
            },
            {
              id: "claim-check" as SessionMode,
              icon: MessageSquareText,
              title: "Check a claim",
              desc: "Type something you heard. Oryn finds evidence and counter-evidence.",
            },
          ] as const
        ).map(({ id, icon: Icon, title: label, desc }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                setError(null);
              }}
              className={cn(
                "group flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-all duration-200",
                active
                  ? "border-[color:color-mix(in_oklab,var(--accent)_50%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_8%,var(--surface-1))]"
                  : "border-[color:var(--border)] bg-[color:var(--surface-1)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)]",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-200",
                  active
                    ? "bg-[color:color-mix(in_oklab,var(--accent)_18%,var(--surface-2))] text-[color:var(--accent)]"
                    : "bg-[color:var(--surface-3)] text-[color:var(--muted-fg)]",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div
                  className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    active ? "text-[color:var(--fg)]" : "text-[color:var(--muted-fg)]",
                  )}
                >
                  {label}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted-fg)]">
                  {desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Input card — border pulses while analyzing ── */}
      <Card
        className={cn(
          "p-5 transition-all duration-300",
          isAnalyzing && "analyzing-ring",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mode === "co-reading" ? (
            <motion.div
              key="url-mode"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3"
            >
              {/* URL row */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <AnimatedUrlInput
                  value={url}
                  onChange={(v) => {
                    setUrl(v);
                    setError(null);
                    /* Clear stale domain when URL changes */
                    if (domain) {
                      setDomain(null);
                      setTitle(null);
                    }
                  }}
                  disabled={isAnalyzing}
                />
                <Button
                  className="sm:w-44"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Analyze
                </Button>
              </div>

              {/* Domain chip */}
              <DomainPill domain={domain} title={title} loading={fetchingMeta} />

              {/* Example suggestions */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[color:var(--muted-fg)]">Try:</span>
                {[
                  { label: "NYT: AI in classrooms", url: "https://www.nytimes.com/2024/01/25/technology/ai-in-classrooms.html" },
                  { label: "Reuters: climate policy", url: "https://www.reuters.com/sustainability/climate-energy/2024-climate-policy" },
                ].map((ex) => (
                  <button
                    key={ex.url}
                    type="button"
                    onClick={() => {
                      setUrl(ex.url);
                      setError(null);
                    }}
                    className="rounded-[var(--radius-xs)] px-2 py-1 text-[11px] text-[color:var(--accent)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))]"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="claim-mode"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3"
            >
              <AnimatedClaimTextarea
                value={claimText}
                onChange={(v) => {
                  setClaimText(v);
                  setError(null);
                }}
                disabled={isAnalyzing}
              />

              {/* Example suggestions */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[color:var(--muted-fg)]">Try:</span>
                {[
                  "Electric vehicles produce more lifetime emissions than gas cars",
                  "Remote work decreases team productivity",
                ].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setClaimText(ex);
                      setError(null);
                    }}
                    className="rounded-[var(--radius-xs)] px-2 py-1 text-[11px] text-[color:var(--accent)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))]"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <Divider />

              <Button onClick={handleAnalyze} disabled={!canAnalyze || isAnalyzing}>
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Analyze
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--bad)_10%,var(--surface-2))] p-3 text-sm text-[color:var(--fg)]">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
