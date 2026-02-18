import * as React from "react";

import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = "solid",
  size = "md",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.58rem] border text-sm font-medium",
        "transition-[transform,background-color,border-color,box-shadow,opacity,color] duration-180",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3",
        size === "md" && "h-9.5 px-3.5",
        size === "lg" && "h-11 px-4.5",
        variant === "solid" &&
          "border-[color:color-mix(in oklab,var(--accent) 48%,var(--border))] bg-[color:color-mix(in oklab,var(--accent) 26%,var(--surface-1))] text-[color:var(--fg)] shadow-[var(--shadow-ambient)] hover:bg-[color:color-mix(in_oklab,var(--accent)_30%,var(--surface-1))]",
        variant === "outline" &&
          "border-[color:color-mix(in oklab,var(--border-strong) 76%,var(--border))] bg-[color:color-mix(in oklab,var(--surface-2) 96%,transparent)] text-[color:var(--fg)] hover:border-[color:color-mix(in oklab,var(--accent) 35%,var(--border))] hover:bg-[color:color-mix(in oklab,var(--surface-1) 96%,transparent)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[color:var(--muted-fg)] hover:text-[color:var(--fg)] hover:bg-[color:color-mix(in oklab,var(--surface-2) 88%,transparent)]",
        variant === "danger" &&
          "border-[color:color-mix(in oklab,var(--bad) 42%,var(--border))] bg-[color:color-mix(in oklab,var(--bad) 14%,var(--surface-1))] text-[color:var(--fg)] hover:border-[color:color-mix(in oklab,var(--bad) 60%,var(--border))]",
        !disabled && "hover:-translate-y-px active:translate-y-[0.5px]",
        className
      )}
      {...props}
    />
  );
}
