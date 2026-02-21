"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/cn";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={250}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className={cn(
            "z-50 max-w-xs rounded-[var(--radius-sm)] border border-[color:var(--border)]",
            "bg-[color:color-mix(in oklab,var(--card) 92%,transparent)] px-2.5 py-2 text-xs text-[color:var(--fg)]",
            "shadow-[var(--shadow-ambient)] backdrop-blur-xl"
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[color:color-mix(in oklab,var(--card) 92%,transparent)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
