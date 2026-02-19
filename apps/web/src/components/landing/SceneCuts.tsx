"use client";

import { motion, useMotionTemplate, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";

import { cn } from "@/lib/cn";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";

const CUT_WAVE = [32, 70, 44, 92, 56, 80, 36, 62, 50, 84, 40, 74, 28, 60, 48, 88, 38, 66, 46, 78, 34, 58];

const CUT_TRACE = [
  "query  ->  semantic search",
  "rank   ->  source trust score",
  "filter ->  date + domain check",
  "select ->  top 3 sources",
  "attach ->  evidence card",
];

function useReducedProgress(progress: MotionValue<number>) {
  const shouldReduce = useReducedMotion();
  return useTransform(progress, (v) => (shouldReduce ? 0 : v));
}

export function CutIrisPortal({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const p = useReducedProgress(progress);

  const radius = useTransform(p, [0, 1], [0, 140]);
  const clipPath = useMotionTemplate`circle(${radius}% at 50% 115%)`;
  const opacity = useTransform(p, [0, 0.4, 1], [0, 0.55, 1]);
  const blur = useTransform(p, [0, 1], [18, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          opacity,
          clipPath,
          filter,
          background:
            "radial-gradient(80% 80% at 50% 85%, color-mix(in oklab, var(--accent) 28%, transparent), transparent 62%), radial-gradient(90% 90% at 40% 95%, color-mix(in oklab, var(--accent-2) 18%, transparent), transparent 66%)",
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[1px]"
        style={{
          opacity,
          background:
            "linear-gradient(to right, transparent 0%, color-mix(in oklab, var(--accent) 60%, transparent) 18%, color-mix(in oklab, var(--accent-2) 44%, transparent) 50%, color-mix(in oklab, var(--accent) 60%, transparent) 82%, transparent 100%)",
        }}
      />
    </div>
  );
}

export function CutWaveSweep({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const p = useReducedProgress(progress);

  const opacity = useTransform(p, [0, 0.2, 1], [0, 0.75, 1]);
  const lift = useTransform(p, [0, 1], [90, 0]);
  const scale = useTransform(p, [0, 1], [0.92, 1]);

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[260px]"
        style={{
          opacity,
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--bg) 92%, transparent) 0%, transparent 70%)",
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1400px] px-6"
        style={{ y: lift, opacity, scale }}
      >
        <div className="relative grid grid-cols-[repeat(22,minmax(0,1fr))] items-end gap-1.5">
          {CUT_WAVE.map((h, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                height: `${h}%`,
                transformOrigin: "bottom",
                scaleY: p,
                background: `color-mix(in oklab, var(--accent) ${48 + (i % 4) * 10}%, var(--accent-2))`,
                opacity: 0.42,
                filter: "blur(0.2px)",
              }}
            />
          ))}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-[1px]"
            style={{
              opacity,
              background:
                "linear-gradient(to right, transparent 0%, color-mix(in oklab, var(--accent) 72%, transparent) 20%, color-mix(in oklab, var(--accent-2) 58%, transparent) 52%, color-mix(in oklab, var(--accent) 72%, transparent) 84%, transparent 100%)",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export function CutTraceScan({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const p = useReducedProgress(progress);

  const opacity = useTransform(p, [0, 0.18, 1], [0, 0.8, 1]);
  const y = useTransform(p, [0, 1], [120, 0]);
  const scale = useTransform(p, [0, 1], [0.94, 1]);
  const clipT = useTransform(p, [0, 1], [100, 0]);
  const clipPath = useMotionTemplate`inset(${clipT}% 0% 0% 0%)`;

  const scrollY = useTransform(p, [0, 1], [18, -92]);

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[320px]"
        style={{
          opacity,
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--bg) 96%, transparent) 0%, transparent 78%)",
        }}
      />

      <motion.div
        className="absolute bottom-8 right-6 w-[min(520px,calc(100vw-3rem))]"
        style={{ opacity, y, scale, clipPath }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted-fg)]">
              Retrieval trace
            </div>
            <Badge tone="accent">LIVE</Badge>
          </div>

          <div className="relative mt-3 rounded-[0.7rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)]">
            <div aria-hidden className="landing-scanline pointer-events-none absolute inset-0" />
            <ScrollArea className="h-[150px]">
              <div className="relative p-3 font-mono text-[11px] leading-relaxed text-[color:var(--muted-fg)]">
                <motion.div style={{ y: scrollY }}>
                  {CUT_TRACE.concat(CUT_TRACE).map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[color:color-mix(in_oklab,var(--accent)_70%,var(--muted-fg))]">$</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </ScrollArea>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export function CutGateLock({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const p = useReducedProgress(progress);

  const opacity = useTransform(p, [0, 0.2, 1], [0, 0.9, 1]);
  const y = useTransform(p, [0, 1], [70, 0]);
  const scale = useTransform(p, [0, 1], [0.95, 1]);
  const lineScale = useTransform(p, [0, 1], [0, 1]);

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[260px]"
        style={{
          opacity,
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--bg) 94%, transparent) 0%, transparent 74%)",
        }}
      />

      <motion.div
        className="absolute inset-x-0 bottom-10 mx-auto w-full max-w-[1200px] px-6"
        style={{ opacity, y, scale }}
      >
        <div className="grid gap-4">
          <motion.div
            aria-hidden
            className="h-[2px] w-full"
            style={{
              scaleX: lineScale,
              transformOrigin: "left",
              background:
                "linear-gradient(to right, color-mix(in oklab, var(--accent) 70%, transparent), color-mix(in oklab, var(--accent-2) 65%, transparent), transparent)",
              boxShadow:
                "0 0 0 1px color-mix(in oklab, var(--accent) 18%, transparent), 0 18px 40px -22px color-mix(in oklab, var(--accent) 42%, transparent)",
              opacity: 0.9,
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="good">
                <CheckCircle2 className="h-3.5 w-3.5" /> Evidence card attached
              </Badge>
              <Badge tone="accent">
                <CheckCircle2 className="h-3.5 w-3.5" /> Citation path shown
              </Badge>
              <Badge tone="warn">
                <CheckCircle2 className="h-3.5 w-3.5" /> Counter-frame included
              </Badge>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted-fg)] opacity-80">
              Unsupported claims blocked
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function CutTabsGlitch({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const p = useReducedProgress(progress);

  const opacity = useTransform(p, [0, 0.15, 1], [0, 0.9, 1]);
  const y = useTransform(p, [0, 1], [90, 0]);
  const blur = useTransform(p, [0, 1], [12, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  const items = [
    { v: "a", label: "Policy" },
    { v: "b", label: "Research" },
    { v: "c", label: "Product" },
    { v: "d", label: "PR" },
  ] as const;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[240px]"
        style={{
          opacity,
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--bg) 96%, transparent) 0%, transparent 72%)",
        }}
      />

      <motion.div
        className="absolute inset-x-0 bottom-10 mx-auto w-full max-w-[980px] px-6"
        style={{ opacity, y, filter }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted-fg)] opacity-80">
            Choose a use-case
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted-fg)] opacity-60">
            (no feeds)
          </div>
        </div>

        <Tabs defaultValue="a">
          <TabsList className="mt-3 w-full justify-between">
            {items.map((it, idx) => (
              <GlitchPill
                key={it.v}
                value={it.v}
                label={it.label}
                index={idx}
                progress={p}
              />
            ))}
          </TabsList>
        </Tabs>
      </motion.div>
    </div>
  );
}

function GlitchPill({
  value,
  label,
  index,
  progress,
}: {
  value: string;
  label: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const amp = 10 + index * 4;
  const x = useTransform(progress, [0, 1], [0, index % 2 === 0 ? amp : -amp]);
  const rot = useTransform(progress, [0, 1], [0, index % 2 === 0 ? 2.2 : -2.2]);
  const skew = useTransform(progress, [0, 1], [0, index % 2 === 0 ? 8 : -8]);
  const transform = useMotionTemplate`translateX(${x}px) rotate(${rot}deg) skewX(${skew}deg)`;

  return (
    <motion.div style={{ transform }} className="flex-1">
      <TabsTrigger value={value} className="w-full" tabIndex={-1} aria-hidden>
        {label}
      </TabsTrigger>
    </motion.div>
  );
}

export function CutAccordionCascade({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const p = useReducedProgress(progress);

  const opacity = useTransform(p, [0, 0.15, 1], [0, 0.85, 1]);
  const y = useTransform(p, [0, 1], [110, 0]);
  const scale = useTransform(p, [0, 1], [0.96, 1]);

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[260px]"
        style={{
          opacity,
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--bg) 96%, transparent) 0%, transparent 74%)",
        }}
      />

      <motion.div
        className="absolute inset-x-0 bottom-10 mx-auto w-full max-w-[980px] px-6"
        style={{ opacity, y, scale }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--muted-fg)]">
              FAQ
            </div>
            <Badge tone="neutral">
              <Plus className="h-3.5 w-3.5" /> Expand
            </Badge>
          </div>

          <div className="mt-3">
            <Accordion type="single" collapsible defaultValue="a1">
              <AccordionItem value="a1" className="border-b border-[color:var(--border-soft)] py-1">
                <AccordionTrigger className="text-sm" tabIndex={-1} aria-hidden>
                  Does it hallucinate?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-[color:var(--muted-fg)]">
                  Factual claims require evidence cards + citations.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="a2" className="border-b border-[color:var(--border-soft)] py-1">
                <AccordionTrigger className="text-sm" tabIndex={-1} aria-hidden>
                  Can I inspect the trace?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-[color:var(--muted-fg)]">
                  Yes — tool calls, constraints, and selection reasons.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="a3" className="py-1">
                <AccordionTrigger className="text-sm" tabIndex={-1} aria-hidden>
                  Why only 3 next reads?
                </AccordionTrigger>
                <AccordionContent className="text-xs text-[color:var(--muted-fg)]">
                  To avoid feeds and keep decisions deliberate.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export function CutCTAStamp({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const p = useReducedProgress(progress);

  const opacity = useTransform(p, [0, 0.15, 1], [0, 0.9, 1]);
  const y = useTransform(p, [0, 1], [140, 0]);
  const scale = useTransform(p, [0, 1], [0.92, 1]);
  const rot = useTransform(p, [0, 1], [-6, 0]);
  const filterBlur = useTransform(p, [0, 1], [10, 0]);
  const filter = useMotionTemplate`blur(${filterBlur}px)`;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0", className)}>
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[260px]"
        style={{
          opacity,
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--bg) 96%, transparent) 0%, transparent 74%)",
        }}
      />

      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-10 mx-auto flex w-full max-w-[980px] justify-center px-6"
        style={{ opacity, y, scale, rotate: rot, filter }}
      >
        <div className="rounded-[1rem] border border-[color:color-mix(in_oklab,var(--accent)_30%,var(--border))] bg-[color:color-mix(in_oklab,var(--surface-2)_40%,transparent)] p-2 backdrop-blur-[18px]">
          <Button size="lg" tabIndex={-1} aria-hidden>
            Open workspace <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
