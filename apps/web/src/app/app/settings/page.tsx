"use client";

import { SlidersHorizontal } from "lucide-react";

import type { SessionConstraints } from "@/lib/contracts";
import { useConstraints } from "@/lib/useConstraints";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";

export default function SettingsPage() {
  const { constraints, setConstraints } = useConstraints();

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <section className="section-label">Settings</section>

      <Card className="mt-3 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[color:var(--accent)]" />
          <h1 className="font-serif text-[clamp(1.5rem,3vw,2.1rem)] leading-tight tracking-[-0.02em]">Session Defaults</h1>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-fg)]">
          These defaults apply to new sessions. You can always override them per-session.
        </p>

        <Divider className="my-5" />

        <Accordion type="single" collapsible defaultValue="constraints">
          <AccordionItem value="constraints" className="border-0">
            <AccordionTrigger className="rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] px-3">
              Constraints
              <span className="text-xs font-normal text-[color:var(--muted-fg)]">
                (grounding + choice-set behavior)
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-1">
              <div className="grid gap-4 rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] p-4">
                <div className="grid gap-2">
                  <div className="text-xs font-medium text-[color:var(--muted-fg)]">Source constraints</div>
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">Prefer primary sources</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Gov docs, papers, transcripts.</div>
                    </div>
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
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">Prefer local sources</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Regional reporting + direct stakeholders.</div>
                    </div>
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
                  </label>
                </div>

                <Divider />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-[color:var(--muted-fg)]">Diversity target</div>
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
                    <div className="text-xs font-medium text-[color:var(--muted-fg)]">Max citations</div>
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

                <Divider />

                <div className="grid gap-2">
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">Show low-confidence cards</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Keep uncertainty visible.</div>
                    </div>
                    <Switch
                      checked={constraints.showLowConfidence}
                      onCheckedChange={(checked) =>
                        setConstraints((c) => ({ ...c, showLowConfidence: checked }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2">
                    <div>
                      <div className="text-sm">No commentary mode</div>
                      <div className="text-xs text-[color:var(--muted-fg)]">Only evidence cards, no narrative.</div>
                    </div>
                    <Switch
                      checked={constraints.noCommentaryMode}
                      onCheckedChange={(checked) =>
                        setConstraints((c) => ({ ...c, noCommentaryMode: checked }))
                      }
                    />
                  </label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
