"use client";

import { useTransform, type MotionValue } from "motion/react";

type ClipRevealShape = "inset" | "circle";

interface UseClipRevealOptions {
  shape?: ClipRevealShape;
  start?: number;
  end?: number;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function normalize(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp01((value - start) / (end - start));
}

export function useClipReveal(
  progress: MotionValue<number>,
  options: UseClipRevealOptions = {},
): MotionValue<string> {
  const { shape = "inset", start = 0.04, end = 0.74 } = options;

  return useTransform(progress, (value) => {
    const t = normalize(value, start, end);

    if (shape === "circle") {
      const radius = 10 + t * 96;
      return `circle(${radius}% at 50% 50%)`;
    }

    const verticalInset = (1 - t) * 26;
    const horizontalInset = (1 - t) * 20;
    const roundRadius = Math.max(0.35, 1.15 - t * 0.8);

    return `inset(${verticalInset}% ${horizontalInset}% ${verticalInset}% ${horizontalInset}% round ${roundRadius}rem)`;
  });
}
