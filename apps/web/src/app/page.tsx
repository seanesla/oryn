"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { ArrowRight, AudioLines, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
      <section className="section-label">Product</section>
      <section className="panel-elevated relative mt-3 overflow-hidden rounded-[1rem] p-6 sm:p-10">
        <motion.div
          aria-hidden
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72"
          style={{
            background:
              "radial-gradient(circle at center, color-mix(in oklab,var(--accent) 24%, transparent), transparent 70%)",
            filter: "blur(18px)",
            opacity: 0.65,
          }}
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.9fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="mb-5 flex flex-wrap items-center gap-2"
            >
              <Badge tone="good">Evidence-first</Badge>
              <Badge tone="neutral">Live co-reading</Badge>
              <Badge tone="accent">Audit trace</Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl font-serif text-[clamp(2.2rem,7vw,4.6rem)] leading-[1.01] tracking-[-0.035em]"
            >
              Understand disagreement,
              <br />
              without losing the evidence.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[color:var(--muted-fg)]"
            >
              Oryn separates factual, causal, and value disputes, builds evidence cards with counter-frames, and recommends only three deliberate next reads.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button size="lg" onClick={() => router.push("/app")}>
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push("/history")}>
                View history
              </Button>
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.74, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="panel-muted rounded-[0.8rem] p-4"
          >
            <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">What Oryn Guarantees</div>
            <div className="mt-3 space-y-3">
              <PhaseItem step="01" label="Grounding" text="No factual claim appears without a source-backed evidence card." />
              <PhaseItem step="02" label="Traceability" text="Every output links back to retrieval decisions and source selection." />
              <PhaseItem step="03" label="Deliberate choices" text="You get three next reads designed for coverage, not engagement loops." />
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="section-label mt-8">Why Teams Use It</section>
      <section className="mt-3 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <FeatureCard
          icon={<AudioLines className="h-4 w-4" />}
          title="Live voice, with interruption"
          text="Talk naturally, interrupt instantly, and keep a structured transcript while the analysis updates in real time."
          delay={0.05}
          featured
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <FeatureCard
            icon={<FileSearch className="h-4 w-4" />}
            title="Transparent retrieval trace"
            text="Every claim can be traced to query steps, constraints, and why sources were selected."
            delay={0.11}
          />
          <FeatureCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Hard epistemic contract"
            text="Unsupported claims are blocked by design until the system can show evidence and a citation path."
            delay={0.17}
          />
        </div>
      </section>

      <section className="mt-8">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-[-0.02em]">How a session works</div>
              <div className="mt-1 text-xs text-[color:var(--muted-fg)]">A short workflow designed for clarity, not volume.</div>
            </div>
            <Badge tone="neutral">3-step flow</Badge>
          </div>
          <Divider className="my-4" />
          <div className="grid gap-3 sm:grid-cols-3">
            <StepCard step="Step 01" text="Start with a URL or claim" />
            <StepCard step="Step 02" text="Review evidence and counter-evidence" />
            <StepCard step="Step 03" text="Decide what to read next" />
          </div>
        </Card>
      </section>

      <section className="panel-muted mt-8 rounded-[0.85rem] p-5 sm:p-6">
        <div className="text-sm font-semibold tracking-[-0.02em]">Built for high-trust reading and decision support</div>
        <div className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--muted-fg)]">
          Oryn is a product page here, and the workspace lives in a separate route. Use the button above to open the app interface when you are ready to run a session.
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-fg)]">
          <ChecklistChip text="Evidence cards required" />
          <ChecklistChip text="Counter-frame included" />
          <ChecklistChip text="Trace always visible" />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  delay,
  featured,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  delay: number;
  featured?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className={featured ? "h-full p-5" : "h-full p-4"}>
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-[0.45rem] border border-[color:color-mix(in_oklab,var(--accent)_24%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))] text-[color:var(--accent)]">
          {icon}
        </div>
        <div className={featured ? "mt-4 text-base font-semibold tracking-[-0.016em]" : "mt-3 text-sm font-semibold tracking-[-0.01em]"}>
          {title}
        </div>
        <p className={featured ? "mt-2 text-sm leading-relaxed text-[color:var(--muted-fg)]" : "mt-1 text-xs leading-relaxed text-[color:var(--muted-fg)]"}>
          {text}
        </p>
      </Card>
    </motion.div>
  );
}

function PhaseItem({ step, label, text }: { step: string; label: string; text: string }) {
  return (
    <div className="rounded-[0.62rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-2)_82%,transparent)] p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[color:var(--muted-fg)]">
        <span className="text-[color:var(--accent)]">{step}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-[color:var(--fg)]">{text}</div>
    </div>
  );
}

function StepCard({ step, text }: { step: string; text: string }) {
  return (
    <div className="rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_88%,transparent)] p-3 text-sm text-[color:var(--muted-fg)]">
      <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[color:var(--fg)]">{step}</div>
      {text}
    </div>
  );
}

function ChecklistChip({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[0.45rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-2)_86%,transparent)] px-2.5 py-1">
      <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--accent)]" />
      <span>{text}</span>
    </div>
  );
}
