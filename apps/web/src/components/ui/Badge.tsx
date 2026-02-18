import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "good" | "warn" | "bad";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const color =
    tone === "accent"
      ? "var(--accent)"
      : tone === "good"
        ? "var(--good)"
        : tone === "warn"
          ? "var(--warn)"
          : tone === "bad"
            ? "var(--bad)"
            : "var(--border)";

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
