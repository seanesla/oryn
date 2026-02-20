"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { useAccent } from "@/components/providers/AccentProvider";

import { ReactBitsAurora } from "@/components/landing/ReactBitsAurora";
import { ReactBitsGalaxy } from "@/components/landing/ReactBitsGalaxy";
import { ReactBitsLightRays } from "@/components/landing/ReactBitsLightRays";
import { ReactBitsParticles } from "@/components/landing/ReactBitsParticles";
import { GalaxyLayer } from "@/components/shell/LandingEffects/GalaxyLayer";

// ── Scene IDs (reduced from 9 to 4) ──────────────────────────────────────────

const SCENE_ATTR = "data-landing-scene";

const SCENE_IDS = ["hero", "features", "how", "use"] as const;

type LandingSceneId = (typeof SCENE_IDS)[number];

const SCENE_ID_SET = new Set<string>(SCENE_IDS);
const DEFAULT_SCENE: LandingSceneId = "hero";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSceneId(node: Element): LandingSceneId | null {
  const value = node.getAttribute(SCENE_ATTR);
  if (!value || !SCENE_ID_SET.has(value)) return null;
  return value as LandingSceneId;
}

type SectionInfo = {
  id: LandingSceneId;
  el: HTMLElement;
  top: number;
  bottom: number;
  center: number;
};

function measureSections(sections: Array<HTMLElement>): Array<SectionInfo> {
  const scrollY = window.scrollY ?? 0;
  const infos: Array<SectionInfo> = [];

  for (const el of sections) {
    const id = getSceneId(el);
    if (!id) continue;

    const rect = el.getBoundingClientRect();
    const top = rect.top + scrollY;
    const bottom = rect.bottom + scrollY;
    infos.push({ id, el, top, bottom, center: (top + bottom) / 2 });
  }

  infos.sort((a, b) => a.top - b.top);
  return infos;
}

function pickActiveSceneId(infos: Array<SectionInfo>, anchorDocY: number): LandingSceneId {
  let closestId: LandingSceneId = DEFAULT_SCENE;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const info of infos) {
    if (anchorDocY >= info.top && anchorDocY < info.bottom) return info.id;
    const dist = Math.abs(info.center - anchorDocY);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestId = info.id;
    }
  }

  return closestId;
}

// ── Main component ────────────────────────────────────────────────────────────

export function LandingStickyBackgroundStage() {
  const shouldReduceMotion = useReducedMotion();
  const reducedMotion = Boolean(shouldReduceMotion);
  const { accent } = useAccent();

  const [activeScene, setActiveScene] = useState<LandingSceneId>(DEFAULT_SCENE);
  const activeSceneRef = useRef<LandingSceneId>(DEFAULT_SCENE);

  const layoutRef = useRef<Array<SectionInfo>>([]);
  const layoutDirtyRef = useRef(true);

  // Scroll-driven active scene detection — simple, no wipe machinery.
  useEffect(() => {
    const getSections = () =>
      Array.from(document.querySelectorAll<HTMLElement>(`[${SCENE_ATTR}]`)).filter((section) =>
        SCENE_ID_SET.has(section.getAttribute(SCENE_ATTR) ?? ""),
      );

    const sections = getSections();
    if (!sections.length) return;

    let rafId = 0;

    const measureLayout = () => {
      layoutRef.current = measureSections(sections);
      layoutDirtyRef.current = false;
    };

    measureLayout();

    const update = () => {
      if (layoutDirtyRef.current) measureLayout();
      const infos = layoutRef.current;
      if (!infos.length) return;

      const h = window.innerHeight;
      const anchorDocY = (window.scrollY ?? 0) + h * 0.52;

      const nextActive = pickActiveSceneId(infos, anchorDocY);
      if (nextActive !== activeSceneRef.current) {
        activeSceneRef.current = nextActive;
        setActiveScene(nextActive);
      }
    };

    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });

    const handleResize = () => {
      layoutDirtyRef.current = true;
      schedule();
    };
    window.addEventListener("resize", handleResize);

    const settleTimer = window.setTimeout(() => {
      layoutDirtyRef.current = true;
      schedule();
    }, 450);

    return () => {
      window.clearTimeout(settleTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div aria-hidden className="landing-bg-stage">
      <div className="absolute inset-0 bg-black" />

      {/* Render all 4 scenes, crossfade via CSS opacity. Only active scene is visible. */}
      {SCENE_IDS.map((sceneId) => (
        <div
          key={sceneId}
          className="landing-bg-scene"
          style={{
            opacity: sceneId === activeScene ? 1 : 0,
            transition: reducedMotion ? "none" : "opacity 0.6s ease-in-out",
            pointerEvents: "none",
          }}
        >
          <SceneBackground
            scene={sceneId}
            reducedMotion={reducedMotion}
            accent={accent.accentHex}
            accent2={accent.accent2Hex}
          />
        </div>
      ))}

      <div className="landing-bg-stage-vignette" />
      <div className="landing-bg-stage-grain" />
    </div>
  );
}

// ── Scene backgrounds (4 instead of 9) ───────────────────────────────────────

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
      return <HeroGalaxy accent={accent} accent2={accent2} />;
    case "features":
      return <FeaturesAurora reducedMotion={reducedMotion} accent={accent} accent2={accent2} />;
    case "how":
      return <HowParticles reducedMotion={reducedMotion} accent={accent} accent2={accent2} />;
    case "use":
      return <UseGalaxy reducedMotion={reducedMotion} accent={accent} />;
  }
}

function HeroGalaxy({ accent, accent2 }: { accent: string; accent2: string }) {
  return (
    <div className="absolute inset-0">
      <GalaxyLayer accent={accent} accent2={accent2} variant={2} />
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
