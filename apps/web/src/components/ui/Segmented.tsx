"use client";

import { cn } from "@/lib/cn";

export type SegmentedProps = {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
};

export function Segmented({ value, onChange, options }: SegmentedProps) {
  return (
    <div className="inline-flex rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 rounded-[0.45rem] px-3 text-xs font-medium transition",
              active
                ? "bg-[color:color-mix(in_oklab,var(--accent)_16%,var(--surface-2))] text-[color:var(--fg)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_30%,var(--border))]"
                : "text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
