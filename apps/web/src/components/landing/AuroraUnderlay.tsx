"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

export function AuroraUnderlay({
  className,
  showRadialGradient = true,
}: {
  className?: string;
  showRadialGradient?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      style={
        {
          "--aurora":
            "repeating-linear-gradient(100deg,var(--accent)_10%,color-mix(in oklab,var(--accent)_36%,white)_15%,var(--accent-2)_20%,color-mix(in oklab,var(--accent-2)_30%,white)_25%,var(--warn)_30%)",
          "--dark-gradient":
            "repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)",
          "--white-gradient":
            "repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)",
        } as CSSProperties
      }
    >
      <div
        className={cn(
          "absolute -inset-[10px] opacity-60 blur-[14px] will-change-transform",
          "[background-image:var(--dark-gradient),var(--aurora)] [background-size:300%_200%] [background-position:50%_50%,50%_50%]",
          "after:absolute after:inset-0 after:animate-aurora after:[background-image:var(--dark-gradient),var(--aurora)] after:[background-size:200%_100%] after:[background-attachment:fixed] after:mix-blend-screen after:content-[\"\"]",
          showRadialGradient
            ? "[mask-image:radial-gradient(ellipse_at_70%_0%,black_15%,transparent_70%)]"
            : ""
        )}
      />
    </div>
  );
}
