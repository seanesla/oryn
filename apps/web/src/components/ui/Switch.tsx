"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/cn";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border",
        "border-[color:var(--border)] bg-[color:color-mix(in oklab,var(--card) 92%,transparent)]",
        "data-[state=checked]:border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border))]",
        "data-[state=checked]:bg-[color:color-mix(in_oklab,var(--accent)_18%,var(--card))]",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-4.5 w-4.5 translate-x-[3px] rounded-full bg-[color:var(--fg)]",
          "transition-transform data-[state=checked]:translate-x-[20px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
