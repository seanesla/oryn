"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import { Check, Palette } from "lucide-react";

import { useAccent } from "@/components/providers/AccentProvider";
import { cn } from "@/lib/cn";

export function AccentPicker() {
  const { accents, accent, setAccentId } = useAccent();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Theme"
          className={cn(
            "inline-flex h-8.5 items-center gap-2 rounded-[0.58rem] border border-[color:var(--border-soft)]",
            "bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] px-3 text-xs text-[color:var(--muted-fg)]",
            "hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))]"
          )}
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
          <span className="h-3.5 w-3.5 rounded-[3px]" style={{ background: "var(--accent)" }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={10}
          align="end"
          className={cn(
            "z-50 w-56 rounded-[0.9rem] border border-[color:var(--border)]",
            "bg-[color:color-mix(in_oklab,var(--card)_96%,transparent)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl"
          )}
        >
          <div className="px-2 pb-2 pt-1 text-[11px] text-[color:var(--muted-fg)]">Color accent. Saved locally.</div>
          {accents.map((a) => (
            <DropdownMenu.Item
              key={a.id}
              onSelect={() => setAccentId(a.id)}
              className={cn(
                "flex cursor-default select-none items-center gap-2 rounded-[0.65rem] px-2 py-2 text-sm",
                "text-[color:var(--fg)] outline-none",
                "focus:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--card))]"
              )}
            >
              <span className="h-3.5 w-3.5 rounded-[3px]" style={{ background: a.accentHex }} />
              <span className="flex-1">{a.name}</span>
              {accent.id === a.id ? <Check className="h-4 w-4 text-[color:var(--accent)]" /> : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
