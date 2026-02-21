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
 * Gentle between-section snap using Lenis's native `scrollTo`.
 *
 * When the user stops scrolling near a pinned section boundary, this
 * component nudges the scroll to the nearest pin-start position so they
 * never get stuck in the dead zone between sections.
 *
 * Direction-aware: snaps forward (to next section start) when scrolling
 * down, backward (to previous section end) when scrolling up. This feels
 * more intentional than pure closest-boundary snapping.
 *
 * We intentionally avoid GSAP's built-in `snap` property because its
 * per-frame `scrollTo` calls conflict with Lenis's lerp interpolation,
 * resulting in sluggish or jittery snaps.
 */

// ── Snap tuning constants ─────────────────────────────────────────────────────

/**
 * Ms to wait after Lenis targetScroll stabilizes before triggering a snap.
 * Must exceed typical mouse-wheel tick intervals (~100–250 ms) to avoid
 * false triggers between individual wheel events.
 */
const SNAP_IDLE_DELAY = 200;
/** Programmatic scroll duration for every snap (seconds). */
const SNAP_DURATION = 1.2;
/** Quartic ease-out — long gentle deceleration at the tail. */
const SNAP_EASING = (t: number) => 1 - Math.pow(1 - t, 4);
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

function LenisSectionSnap() {
  const lenis = useLenis();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isSnapping = useRef(false);
  /** The scroll position we asked Lenis to animate toward. */
  const snapTargetRef = useRef<number | null>(null);
  /** Timestamp when the current snap started (for grace period). */
  const snapStartedAtRef = useRef(0);

  const lastScrollRef = useRef(0);
  /** Previous frame's targetScroll — used to detect input cessation. */
  const lastTargetRef = useRef(0);
  /** 1 = down, -1 = up. Updated from scroll delta, not Lenis direction. */
  const lastDirectionRef = useRef<1 | -1>(1);
  /** True once we've seen meaningful movement; prevents snap on page load. */
  const wasMovingRef = useRef(false);

  /** Start a snap to `target`. Shared by gap snap and near-boundary nudge. */
  const snapTo = useCallback(
    (target: number) => {
      if (!lenis) return;
      isSnapping.current = true;
      snapTargetRef.current = target;
      snapStartedAtRef.current = Date.now();
      lenis.scrollTo(target, {
        duration: SNAP_DURATION,
        easing: SNAP_EASING,
        onComplete: () => {
          isSnapping.current = false;
          snapTargetRef.current = null;
        },
      });
    },
    [lenis],
  );

  const snapFrom = useCallback(
    (destination: number) => {
      if (!lenis || isSnapping.current) return;

      const pinned = ScrollTrigger.getAll()
        .filter((st) => st.pin)
        .filter((st) => Number.isFinite(st.start) && Number.isFinite(st.end))
        .sort((a, b) => a.start - b.start);

      if (!pinned.length) return;

      // If the destination is inside a pinned range, no snap needed — the
      // user will land inside a section's scrubbed animation.
      for (const st of pinned) {
        if (destination >= st.start && destination <= st.end) return;
      }

      // If the destination is in a transition gap between pinned ranges
      // (the "limbo" zone), use scroll direction to decide which section
      // to land on.
      for (let i = 0; i < pinned.length - 1; i++) {
        const prev = pinned[i];
        const next = pinned[i + 1];
        if (destination > prev.end && destination < next.start) {
          const target =
            lastDirectionRef.current === 1 ? next.start : prev.end;
          snapTo(target);
          return;
        }
      }

      // Otherwise nudge when near any pinned section boundary (start or end).
      const boundaries = pinned.flatMap((st) => [st.start, st.end]);
      let nearest = boundaries[0];
      let minDist = Math.abs(destination - boundaries[0]);
      for (const b of boundaries) {
        const dist = Math.abs(destination - b);
        if (dist < minDist) {
          minDist = dist;
          nearest = b;
        }
      }

      const nearThreshold = window.innerHeight * SNAP_NEAR_RADIUS;
      if (minDist > 5 && minDist < nearThreshold) {
        snapTo(nearest);
      }
    },
    [lenis, snapTo],
  );

  // Listen to every Lenis scroll frame. Track direction, detect when user
  // input has stopped (via targetScroll stability), and handle snap
  // interruption recovery.
  useLenis(
    (l: { velocity: number; scroll: number; targetScroll: number }) => {
      // ── Snap interruption recovery ────────────────────────────────────
      // If the user scrolls during a programmatic snap, Lenis updates its
      // internal targetScroll away from our snap target. Detect that and
      // reset so future snaps aren't permanently blocked.
      // Skip the check during the grace period (first ~50 ms) so a 1-frame
      // delay between scrollTo and targetScroll updating doesn't cause a
      // false-positive reset.
      if (isSnapping.current) {
        const elapsed = Date.now() - snapStartedAtRef.current;
        if (
          elapsed > SNAP_GRACE_MS &&
          snapTargetRef.current !== null &&
          Math.abs(l.targetScroll - snapTargetRef.current) >
            SNAP_INTERRUPT_TOLERANCE
        ) {
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
        // the animated scroll currently is. This fires the snap
        // preemptively — before the user even visually reaches the gap.
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
        wheelMultiplier: 0.55,
        lerp: 0.09,
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
