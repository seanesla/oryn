"use client";

import { createContext, useContext, useMemo } from "react";

import {
  DEFAULT_LANDING_BG_ID,
  LANDING_BG_PRESETS,
  getLandingBgPreset,
  type LandingBgPreset,
} from "@/lib/landingBackgroundPresets";

type LandingBgContextValue = {
  preset: LandingBgPreset;
  presetId: string;
  presets: Array<LandingBgPreset>;
};

const LandingBgContext = createContext<LandingBgContextValue | null>(null);

export function LandingBackgroundProvider({ children }: { children: React.ReactNode }) {
  const preset = useMemo(() => getLandingBgPreset(DEFAULT_LANDING_BG_ID), []);

  const value = useMemo<LandingBgContextValue>(
    () => ({ preset, presetId: DEFAULT_LANDING_BG_ID, presets: LANDING_BG_PRESETS }),
    [preset]
  );

  return <LandingBgContext.Provider value={value}>{children}</LandingBgContext.Provider>;
}

export function useLandingBackground() {
  const ctx = useContext(LandingBgContext);
  if (!ctx) throw new Error("useLandingBackground must be used within LandingBackgroundProvider");
  return ctx;
}
