export type BackgroundLibrary = "vanta";
export type BackgroundIntensity = "low" | "medium" | "high";
export type BackgroundQuality = "performance" | "balanced" | "cinematic";

export type ThemePalette = {
  bg: string;
  accent: string;
  accent2: string;
  mutedFg: string;
  border: string;
};

export type VantaEffectId = "halo";

type PresetCommon = {
  id: string;
  name: string;
  family: string;
  variant: number;
  intensity: BackgroundIntensity;
  sourceLibraryId: string;
  sourceNote: string;
};

export type VantaPreset = PresetCommon & {
  library: "vanta";
  effectId: VantaEffectId;
  styleId: string;
};

export type BackgroundPreset = VantaPreset;

export const BACKGROUND_PRESETS: Array<BackgroundPreset> = [
  {
    id: "bg-vanta-halo-reactor",
    name: "Halo Reactor",
    library: "vanta",
    family: "Halo",
    effectId: "halo",
    styleId: "reactor",
    variant: 1,
    intensity: "high",
    sourceLibraryId: "vanta/vanta",
    sourceNote: "Vanta.js official Halo effect (Three.js-powered, cursor-reactive).",
  },
];

export const DEFAULT_BACKGROUND_ID = BACKGROUND_PRESETS[0]!.id;
export const BACKGROUND_QUALITY_OPTIONS: Array<BackgroundQuality> = ["performance", "balanced", "cinematic"];

const PRESET_MAP = new Map(BACKGROUND_PRESETS.map((p) => [p.id, p]));

export function getBackgroundPreset(id: string): BackgroundPreset {
  return PRESET_MAP.get(id) ?? BACKGROUND_PRESETS[0]!;
}
