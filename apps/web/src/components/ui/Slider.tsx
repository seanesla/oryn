"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/cn";

export function Slider({ className, ...props }: SliderPrimitive.SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[color:color-mix(in_oklab,var(--card)_82%,transparent)]">
        <SliderPrimitive.Range className="absolute h-full bg-[color:color-mix(in_oklab,var(--accent)_55%,transparent)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-[color:color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[color:var(--card-2)] shadow-[var(--shadow-ambient)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" />
    </SliderPrimitive.Root>
  );
}
