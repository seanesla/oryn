"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { useAccent } from "@/components/providers/AccentProvider";
import { ScrollTrigger } from "@/lib/gsap";

import { ReactBitsAurora } from "@/components/landing/ReactBitsAurora";
import { ReactBitsGalaxy } from "@/components/landing/ReactBitsGalaxy";
import { ReactBitsLightRays } from "@/components/landing/ReactBitsLightRays";
import { ReactBitsParticles } from "@/components/landing/ReactBitsParticles";
import { GalaxyLayer } from "@/components/shell/LandingEffects/GalaxyLayer";

// ── Scene IDs ─────────────────────────────────────────────────────────────────

const SCENE_ATTR = "data-landing-scene";

const SCENE_IDS = ["hero", "features", "how", "use", "closing"] as const;

type LandingSceneId = (typeof SCENE_IDS)[number];

const SCENE_ID_SET = new Set<string>(SCENE_IDS);
const DEFAULT_SCENE: LandingSceneId = "hero";

const TINT_OPACITY: Record<LandingSceneId, number> = {
  hero: 0.12,
  features: 0.3,
  how: 0.3,
  use: 0.3,
  closing: 0.3,
};

/** Fraction of each section's trigger range used for the crossfade overlap. */
const CROSSFADE = 0.15;

// ── Main component ────────────────────────────────────────────────────────────

export function LandingStickyBackgroundStage() {
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);
  const { accent } = useAccent();

  const [activeScene, setActiveScene] = useState<LandingSceneId>(DEFAULT_SCENE);
  const activeRef = useRef<LandingSceneId>(DEFAULT_SCENE);

  // Direct DOM refs for each scene container — opacity is updated per-frame
  // by ScrollTrigger callbacks without triggering React re-renders.
  const sceneRefs = useRef<Record<LandingSceneId, HTMLDivElement | null>>({
    hero: null,
    features: null,
    how: null,
    use: null,
    closing: null,
  });

  const tintRef = useRef<HTMLDivElement | null>(null);

  // ── Lazy mount: only render WebGL children for active + adjacent scenes ──
  // In reduced-motion mode only the hero scene is mounted (static background).
  const mountedScenes = useMemo(() => {
    if (reducedMotion) return new Set<LandingSceneId>([DEFAULT_SCENE]);
    const set = new Set<LandingSceneId>([activeScene]);
    const idx = SCENE_IDS.indexOf(activeScene);
    if (idx > 0) set.add(SCENE_IDS[idx - 1]);
    if (idx < SCENE_IDS.length - 1) set.add(SCENE_IDS[idx + 1]);
    return set;
  }, [activeScene, reducedMotion]);

  // ── Scrub-driven crossfade via ScrollTrigger ───────────────────────────────
  useEffect(() => {
    // In reduced-motion mode show only the hero background statically.
    if (reducedMotion) {
      for (const id of SCENE_IDS) {
        const el = sceneRefs.current[id];
        if (el) el.style.opacity = id === DEFAULT_SCENE ? "1" : "0";
      }
      if (tintRef.current) tintRef.current.style.opacity = String(TINT_OPACITY[DEFAULT_SCENE]);
      return;
    }

    const sectionEls = Array.from(
      document.querySelectorAll<HTMLElement>(`[${SCENE_ATTR}]`),
    ).filter((el) => SCENE_ID_SET.has(el.getAttribute(SCENE_ATTR) ?? ""));

    if (!sectionEls.length) return;

    const orderedIds = sectionEls.map(
      (el) => el.getAttribute(SCENE_ATTR) as LandingSceneId,
    );

    // Set initial opacities
    for (const id of SCENE_IDS) {
      const el = sceneRefs.current[id];
      if (el) el.style.opacity = id === DEFAULT_SCENE ? "1" : "0";
    }

    if (tintRef.current) tintRef.current.style.opacity = String(TINT_OPACITY[DEFAULT_SCENE]);

    const activate = (id: LandingSceneId) => {
      if (activeRef.current === id) return;
      activeRef.current = id;
      setActiveScene(id);
    };

    const triggers: ScrollTrigger[] = [];

    for (let i = 0; i < sectionEls.length; i++) {
      const sceneId = orderedIds[i];
      const nextId = i < orderedIds.length - 1 ? orderedIds[i + 1] : null;

      const st = ScrollTrigger.create({
        trigger: sectionEls[i],
        start: "top top",
        end: "bottom top",
        onEnter: () => {
          activate(sceneId);
          const el = sceneRefs.current[sceneId];
          if (el) el.style.opacity = "1";
          if (tintRef.current) tintRef.current.style.opacity = String(TINT_OPACITY[sceneId]);
        },
        onEnterBack: () => {
          activate(sceneId);
          const el = sceneRefs.current[sceneId];
          if (el) el.style.opacity = "1";
          if (tintRef.current) tintRef.current.style.opacity = String(TINT_OPACITY[sceneId]);
          // Reset next scene that was being crossfaded in
          if (nextId) {
            const nEl = sceneRefs.current[nextId];
            if (nEl) nEl.style.opacity = "0";
          }
        },
        onUpdate: (self) => {
          if (!nextId) return;
          const p = self.progress;
          const outEl = sceneRefs.current[sceneId];
          const inEl = sceneRefs.current[nextId];

          if (p >= 1 - CROSSFADE) {
            // Scrub-driven crossfade in the last 15% of the section
            const t = (p - (1 - CROSSFADE)) / CROSSFADE;
            if (outEl) outEl.style.opacity = String(1 - t);
            if (inEl) inEl.style.opacity = String(t);

            if (tintRef.current) {
              const a = TINT_OPACITY[sceneId];
              const b = TINT_OPACITY[nextId];
              tintRef.current.style.opacity = String(a + (b - a) * t);
            }
          } else {
            // Outside crossfade — ensure clean state without thrashing
            if (outEl && outEl.style.opacity !== "1") outEl.style.opacity = "1";
            if (inEl && inEl.style.opacity !== "0") inEl.style.opacity = "0";

            if (tintRef.current) {
              const v = String(TINT_OPACITY[sceneId]);
              if (tintRef.current.style.opacity !== v) tintRef.current.style.opacity = v;
            }
          }
        },
        onLeave: () => {
          if (nextId) {
            activate(nextId);
            const outEl = sceneRefs.current[sceneId];
            const inEl = sceneRefs.current[nextId];
            if (outEl) outEl.style.opacity = "0";
            if (inEl) inEl.style.opacity = "1";

            if (tintRef.current) tintRef.current.style.opacity = String(TINT_OPACITY[nextId]);
          }
        },
      });
      triggers.push(st);
    }

    return () => {
      for (const st of triggers) st.kill();
    };
  }, [reducedMotion]);

  return (
    <div aria-hidden className="landing-bg-stage">
      <div className="absolute inset-0 bg-black" />

      {SCENE_IDS.map((sceneId) => (
        <div
          key={sceneId}
          ref={(el) => {
            sceneRefs.current[sceneId] = el;
          }}
          className="landing-bg-scene"
          style={{
            opacity: sceneId === DEFAULT_SCENE ? 1 : 0,
            pointerEvents: "none",
          }}
        >
          {mountedScenes.has(sceneId) && (
            <SceneBackground
              scene={sceneId}
              reducedMotion={reducedMotion}
              accent={accent.accentHex}
              accent2={accent.accent2Hex}
            />
          )}
        </div>
      ))}

      <div
        ref={tintRef}
        className="absolute inset-0 bg-[color:var(--bg)]"
        style={{ opacity: TINT_OPACITY[DEFAULT_SCENE], willChange: "opacity" }}
      />

      <div className="landing-bg-stage-vignette" />
      <div className="landing-bg-stage-grain" />
    </div>
  );
}

// ── Scene backgrounds ─────────────────────────────────────────────────────────

function SceneBackground({
  scene,
  reducedMotion,
  accent,
  accent2,
}: {
  scene: LandingSceneId;
  reducedMotion: boolean;
  accent: string;
  accent2: string;
}) {
  switch (scene) {
    case "hero":
      return <HeroGalaxy reducedMotion={reducedMotion} accent={accent} accent2={accent2} />;
    case "features":
      return <FeaturesAurora reducedMotion={reducedMotion} accent={accent} accent2={accent2} />;
    case "how":
      return <HowParticles reducedMotion={reducedMotion} accent={accent} accent2={accent2} />;
    case "use":
      return <UseGalaxy reducedMotion={reducedMotion} accent={accent} />;
    case "closing":
      return <ClosingGalaxy reducedMotion={reducedMotion} accent={accent} accent2={accent2} />;
  }
}

function HeroGalaxy({
  reducedMotion,
  accent,
  accent2,
}: {
  reducedMotion: boolean;
  accent: string;
  accent2: string;
}) {
  return (
    <div className="absolute inset-0">
      <GalaxyLayer accent={accent} accent2={accent2} variant={2} reducedMotion={reducedMotion} />
    </div>
  );
}

function FeaturesAurora({
  reducedMotion,
  accent,
  accent2,
}: {
  reducedMotion: boolean;
  accent: string;
  accent2: string;
}) {
  return (
    <div className="absolute inset-0 bg-black">
      <ReactBitsAurora
        className="absolute inset-0 opacity-[0.78]"
        speed={reducedMotion ? 0 : 1}
        amplitude={0.92}
        blend={0.58}
        colorStops={["#1d2b6e", accent, accent2]}
      />
      <ReactBitsParticles
        className="absolute inset-0 opacity-[0.46]"
        particleCount={reducedMotion ? 120 : 220}
        particleSpread={12}
        speed={reducedMotion ? 0 : 0.08}
        particleColors={["#ffffff", accent, accent2]}
        alphaParticles
        disableRotation={reducedMotion}
        particleBaseSize={92}
        sizeRandomness={1.1}
      />
    </div>
  );
}

function HowParticles({
  reducedMotion,
  accent,
  accent2,
}: {
  reducedMotion: boolean;
  accent: string;
  accent2: string;
}) {
  return (
    <div className="absolute inset-0 bg-black">
      <ReactBitsParticles
        className="absolute inset-0 opacity-[0.66]"
        particleCount={reducedMotion ? 160 : 320}
        particleSpread={18}
        speed={reducedMotion ? 0 : 0.09}
        particleColors={["#ffffff", accent2, accent]}
        alphaParticles
        disableRotation={reducedMotion}
        particleBaseSize={98}
        sizeRandomness={1.35}
      />
      <ReactBitsAurora
        className="absolute inset-0 opacity-[0.34]"
        speed={reducedMotion ? 0 : 0.8}
        amplitude={0.75}
        blend={0.62}
        colorStops={["#0c1030", accent, accent2]}
      />
    </div>
  );
}

function UseGalaxy({
  reducedMotion,
  accent,
}: {
  reducedMotion: boolean;
  accent: string;
}) {
  return (
    <div className="absolute inset-0 bg-black">
      <ReactBitsGalaxy
        className="absolute inset-0 opacity-[0.95]"
        disableAnimation={reducedMotion}
        mouseInteraction={false}
        density={2.8}
        speed={0.56}
        saturation={0.95}
        hueShift={128}
        glowIntensity={0.32}
        twinkleIntensity={0.3}
        rotationSpeed={0.12}
        starSpeed={0.48}
        transparent
      />
      <ReactBitsLightRays
        className="absolute inset-0 opacity-[0.26]"
        raysOrigin="bottom-center"
        raysColor={accent}
        raysSpeed={reducedMotion ? 0 : 0.85}
        lightSpread={1.7}
        rayLength={1.8}
        fadeDistance={1.0}
        followMouse={false}
        pulsating
        noiseAmount={0.01}
        distortion={0.12}
        saturation={0.8}
      />
    </div>
  );
}

function ClosingGalaxy({
  reducedMotion,
  accent,
  accent2,
}: {
  reducedMotion: boolean;
  accent: string;
  accent2: string;
}) {
  return (
    <div className="absolute inset-0 bg-black">
      <GalaxyLayer accent={accent} accent2={accent2} variant={1} reducedMotion={reducedMotion} />
      <ReactBitsAurora
        className="absolute inset-0 opacity-[0.3]"
        speed={reducedMotion ? 0 : 0.6}
        amplitude={0.65}
        blend={0.5}
        colorStops={["#0c1030", accent2, accent]}
      />
    </div>
  );
}
