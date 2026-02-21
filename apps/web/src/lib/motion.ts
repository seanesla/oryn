export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const MOTION_DUR = {
  fast: 0.16,
  normal: 0.28,
  slow: 0.46,
  cinematic: 0.7,
} as const;

/** Ease curve for the exit phase of a zone transition (smooth in-out). */
const CROSS_EXIT_EASE = [0.65, 0, 0.35, 1] as const;

/** Duration for the exit phase — snappy dismissal. */
const CROSS_EXIT_DUR = 0.5;

/** Duration for the enter phase — dramatic reveal. */
const CROSS_ENTER_DUR = 0.7;

export function enterTransition(shouldReduce: boolean, delay = 0) {
  return shouldReduce
    ? { duration: 0 }
    : { duration: MOTION_DUR.slow, delay, ease: MOTION_EASE };
}

/**
 * Transition used when navigating between the landing page and the app
 * (a "zone" change). Enter phase: 0.7s dramatic deceleration.
 */
export function crossBoundaryTransition(shouldReduce: boolean) {
  return shouldReduce
    ? { duration: 0 }
    : { duration: CROSS_ENTER_DUR, ease: MOTION_EASE };
}

/**
 * Shorter, snappier transition applied to the exit phase of a zone change.
 * Passed inline on the `exit` prop so it overrides the enter transition.
 */
export function crossBoundaryExitTransition(shouldReduce: boolean) {
  return shouldReduce
    ? { duration: 0 }
    : { duration: CROSS_EXIT_DUR, ease: CROSS_EXIT_EASE };
}

export function interactiveSpring(shouldReduce: boolean) {
  return shouldReduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 360, damping: 28, mass: 0.6 };
}
