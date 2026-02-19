import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border",
        "border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border-strong))]",
        "bg-[color:color-mix(in_oklab,var(--surface-2)_55%,transparent)]",
        "shadow-[var(--shadow-ambient)] backdrop-blur-md",
        /* removed the white top-edge shine */
        className
      )}
    >
      {/* accent radial glow from top — replaces the white shine line */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_80%_at_50%_0%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_55%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
