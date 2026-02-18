"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as THREE from "three";

import { useAccent } from "@/components/providers/AccentProvider";
import { useBackground } from "@/components/providers/BackgroundProvider";
import { type ThemePalette, type VantaPreset } from "@/lib/backgroundPresets";

const subscribeMounted = () => () => undefined;
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

type VantaEffectKey = "halo" | "cells";

type GlobalWindow = Window & {
  THREE?: typeof THREE;
  __ORYN_VANTA_THREE__?: typeof THREE;
};

type VantaInstance = {
  destroy?: () => void;
};

type VantaFactory = (options: Record<string, unknown>) => VantaInstance;

type VantaModule = {
  default: VantaFactory;
};

const VANTA_LOADERS: Record<VantaEffectKey, () => Promise<VantaModule>> = {
  halo: () => import("vanta/dist/vanta.halo.min"),
  cells: () => import("vanta/dist/vanta.cells.min"),
};

function readPaletteFromCss(): ThemePalette {
  if (typeof window === "undefined") {
    return {
      bg: "#0a0c11",
      accent: "#7e9cff",
      accent2: "#8edac8",
      mutedFg: "#a9b3c7",
      border: "#232c3d",
    };
  }

  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;

  return {
    bg: read("--bg", "#0a0c11"),
    accent: read("--accent", "#7e9cff"),
    accent2: read("--accent-2", "#8edac8"),
    mutedFg: read("--muted-fg", "#a9b3c7"),
    border: read("--border", "#232c3d"),
  };
}

function toHexInt(value: string, fallback: string) {
  try {
    return new THREE.Color(value).getHex();
  } catch {
    return new THREE.Color(fallback).getHex();
  }
}

function mixHex(source: string, target: string, amount: number, sourceFallback: string, targetFallback: string) {
  const safeAmount = Math.min(Math.max(amount, 0), 1);
  const sourceColor = new THREE.Color();
  const targetColor = new THREE.Color();

  try {
    sourceColor.set(source);
  } catch {
    sourceColor.set(sourceFallback);
  }

  try {
    targetColor.set(target);
  } catch {
    targetColor.set(targetFallback);
  }

  return sourceColor.lerp(targetColor, safeAmount).getHex();
}

async function ensureVantaGlobals() {
  const w = window as GlobalWindow;
  if (!w.__ORYN_VANTA_THREE__) {
    const compat = Object.create(THREE) as typeof THREE & Record<string, unknown>;

    const aliases: Array<[string, string]> = [
      ["PlaneBufferGeometry", "PlaneGeometry"],
      ["BoxBufferGeometry", "BoxGeometry"],
      ["SphereBufferGeometry", "SphereGeometry"],
      ["CylinderBufferGeometry", "CylinderGeometry"],
      ["TorusBufferGeometry", "TorusGeometry"],
      ["TorusKnotBufferGeometry", "TorusKnotGeometry"],
    ];

    for (const [legacy, modern] of aliases) {
      if (!(legacy in compat) && modern in (THREE as unknown as Record<string, unknown>)) {
        compat[legacy] = (THREE as unknown as Record<string, unknown>)[modern];
      }
    }

    w.__ORYN_VANTA_THREE__ = compat as typeof THREE;
  }

  w.THREE = w.__ORYN_VANTA_THREE__;
}

function createCommonOptions(palette: ThemePalette, reducedMotion: boolean, quality: "performance" | "balanced" | "cinematic") {
  const accent = toHexInt(palette.accent, "#7e9cff");
  const accent2 = toHexInt(palette.accent2, "#8edac8");
  const speedFactor = reducedMotion ? 0.45 : quality === "cinematic" ? 1.12 : quality === "performance" ? 0.85 : 1;
  const densityFactor = quality === "cinematic" ? 1.15 : quality === "performance" ? 0.82 : 1;

  return {
    THREE,
    mouseControls: !reducedMotion,
    touchControls: true,
    gyroControls: false,
    minHeight: 200,
    minWidth: 200,
    backgroundColor: 0x000000,
    backgroundAlpha: 1,
    color: accent,
    color2: accent2,
    speedFactor,
    densityFactor,
  };
}

function createAppHaloOptions(
  palette: ThemePalette,
  reducedMotion: boolean,
  quality: "performance" | "balanced" | "cinematic",
  preset: VantaPreset
) {
  const common = createCommonOptions(palette, reducedMotion, quality);
  const isReactor = preset.styleId === "reactor";

  return {
    ...common,
    amplitudeFactor: isReactor ? 3.8 * common.densityFactor : 2.6 * common.densityFactor,
    ringFactor: isReactor ? 1.08 : 1,
    rotationFactor: isReactor ? 1.22 : 1,
    size: isReactor ? 1.92 : 1.5,
    speed: common.speedFactor * (isReactor ? 1.12 : 0.98),
  };
}

function createLandingCellsOptions(palette: ThemePalette, reducedMotion: boolean, quality: "performance" | "balanced" | "cinematic") {
  const common = createCommonOptions(palette, reducedMotion, quality);
  const speed = common.speedFactor * (quality === "cinematic" ? 0.88 : quality === "performance" ? 0.66 : 0.76);

  return {
    ...common,
    color1: mixHex(palette.accent, palette.accent2, 0.42, "#7e9cff", "#8edac8"),
    color2: mixHex(palette.accent2, palette.bg, 0.76, "#8edac8", "#000000"),
    backgroundColor: 0x000000,
    amplitudeFactor: (quality === "cinematic" ? 1.22 : quality === "performance" ? 0.86 : 1.04) * common.densityFactor,
    ringFactor: quality === "cinematic" ? 1.24 : quality === "performance" ? 0.92 : 1.06,
    rotationFactor: quality === "cinematic" ? 1.14 : quality === "performance" ? 0.84 : 0.96,
    size: quality === "cinematic" ? 1.72 : quality === "performance" ? 1.34 : 1.52,
    speed,
    scale: 2,
    scaleMobile: 2.6,
    mouseControls: !reducedMotion,
    touchControls: true,
  };
}

function safeDestroy(effect: VantaInstance | null, host: HTMLDivElement | null) {
  try {
    effect?.destroy?.();
  } catch {
    // ignore strict-mode teardown races
  }

  if (host?.isConnected) {
    try {
      host.replaceChildren();
    } catch {
      // ignore DOM cleanup races
    }
  }
}

export function AnimatedBackground({ landingMode = false }: { landingMode?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const { background, quality } = useBackground();
  const { accent } = useAccent();
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
  const reducedMotion = Boolean(shouldReduceMotion);

  const palette = useMemo<ThemePalette>(
    () => ({
      ...readPaletteFromCss(),
      accent: accent.accentHex,
      accent2: accent.accent2Hex,
    }),
    [accent.accent2Hex, accent.accentHex]
  );

  if (!mounted) return null;

  return (
    <div className="app-bg-layer" aria-hidden>
      <AnimatePresence mode="wait" initial={false}>
        {landingMode ? (
          <motion.div
            key="landing-bg"
            className="app-bg-slot"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingLibraryLayer palette={palette} quality={quality} reducedMotion={reducedMotion} />
          </motion.div>
        ) : (
          <motion.div
            key="app-bg"
            className="app-bg-slot"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <AppHaloLayer preset={background} palette={palette} quality={quality} reducedMotion={reducedMotion} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="app-bg-vignette" />
    </div>
  );
}

function AppHaloLayer({
  preset,
  palette,
  quality,
  reducedMotion,
}: {
  preset: VantaPreset;
  palette: ThemePalette;
  quality: "performance" | "balanced" | "cinematic";
  reducedMotion: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const effectKey = `${preset.id}|${palette.accent}|${palette.accent2}|${quality}|${reducedMotion ? "1" : "0"}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.style.backgroundColor = "#000";

    let cancelled = false;
    let effect: VantaInstance | null = null;

    void ensureVantaGlobals()
      .then(() => VANTA_LOADERS.halo())
      .then((mod) => {
        if (cancelled) return;
        effect = mod.default({ el: host, ...createAppHaloOptions(palette, reducedMotion, quality, preset) });
      })
      .catch(() => {
        // keep black fallback
      });

    return () => {
      cancelled = true;
      safeDestroy(effect, host);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectKey]);

  return <div ref={hostRef} className="app-bg-canvas" />;
}

function LandingLibraryLayer({
  palette,
  quality,
  reducedMotion,
}: {
  palette: ThemePalette;
  quality: "performance" | "balanced" | "cinematic";
  reducedMotion: boolean;
}) {
  const cellsRef = useRef<HTMLDivElement | null>(null);
  const effectKey = `${palette.accent}|${palette.accent2}|${quality}|${reducedMotion ? "1" : "0"}`;

  useEffect(() => {
    const cellsHost = cellsRef.current;
    if (!cellsHost) return;

    cellsHost.style.backgroundColor = "#000";

    let cancelled = false;
    let cellsEffect: VantaInstance | null = null;

    void ensureVantaGlobals()
      .then(async () => {
        const cellsMod = await VANTA_LOADERS.cells();
        if (cancelled) return;

        cellsEffect = cellsMod.default({ el: cellsHost, ...createLandingCellsOptions(palette, reducedMotion, quality) });
      })
      .catch(() => {
        // keep black fallback
      });

    return () => {
      cancelled = true;
      safeDestroy(cellsEffect, cellsHost);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectKey]);

  return (
    <div className="app-bg-landing-stack">
      <div ref={cellsRef} className="app-bg-landing-slot app-bg-landing-cells" />
    </div>
  );
}
