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
 * We intentionally avoid GSAP's built-in `snap` property because its
 * per-frame `scrollTo` calls conflict with Lenis's lerp interpolation,
 * resulting in sluggish or jittery snaps.
 */
function LenisSectionSnap() {
  const lenis = useLenis();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isSnapping = useRef(false);

  const lastScrollRef = useRef(0);
  const lastVelocityRef = useRef(0);
  const wasMovingRef = useRef(false);

  const snapFrom = useCallback(
    (currentScroll: number) => {
      if (!lenis || isSnapping.current) return;

      const pinned = ScrollTrigger.getAll()
        .filter((st) => st.pin)
        .filter((st) => Number.isFinite(st.start) && Number.isFinite(st.end))
        .sort((a, b) => a.start - b.start);

      if (!pinned.length) return;

      // If we're inside a pinned range, never snap (scrubbed timelines need
      // full control while the user is actively reading/scrolling).
      for (const st of pinned) {
        if (currentScroll >= st.start && currentScroll <= st.end) return;
      }

      // If we're in a transition gap between pinned ranges (the "limbo" zone),
      // snap to the closest boundary (prev end or next start). No distance
      // threshold here — the whole point is to escape the gap.
      for (let i = 0; i < pinned.length - 1; i++) {
        const prev = pinned[i];
        const next = pinned[i + 1];
        if (currentScroll > prev.end && currentScroll < next.start) {
          const toPrev = Math.abs(currentScroll - prev.end);
          const toNext = Math.abs(next.start - currentScroll);
          const target = toPrev < toNext ? prev.end : next.start;

          isSnapping.current = true;
          lenis.scrollTo(target, {
            duration: 0.65,
            easing: (t: number) => 1 - Math.pow(1 - t, 3),
            onComplete: () => {
              isSnapping.current = false;
            },
          });
          return;
        }
      }

      // Otherwise only nudge when already near a pinned section start.
      const starts = pinned.map((st) => st.start);
      let nearest = starts[0];
      let minDist = Math.abs(currentScroll - starts[0]);
      for (const s of starts) {
        const dist = Math.abs(currentScroll - s);
        if (dist < minDist) {
          minDist = dist;
          nearest = s;
        }
      }

      const nearThreshold = window.innerHeight * 0.25;
      if (minDist > 5 && minDist < nearThreshold) {
        isSnapping.current = true;
        lenis.scrollTo(nearest, {
          duration: 0.55,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          onComplete: () => {
            isSnapping.current = false;
          },
        });
      }
    },
    [lenis],
  );

  // Listen to every Lenis scroll frame. When motion settles, wait briefly
  // and then snap based on the last known scroll position.
  useLenis((l: { velocity: number; scroll: number }) => {
    if (isSnapping.current) return;

    lastScrollRef.current = l.scroll;
    lastVelocityRef.current = l.velocity;

    const moving = Math.abs(l.velocity) > 0.12;
    if (moving) {
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
      snapFrom(lastScrollRef.current);
    }, 180);
  });

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
