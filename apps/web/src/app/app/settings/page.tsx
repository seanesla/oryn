"use client";

import { motion } from "motion/react";
import { Check, Palette, SlidersHorizontal } from "lucide-react";

import { useAccent } from "@/components/providers/AccentProvider";
import { useBackground } from "@/components/providers/BackgroundProvider";
import { BACKGROUND_QUALITY_OPTIONS } from "@/lib/backgroundPresets";
import type { SessionConstraints } from "@/lib/contracts";
import { useConstraints } from "@/lib/useConstraints";

import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

const QUALITY_LABELS: Record<(typeof BACKGROUND_QUALITY_OPTIONS)[number], string> = {
  performance: "Performance",
  balanced: "Balanced",
  cinematic: "Cinematic",
};

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* Animation config shared across section entries */
function sectionVariants(delaySeconds: number) {
  return {
    initial: { opacity: 0, y: 14, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { delay: delaySeconds, duration: 0.48, ease: EASE_OUT },
  };
}

/* ------------------------------------------------------------------ */
/*  Row: label + toggle                                                */
/* ------------------------------------------------------------------ */

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[color:var(--fg)]">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted-fg)]">
            {description}
          </div>
        )}
      </div>
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  SettingsPage                                                       */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { constraints, setConstraints } = useConstraints();
  const { accents, accent, setAccentId } = useAccent();
  const { quality, setQuality } = useBackground();

  return (
    <div className="relative z-10 w-full px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
      {/* ── Page heading ── */}
      <motion.div
        className="mb-8"
        {...sectionVariants(0)}
      >
        <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-[-0.035em]">
          Settings
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--muted-fg)]">
          Configure session defaults and appearance. Saved locally in your browser.
        </p>
      </motion.div>

      {/* ── Two-column grid ── */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-8">

        {/* ── LEFT: Session Defaults ── */}
        <motion.div {...sectionVariants(0.1)}>
          <Card className="h-full p-6">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[color:color-mix(in_oklab,var(--accent)_14%,var(--surface-2))]">
                <SlidersHorizontal className="h-4 w-4 text-[color:var(--accent)]" />
              </div>
              <h2 className="font-serif text-[clamp(1.3rem,2.4vw,1.7rem)] leading-tight tracking-[-0.02em]">
                Session Defaults
              </h2>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-[color:var(--muted-fg)]">
              Applied to every new session. You can always override per-session.
            </p>

            {/* Source constraints */}
            <div className="mb-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--muted-fg)]">
                Source constraints
              </div>
              <SettingRow
                label="Prefer primary sources"
                description="Government documents, papers, transcripts."
              >
                <Switch
                  checked={constraints.sourceConstraints.includes("prefer_primary")}
                  onCheckedChange={(checked) =>
                    setConstraints((c) => ({
                      ...c,
                      sourceConstraints: checked
                        ? Array.from(new Set([...c.sourceConstraints, "prefer_primary"]))
                        : c.sourceConstraints.filter((x) => x !== "prefer_primary"),
                    }))
                  }
                />
              </SettingRow>
              <SettingRow
                label="Prefer local sources"
                description="Regional reporting and direct stakeholders."
              >
                <Switch
                  checked={constraints.sourceConstraints.includes("prefer_local")}
                  onCheckedChange={(checked) =>
                    setConstraints((c) => ({
                      ...c,
                      sourceConstraints: checked
                        ? Array.from(new Set([...c.sourceConstraints, "prefer_local"]))
                        : c.sourceConstraints.filter((x) => x !== "prefer_local"),
                    }))
                  }
                />
              </SettingRow>
            </div>

            <Divider className="my-4" />

            {/* Segmented controls */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-fg)]">
                  Diversity target
                </div>
                <Segmented
                  value={constraints.diversityTarget}
                  onChange={(v) =>
                    setConstraints((c) => ({
                      ...c,
                      diversityTarget: v as SessionConstraints["diversityTarget"],
                    }))
                  }
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-fg)]">
                  Max citations
                </div>
                <Segmented
                  value={String(constraints.maxCitations)}
                  onChange={(v) =>
                    setConstraints((c) => ({
                      ...c,
                      maxCitations: Number(v) as SessionConstraints["maxCitations"],
                    }))
                  }
                  options={[
                    { value: "3", label: "3" },
                    { value: "5", label: "5" },
                    { value: "8", label: "8" },
                  ]}
                />
              </div>
            </div>

            <Divider className="my-4" />

            {/* Behaviour toggles */}
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--muted-fg)]">
                Behaviour
              </div>
              <SettingRow
                label="Show low-confidence cards"
                description="Keep uncertainty visible in your evidence feed."
              >
                <Switch
                  checked={constraints.showLowConfidence}
                  onCheckedChange={(checked) =>
                    setConstraints((c) => ({ ...c, showLowConfidence: checked }))
                  }
                />
              </SettingRow>
              <SettingRow
                label="No commentary mode"
                description="Only evidence cards — no narrative from the agent."
              >
                <Switch
                  checked={constraints.noCommentaryMode}
                  onCheckedChange={(checked) =>
                    setConstraints((c) => ({ ...c, noCommentaryMode: checked }))
                  }
                />
              </SettingRow>
            </div>
          </Card>
        </motion.div>

        {/* ── RIGHT: Appearance ── */}
        <motion.div {...sectionVariants(0.2)}>
          <Card className="h-full p-6">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[color:color-mix(in_oklab,var(--accent)_14%,var(--surface-2))]">
                <Palette className="h-4 w-4 text-[color:var(--accent)]" />
              </div>
              <h2 className="font-serif text-[clamp(1.3rem,2.4vw,1.7rem)] leading-tight tracking-[-0.02em]">
                Appearance
              </h2>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-[color:var(--muted-fg)]">
              Choose an accent color and background rendering quality.
            </p>

            {/* Accent color — large circular swatches */}
            <div className="mb-6">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-fg)]">
                Accent color
              </div>
              <div className="flex flex-wrap gap-3">
                {accents.map((a) => {
                  const isActive = accent.id === a.id;
                  return (
                    <Tooltip key={a.id} content={a.name}>
                      <button
                        type="button"
                        onClick={() => setAccentId(a.id)}
                        aria-label={a.name}
                        aria-pressed={isActive}
                        className={cn(
                          "relative h-11 w-11 rounded-full transition-all duration-200 focus-visible:outline-none",
                          isActive ? "scale-110" : "opacity-60 hover:opacity-90 hover:scale-105",
                        )}
                        style={{
                          background: a.accentHex,
                          boxShadow: isActive
                            ? `0 0 0 2px var(--card), 0 0 0 4px ${a.accentHex}, 0 4px 16px -4px ${a.accentHex}99`
                            : undefined,
                        }}
                      >
                        {isActive && (
                          <Check
                            className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm"
                          />
                        )}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <Divider className="mb-6" />

            {/* Background quality */}
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-fg)]">
                Background quality
              </div>
              <Segmented
                value={quality}
                onChange={(v) =>
                  setQuality(v as (typeof BACKGROUND_QUALITY_OPTIONS)[number])
                }
                options={BACKGROUND_QUALITY_OPTIONS.map((o) => ({
                  value: o,
                  label: QUALITY_LABELS[o],
                }))}
              />
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--muted-fg)]">
                {quality === "performance" &&
                  "Minimal GPU load — ideal for lower-powered devices or battery life."}
                {quality === "balanced" &&
                  "A blend of visual richness and smooth performance on most hardware."}
                {quality === "cinematic" &&
                  "Full post-processing effects. Requires a capable GPU for smooth 60 fps."}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
