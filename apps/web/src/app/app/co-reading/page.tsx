import { SessionSetupPanel } from "@/components/session/SessionSetupPanel";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function AppHomePage() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <section className="section-label">Session Start</section>
      <div className="mt-3 mb-8 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="panel-elevated rounded-[0.9rem] p-5 sm:p-6">
          <div className="font-serif text-[clamp(1.7rem,3.4vw,2.3rem)] leading-tight tracking-[-0.024em]">
            Co-reading that stays grounded.
          </div>
          <div className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--muted-fg)]">
            Paste a link or speak a claim. The UI only shows what it can support with evidence cards and a visible retrieval trace.
          </div>
          <div className="mt-4">
            <Badge tone="accent">Judge mode: evidence-first</Badge>
          </div>
        </div>

        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">Checklist</div>
          <div className="mt-3 space-y-2">
            <ChecklistItem text="Pick mode (URL or claim check)" />
            <ChecklistItem text="Set constraints if needed" />
            <ChecklistItem text="Start analysis" />
          </div>
        </Card>
      </div>

      <SessionSetupPanel />
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="rounded-[0.56rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_88%,transparent)] px-3 py-2 text-xs text-[color:var(--fg)]">
      {text}
    </div>
  );
}
