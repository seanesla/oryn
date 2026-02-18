"use client";

import { Lock, SlidersHorizontal } from "lucide-react";

import { useBackground } from "@/components/providers/BackgroundProvider";
import { BACKGROUND_QUALITY_OPTIONS } from "@/lib/backgroundPresets";
import { cn } from "@/lib/cn";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";

const QUALITY_LABELS: Record<(typeof BACKGROUND_QUALITY_OPTIONS)[number], string> = {
  performance: "Performance",
  balanced: "Balanced",
  cinematic: "Cinematic",
};

export default function SettingsPage() {
  const { background, quality, setQuality } = useBackground();

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <section className="section-label">Settings</section>

      <Card className="mt-3 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[color:var(--accent)]" />
          <h1 className="font-serif text-[clamp(1.5rem,3vw,2.1rem)] leading-tight tracking-[-0.02em]">Background</h1>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-fg)]">
          Background selection is now locked to a single default: Halo Reactor. This keeps the visual language consistent from landing to app.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{background.name}</Badge>
          <Badge tone="neutral">{background.family}</Badge>
          <Badge tone="neutral">Source: {background.sourceLibraryId}</Badge>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-[0.6rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_88%,transparent)] px-3 py-2 text-xs text-[color:var(--muted-fg)]">
          <Lock className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          Preset switching disabled
        </div>

        <Divider className="my-5" />

        <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Render quality</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {BACKGROUND_QUALITY_OPTIONS.map((option) => {
            const active = quality === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setQuality(option)}
                className={cn(
                  "rounded-[0.65rem] border px-3 py-2 text-left text-sm transition",
                  active
                    ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--surface-2))] text-[color:var(--fg)]"
                    : "border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_88%,transparent)] text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]"
                )}
              >
                <div className="font-medium tracking-[-0.01em]">{QUALITY_LABELS[option]}</div>
                <div className="mt-1 text-xs opacity-90">
                  {option === "performance"
                    ? "Lower GPU load."
                    : option === "balanced"
                      ? "Recommended for most devices."
                      : "Higher visual fidelity."}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
