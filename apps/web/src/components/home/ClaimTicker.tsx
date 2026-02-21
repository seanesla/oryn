"use client";

import { useReducedMotion } from "motion/react";

/* ------------------------------------------------------------------ */
/*  Claims that scroll across the ticker bar                           */
/* ------------------------------------------------------------------ */

const CLAIMS = [
  "\"EVs produce more lifetime emissions than gas cars\"",
  "\"Remote work decreases team productivity\"",
  "\"Rent control makes housing less affordable\"",
  "\"Lab-grown meat uses more energy than beef farming\"",
  "\"Social media algorithms amplify political outrage\"",
  "\"Antidepressants are no better than placebo for mild depression\"",
  "\"Trade deficits harm domestic employment\"",
  "\"Charter schools outperform public schools\"",
  "\"Higher minimum wage increases unemployment\"",
  "\"Immigration suppresses wages for native workers\"",
  "\"Nuclear energy is inherently too dangerous to scale\"",
  "\"Screen time causes teen mental health crises\"",
];

/* Tiny dot separator between claim items */
function Dot() {
  return (
    <span
      aria-hidden
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: "color-mix(in oklab, var(--accent) 45%, transparent)" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  ClaimTicker                                                        */
/* ------------------------------------------------------------------ */

export function ClaimTicker() {
  const shouldReduceMotion = useReducedMotion();

  /* Respect user's reduced-motion preference — skip the ticker entirely */
  if (shouldReduceMotion) return null;

  return (
    <div
      aria-hidden
      className="group hidden md:block relative overflow-hidden rounded-full border border-[color:var(--border-soft)] py-2.5 backdrop-blur-sm"
      style={{
        background: "color-mix(in oklab, var(--surface-3) 55%, transparent)",
      }}
    >
      {/* Left fade mask */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20"
        style={{
          background:
            "linear-gradient(to right, color-mix(in oklab, var(--surface-3) 55%, transparent), transparent)",
        }}
      />
      {/* Right fade mask */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20"
        style={{
          background:
            "linear-gradient(to left, color-mix(in oklab, var(--surface-3) 55%, transparent), transparent)",
        }}
      />

      {/*
        Two identical copies of the claim list in a single flex row.
        The whole row animates from 0 → -50% (exactly one copy width),
        creating a seamless infinite loop. Pauses on hover.
      */}
      <div
        className="flex items-center gap-8 animate-[ticker_70s_linear_infinite] group-hover:[animation-play-state:paused]"
        style={{ width: "max-content" }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-8">
            {CLAIMS.map((claim, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center gap-3 whitespace-nowrap text-[11px] font-medium text-[color:var(--muted-fg)]"
              >
                <Dot />
                {claim}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
