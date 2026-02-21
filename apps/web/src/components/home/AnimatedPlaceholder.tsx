"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/* ------------------------------------------------------------------ */
/*  Example content pools                                              */
/* ------------------------------------------------------------------ */

export const URL_EXAMPLES = [
  "https://nytimes.com/2024/technology/ai-in-classrooms.html",
  "https://reuters.com/sustainability/climate-energy/2024-policy",
  "https://theguardian.com/science/2024/vaccine-efficacy-study",
  "https://wsj.com/economy/federal-reserve-rate-decision-2024",
  "https://apnews.com/article/housing-market-affordability-analysis",
];

export const CLAIM_EXAMPLES = [
  "Electric vehicles produce more lifetime emissions than gas cars",
  "Remote work decreases team productivity long-term",
  "Charter schools consistently outperform public schools",
  "Higher minimum wage significantly increases unemployment",
];

/* ------------------------------------------------------------------ */
/*  useTypingPlaceholder hook                                          */
/*                                                                     */
/*  Returns an animated string that types through the example pool,   */
/*  then deletes, cycles to the next. Pass `active: false` (e.g.       */
/*  when the real input is focused) to blank-out and pause.            */
/* ------------------------------------------------------------------ */

export function useTypingPlaceholder(
  examples: string[],
  active: boolean,
): string {
  const shouldReduceMotion = useReducedMotion();
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">(
    "typing",
  );

  useEffect(() => {
    if (!active || shouldReduceMotion) {
      setText("");
      return;
    }

    const target = examples[idx % examples.length]!;

    if (phase === "typing") {
      if (text.length < target.length) {
        /* Natural typing: slight random variance per character */
        const delay = 38 + Math.random() * 32;
        const t = setTimeout(
          () => setText(target.slice(0, text.length + 1)),
          delay,
        );
        return () => clearTimeout(t);
      } else {
        /* Finished typing — hold before deleting */
        const t = setTimeout(() => setPhase("holding"), 2400);
        return () => clearTimeout(t);
      }
    }

    if (phase === "holding") {
      const t = setTimeout(() => setPhase("deleting"), 500);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), 18);
        return () => clearTimeout(t);
      } else {
        setIdx((i) => i + 1);
        setPhase("typing");
      }
    }
  }, [active, examples, idx, phase, shouldReduceMotion, text]);

  return text;
}
