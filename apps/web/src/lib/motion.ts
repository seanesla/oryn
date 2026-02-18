export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const MOTION_DUR = {
  fast: 0.16,
  normal: 0.28,
  slow: 0.46,
} as const;

export function enterTransition(shouldReduce: boolean, delay = 0) {
  return shouldReduce
    ? { duration: 0 }
    : { duration: MOTION_DUR.slow, delay, ease: MOTION_EASE };
}

export function interactiveSpring(shouldReduce: boolean) {
  return shouldReduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 360, damping: 28, mass: 0.6 };
}
