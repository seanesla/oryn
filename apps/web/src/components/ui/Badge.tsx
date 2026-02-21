import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "good" | "warn" | "bad";
type Variant = "pill" | "status" | "label" | "counter";

const toneColorVar: Record<Tone, string> = {
  accent: "var(--accent)",
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  neutral: "var(--muted-fg)",
};

export function Badge({
  children,
  tone = "neutral",
  variant = "pill",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  variant?: Variant;
  className?: string;
}) {
  const color = toneColorVar[tone];

  /* ── status: colored dot + plain text, no border/bg ── */
  if (variant === "status") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.01em] text-[color:var(--muted-fg)]",
          className
        )}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
        {children}
      </span>
    );
  }

  /* ── label: subtle filled bg, no border ── */
  if (variant === "label") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-[0.3rem] px-1.5 py-[0.15rem] text-[10px] font-semibold uppercase tracking-[0.06em]",
          className
        )}
        style={{
          background: `color-mix(in oklab, ${color} 14%, var(--surface-2))`,
          color: `color-mix(in oklab, ${color} 70%, var(--fg))`,
        }}
      >
        {children}
      </span>
    );
  }

  /* ── counter: compact number emphasis ── */
  if (variant === "counter") {
    return (
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-[0.28rem] px-1 text-[10px] font-bold tabular-nums",
          className
        )}
        style={{
          background: `color-mix(in oklab, ${color} 16%, var(--surface-2))`,
          color: `color-mix(in oklab, ${color} 75%, var(--fg))`,
        }}
      >
        {children}
      </span>
    );
  }

  /* ── pill: original style (use sparingly) ── */
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[0.45rem] border px-2 py-[0.24rem] text-[10px] font-medium tracking-[0.02em]",
        "bg-[color:color-mix(in oklab,var(--surface-2) 92%,transparent)]",
        "text-[color:var(--fg)]",
        className
      )}
      style={{ borderColor: `color-mix(in oklab, ${color} 42%, var(--border))` }}
    >
      {children}
    </span>
  );
}
