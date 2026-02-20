"use client";

import { useEffect, useRef } from "react";
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

export function GsapLenisProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        smoothWheel: true,
        lerp: 0.14,
        duration: 1.0,
        orientation: "vertical",
        gestureOrientation: "vertical",
        syncTouch: false,
      }}
    >
      <LenisGsapBridge />
      {children}
    </ReactLenis>
  );
}
