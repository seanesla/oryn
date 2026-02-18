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
        "border-[color:color-mix(in_oklab,var(--border-strong)_64%,var(--border))]",
        "bg-[color:color-mix(in_oklab,var(--surface-2)_95%,transparent)]",
        "shadow-[var(--shadow-ambient)] backdrop-blur-md",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
        "before:bg-[color:color-mix(in_oklab,var(--fg)_18%,transparent)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(150%_100%_at_50%_0%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_62%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
