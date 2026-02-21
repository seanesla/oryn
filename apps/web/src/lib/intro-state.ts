/**
 * Module-level singleton tracking whether the landing page intro animation
 * has been seen during this browser session.
 *
 * - Resets on hard page reload (correct: fresh load should show the intro).
 * - Survives client-side navigation (SPA route changes don't reload the module).
 *
 * This lets components like HeroSection and LandingDotNav skip their
 * intro-sync delays when the user navigates back from /app to /.
 */

let _hasSeenIntro = false;

/** Returns true if the intro animation has already played this session. */
export function hasSeenIntro(): boolean {
  return _hasSeenIntro;
}

/** Call this once when the intro animation finishes. */
export function markIntroSeen(): void {
  _hasSeenIntro = true;
}
