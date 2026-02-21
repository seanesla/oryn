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

      // Clamp to the real scroll limit so we never ask Lenis to scroll
      // further than the page allows. Without this, Lenis silently clamps
      // internally and `onComplete` fires at the wrong position.
      const clamped = Math.min(Math.max(0, target), lenis.limit);

      // Increment the token so any in-flight snap's onComplete becomes stale.
      const token = ++snapTokenRef.current;

      isSnapping.current = true;
      snapTargetRef.current = clamped;
      snapStartedAtRef.current = Date.now();

      lenis.scrollTo(clamped, {
        onComplete: () => {
          // Only clear state if this is still the active snap (token matches).
          if (snapTokenRef.current === token) {
            // Hard-land on the exact pixel. The animated scrollTo settles
            // asymptotically and onComplete fires when the gap is < ~0.1px,
            // meaning window.scrollY (which browsers floor to integers) can
            // still be 1px short of the section top. The immediate call
            // costs nothing visually and guarantees the exact integer is set.
            lenis.scrollTo(clamped, { immediate: true });
            // Explicitly tell ScrollTrigger to re-evaluate at the new
            // position. The immediate scrollTo fires a Lenis scroll event
            // which normally reaches ScrollTrigger via LenisGsapBridge, but
            // calling update() here guarantees it runs synchronously before
            // any timer or re-render, so "top top" triggers fire on the
            // same tick the snap finishes.
            ScrollTrigger.update();
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
        .map((el) => {
          // Math.ceil ensures the snap target is always an integer >= the
          // fractional document offset of the section. Browsers floor
          // window.scrollY to integers, so without rounding up a section at
          // offset 924.3 would have the snap land at scrollY=924 — one pixel
          // short of GSAP's "top top" threshold of 924.3 — requiring the user
          // to manually scroll one more pixel to trigger the reveal animation.
          return Math.ceil(el.getBoundingClientRect().top + window.scrollY);
        })
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);

      if (!tops.length) return;

      // Direction-aware midpoint snapping.
      //
      // Instead of snapping to the nearest section top (which can pull
      // backward when a section is taller than the viewport), we bracket
      // `destination` between the section top behind it and the one ahead,
      // then commit to whichever side the user has passed the midpoint of.
      // This matches the intent of their scroll gesture on every section,
      // including the last one — no special-casing needed.
      const dir = lastDirectionRef.current;

      // Section top at or before destination (the one "behind" the user).
      let prev: number | null = null;
      // First section top strictly ahead of destination.
      let next: number | null = null;

      for (const top of tops) {
        if (top <= destination) {
          if (prev === null || top > prev) prev = top;
        } else {
          if (next === null || top < next) next = top;
        }
      }

      let best: number;

      if (prev === null) {
        // Scrolled above the first section — snap to it.
        best = tops[0];
      } else if (next === null) {
        // Scrolled past all section tops — snap to the last one.
        best = tops[tops.length - 1];
      } else {
        // Bracket found. Snap forward if the user has crossed the midpoint
        // in the scroll direction, otherwise snap back.
        const midpoint = (prev + next) / 2;
        if (dir === 1) {
          best = destination >= midpoint ? next : prev;
        } else {
          best = destination <= midpoint ? prev : next;
        }
      }

      // Already essentially aligned — nothing to do.
      // Tolerance is intentionally tight (0.5px) so a subpixel gap between
      // the current scroll position and a section top still triggers a snap.
      // The old 5px window was wide enough to swallow the rounding error and
      // leave content stuck invisible because "top top" never fired.
      if (Math.abs(destination - best) <= 0.5) return;

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
