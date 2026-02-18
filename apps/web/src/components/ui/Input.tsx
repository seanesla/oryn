import * as React from "react";

import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[0.56rem] border border-[color:color-mix(in_oklab,var(--border-strong)_62%,var(--border))]",
        "bg-[color:color-mix(in oklab,var(--surface-2) 94%,transparent)] px-3 text-sm text-[color:var(--fg)]",
        "placeholder:text-[color:color-mix(in oklab,var(--muted-fg) 70%,transparent)]",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        "transition-[border-color,box-shadow,background-color]",
        className
      )}
      {...props}
    />
  );
}
