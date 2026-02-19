"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as THREE from "three";

import { useAccent } from "@/components/providers/AccentProvider";
import { useBackground } from "@/components/providers/BackgroundProvider";
import { type ThemePalette, type VantaPreset } from "@/lib/backgroundPresets";

import { GalaxyLayer } from "@/components/shell/LandingEffects/GalaxyLayer";

// ── SSR mount guard ─────────────────────────────────────────────────────────
const subscribeMounted = () => () => undefined;
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

// ── Types ───────────────────────────────────────────────────────────────────
type VantaEffectKey = "halo";

type GlobalWindow = Window & {
  THREE?: typeof THREE;
  __ORYN_VANTA_THREE__?: typeof THREE;
};

type VantaInstance = { destroy?: () => void };
type VantaFactory  = (options: Record<string, unknown>) => VantaInstance;
type VantaModule   = { default: VantaFactory };

const VANTA_LOADERS: Record<VantaEffectKey, () => Promise<VantaModule>> = {
  halo:  () => import("vanta/dist/vanta.halo.min"),
};

// ── CSS palette reader ───────────────────────────────────────────────────────
function readPaletteFromCss(): ThemePalette {
  if (typeof window === "undefined") {
    return { bg: "#0a0c11", accent: "#7e9cff", accent2: "#8edac8", mutedFg: "#a9b3c7", border: "#232c3d" };
  }
  const style = getComputedStyle(document.documentElement);
  const read  = (n: string, fb: string) => style.getPropertyValue(n).trim() || fb;
  return {
    bg:       read("--bg",        "#0a0c11"),
    accent:   read("--accent",    "#7e9cff"),
    accent2:  read("--accent-2",  "#8edac8"),
    mutedFg:  read("--muted-fg",  "#a9b3c7"),
    border:   read("--border",    "#232c3d"),
  };
}

function toHexInt(value: string, fallback: string) {
  const raw = value.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(raw)) return Number.parseInt(raw.slice(1), 16);
  if (/^#([0-9a-fA-F]{3})$/.test(raw)) {
    const s = raw.slice(1);
    return Number.parseInt(`${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`, 16);
  }
  const rgb = raw.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgb) {
    const r = Math.max(0, Math.min(255, Number(rgb[1])));
    const g = Math.max(0, Math.min(255, Number(rgb[2])));
    const b = Math.max(0, Math.min(255, Number(rgb[3])));
    return (r << 16) | (g << 8) | b;
  }
  if (value !== fallback) return toHexInt(fallback, "#7e9cff");
  return 0x7e9cff;
}

// ── Vanta boilerplate ────────────────────────────────────────────────────────
async function ensureVantaGlobals() {
  const w = window as GlobalWindow;
  if (!w.__ORYN_VANTA_THREE__) {
    const compat = Object.create(THREE) as typeof THREE & Record<string, unknown>;
    const aliases: Array<[string, string]> = [
      ["PlaneBufferGeometry",  "PlaneGeometry"],
      ["BoxBufferGeometry",    "BoxGeometry"],
      ["SphereBufferGeometry", "SphereGeometry"],
    ];
    for (const [leg, mod] of aliases) {
      if (!(leg in compat) && mod in (THREE as unknown as Record<string, unknown>)) {
        compat[leg] = (THREE as unknown as Record<string, unknown>)[mod];
      }
    }
    w.__ORYN_VANTA_THREE__ = compat as typeof THREE;
  }
  w.THREE = w.__ORYN_VANTA_THREE__;
}

function safeDestroy(effect: VantaInstance | null, host: HTMLDivElement | null) {
  try { effect?.destroy?.(); } catch { /* ignore */ }
  if (host?.isConnected) { try { host.replaceChildren(); } catch { /* ignore */ } }
}

function createCommonOptions(palette: ThemePalette, reducedMotion: boolean, quality: string) {
  const accent  = toHexInt(palette.accent,  "#7e9cff");
  const accent2 = toHexInt(palette.accent2, "#8edac8");
  const sf = reducedMotion ? 0.45 : quality === "cinematic" ? 1.12 : quality === "performance" ? 0.85 : 1;
  const df = quality === "cinematic" ? 1.15 : quality === "performance" ? 0.82 : 1;
  return { THREE, mouseControls: !reducedMotion, touchControls: true, gyroControls: false, minHeight: 200, minWidth: 200, backgroundColor: 0x000000, backgroundAlpha: 1, color: accent, color2: accent2, speedFactor: sf, densityFactor: df };
}

// ── Public component ─────────────────────────────────────────────────────────
export function AnimatedBackground({ landingMode = false }: { landingMode?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const { background, quality } = useBackground();
  const { accent }              = useAccent();
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
  const reducedMotion = Boolean(shouldReduceMotion);

  const palette = useMemo<ThemePalette>(
    () => ({ ...readPaletteFromCss(), accent: accent.accentHex, accent2: accent.accent2Hex }),
    [accent.accentHex, accent.accent2Hex]
  );

  if (!mounted) return null;

  return (
    <div className="app-bg-layer" aria-hidden>
      <AnimatePresence mode="wait" initial={false}>
        {landingMode ? (
          <motion.div
            key="landing-galaxy"
            className="app-bg-slot"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion   ? { opacity: 1 } : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingEffectLayer palette={palette} />
          </motion.div>
        ) : (
          <motion.div
            key="app-bg"
            className="app-bg-slot"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion   ? { opacity: 1 } : { opacity: 0 }}
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

// ── Landing effect layer ──────────────────────────────────────────────────────
function LandingEffectLayer({ palette }: { palette: ThemePalette }) {
  return (
    <div className="app-bg-landing-stack">
      <GalaxyLayer accent={palette.accent} accent2={palette.accent2} />
    </div>
  );
}

// ── App (non-landing) Halo layer ─────────────────────────────────────────────
function AppHaloLayer({
  preset, palette, quality, reducedMotion,
}: {
  preset: VantaPreset;
  palette: ThemePalette;
  quality: string;
  reducedMotion: boolean;
}) {
  const hostRef   = useRef<HTMLDivElement | null>(null);
  const effectKey = `${preset.id}|${palette.accent}|${palette.accent2}|${quality}|${reducedMotion ? "1" : "0"}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.style.backgroundColor = "#000";
    let cancelled = false;
    let effect: VantaInstance | null = null;
    const isReactor = preset.styleId === "reactor";
    const common    = createCommonOptions(palette, reducedMotion, quality);

    void ensureVantaGlobals()
      .then(() => VANTA_LOADERS.halo())
      .then((mod) => {
        if (cancelled) return;
        effect = mod.default({
          el: host,
          ...common,
          amplitudeFactor: isReactor ? 3.8 * common.densityFactor : 2.6 * common.densityFactor,
          ringFactor:      isReactor ? 1.08 : 1,
          rotationFactor:  isReactor ? 1.22 : 1,
          size:            isReactor ? 1.92 : 1.5,
          speed:           common.speedFactor * (isReactor ? 1.12 : 0.98),
        });
      })
      .catch(() => { /* keep black fallback */ });

    return () => { cancelled = true; safeDestroy(effect, host); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectKey]);

  return <div ref={hostRef} className="app-bg-canvas" />;
}
