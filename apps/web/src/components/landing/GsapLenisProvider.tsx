"use client";

import { useCallback, useEffect, useRef } from "react";
import { ReactLenis, useLenis } from "lenis/react";

import { gsap, ScrollTrigger, registerGsapPlugins } from "@/lib/gsap";

registerGsapPlugins();

/**
 * Inner bridge that wires Lenis → GSAP ticker.
 *
 * Must be rendered as a child of `<ReactLenis>` so the `useLenis` hook
 * can read from the Lenis context. `useLenis()` returns the Lenis
 * instance only once ReactLenis has created it, so we never hit the old
 * race condition where a ref-based useEffect fires before the instance
 * exists — which silently skipped setup and left wheel events captured
 * but never processed (the scroll-lock bug).
 */
function LenisGsapBridge() {
  const bridgedRef = useRef(false);

  // Register a scroll callback so ScrollTrigger stays in sync with
  // Lenis on every scroll frame.
  useLenis(() => {
    ScrollTrigger.update();
  });

  // useLenis() returns the Lenis instance (or undefined before init).
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis || bridgedRef.current) return;
    bridgedRef.current = true;

    const update = (time: number) => {
      // GSAP ticker gives seconds; Lenis expects ms.
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);

    // Re-enable lag smoothing so GSAP caps the time delta after heavy
    // frames (e.g. WebGL stalls). Without this, a 50 ms frame causes
    // GSAP to "replay" all missed time at once, producing a visible
    // jump in every scrubbed timeline. 500 ms threshold / 33 ms cap
    // is the GSAP default and prevents those jumps.
    gsap.ticker.lagSmoothing(500, 33);

    // Delay ScrollTrigger.refresh() until fonts finish loading so pin
    // start/end measurements use final element heights (font swap can
    // change line counts and section height).
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      gsap.ticker.remove(update);
      bridgedRef.current = false;
    };
  }, [lenis]);

  return null;
}

/**
 * Instant between-section snap using Lenis's native `scrollTo`.
 *
 * When the user stops scrolling near a section boundary, this component
 * nudges the scroll to land cleanly at the next/previous section start.
 *
 * Direction-aware: snaps forward/backward to the next/previous section
 * start. This feels more intentional than pure closest-boundary snapping.
 *
 * We intentionally avoid GSAP's built-in `snap` property because its
 * per-frame `scrollTo` calls conflict with Lenis's scroll smoothing.
 */

// ── Snap tuning constants ─────────────────────────────────────────────────────

/** Ms to wait after Lenis targetScroll stabilizes before triggering a snap. */
// Small delay so rapid flicks aren't interrupted by premature snaps.
const SNAP_IDLE_DELAY = 100;
/** Fraction of viewport height used as catch radius for near-boundary nudge. */
const SNAP_NEAR_RADIUS = 0.5;
/** Px tolerance when comparing Lenis targetScroll to our snap target. */
const SNAP_INTERRUPT_TOLERANCE = 5;
/**
 * Ms grace period after starting a snap before we check for interruption.
 * Gives Lenis one raf cycle to process the scrollTo and update targetScroll
 * so the divergence check doesn't false-positive on the very first frame.
 */
const SNAP_GRACE_MS = 50;

const SCENE_SELECTOR = "[data-landing-scene]";

function LenisSectionSnap() {
  const lenis = useLenis();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isSnapping = useRef(false);
  /** The scroll position we asked Lenis to animate toward. */
  const snapTargetRef = useRef<number | null>(null);
  /** Timestamp when the current snap started (for grace period). */
  const snapStartedAtRef = useRef(0);

  /**
   * Monotonically increasing token so an old snap's `onComplete` callback
   * can't accidentally clear state belonging to a newer snap.
   */
  const snapTokenRef = useRef(0);

  const lastScrollRef = useRef(0);
  /** Previous frame's targetScroll — used to detect input cessation. */
  const lastTargetRef = useRef(0);
  /** 1 = down, -1 = up. Updated from scroll delta, not Lenis direction. */
  const lastDirectionRef = useRef<1 | -1>(1);
  /** True once we've seen meaningful movement; prevents snap on page load. */
  const wasMovingRef = useRef(false);

  /** Start an animated snap to `target`. */
  const snapTo = useCallback(
    (target: number) => {
      if (!lenis) return;

      // Increment the token so any in-flight snap's onComplete becomes stale.
      const token = ++snapTokenRef.current;

      isSnapping.current = true;
      snapTargetRef.current = target;
      snapStartedAtRef.current = Date.now();

      lenis.scrollTo(target, {
        onComplete: () => {
          // Only clear state if this is still the active snap (token matches).
          if (snapTokenRef.current === token) {
            isSnapping.current = false;
            snapTargetRef.current = null;
          }
        },
      });
    },
    [lenis],
  );

  const snapFrom = useCallback(
    (destination: number) => {
      if (!lenis || isSnapping.current) return;

      const sections = Array.from(
        document.querySelectorAll<HTMLElement>(SCENE_SELECTOR),
      );

      if (!sections.length) return;

      const tops = sections
        .map((el) => el.getBoundingClientRect().top + window.scrollY)
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);

      if (!tops.length) return;

      // Find the closest section top to `destination`.
      // Use scroll direction as a tiebreaker when two boundaries are
      // roughly equidistant (within 10% of viewport height).
      const tieZone = window.innerHeight * 0.1;

      let best: number | null = null;
      let bestDist = Infinity;

      for (const top of tops) {
        const dist = Math.abs(destination - top);
        if (dist < bestDist) {
          bestDist = dist;
          best = top;
        }
      }

      if (best === null) return;

      // Already essentially aligned — nothing to do.
      if (bestDist <= 5) return;

      // Tiebreaker: if two candidates are close in distance, prefer the
      // one in the current scroll direction.
      const dir = lastDirectionRef.current;
      for (const top of tops) {
        if (top === best) continue;
        const dist = Math.abs(destination - top);
        if (Math.abs(dist - bestDist) < tieZone) {
          // This candidate is roughly the same distance — prefer the one
          // that matches scroll direction.
          const bestInDir = dir === 1 ? best > destination : best < destination;
          const candInDir = dir === 1 ? top > destination : top < destination;
          if (!bestInDir && candInDir) {
            best = top;
            break;
          }
        }
      }

      snapTo(best);
    },
    [lenis, snapTo],
  );

  // Listen to every Lenis scroll frame. Track direction, detect when user
  // input has stopped (via targetScroll stability), and handle snap
  // interruption recovery.
  useLenis(
    (l: { velocity: number; scroll: number; targetScroll: number }) => {
      // ── Snap interruption recovery ────────────────────────────────────
      // If the user scrolls during an animated snap, Lenis updates its
      // internal targetScroll away from our snap target. Detect that and
      // invalidate the snap token + clear state so the stale onComplete
      // callback becomes a no-op and future snaps aren't blocked.
      // Skip the check during the grace period (first ~50 ms) so Lenis
      // has time to process the scrollTo and update its targetScroll.
      if (isSnapping.current) {
        const elapsed = Date.now() - snapStartedAtRef.current;
        if (
          elapsed > SNAP_GRACE_MS &&
          snapTargetRef.current !== null &&
          Math.abs(l.targetScroll - snapTargetRef.current) >
            SNAP_INTERRUPT_TOLERANCE
        ) {
          // Invalidate the in-flight snap's token so its onComplete is a no-op.
          snapTokenRef.current++;
          isSnapping.current = false;
          snapTargetRef.current = null;
        }
        return;
      }

      // ── Direction tracking (from actual scroll delta) ─────────────────
      const delta = l.scroll - lastScrollRef.current;
      lastScrollRef.current = l.scroll;
      if (Math.abs(delta) > 0.5) {
        lastDirectionRef.current = delta > 0 ? 1 : -1;
      }

      // ── Input-cessation detection via targetScroll stability ──────────
      // When the user is actively scrolling, each input event updates
      // Lenis's targetScroll. Once they lift their finger / stop the wheel,
      // targetScroll stabilizes. We use that stability as the idle signal
      // instead of velocity (which decays too slowly with low lerp).
      const targetMoved =
        Math.abs(l.targetScroll - lastTargetRef.current) > 1;
      lastTargetRef.current = l.targetScroll;

      if (targetMoved) {
        wasMovingRef.current = true;
        clearTimeout(idleTimer.current);
        idleTimer.current = undefined;
        return;
      }

      // Only schedule once after we've detected real movement.
      if (!wasMovingRef.current || idleTimer.current) return;

      idleTimer.current = setTimeout(() => {
        idleTimer.current = undefined;
        wasMovingRef.current = false;
        // Snap based on WHERE LENIS IS HEADING (targetScroll), not where
        // the animated scroll currently is.
        snapFrom(l.targetScroll);
      }, SNAP_IDLE_DELAY);
    },
  );

  // Clean up timer on unmount.
  useEffect(() => {
    return () => clearTimeout(idleTimer.current);
  }, []);

  return null;
}

export function GsapLenisProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        smoothWheel: true,
        wheelMultiplier: 0.8,
        lerp: 0.12,
        duration: 1.2,
        orientation: "vertical",
        gestureOrientation: "vertical",
        syncTouch: false,
      }}
    >
      <LenisGsapBridge />
      <LenisSectionSnap />
      {children}
    </ReactLenis>
  );
}
