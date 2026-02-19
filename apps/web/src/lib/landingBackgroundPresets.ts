export type LandingBgId = "landing-galaxy";

export type LandingBgPreset = {
  id: LandingBgId;
  name: string;
  engine: "three";
};

export const LANDING_BG_PRESETS: Array<LandingBgPreset> = [
  { id: "landing-galaxy", name: "Galaxy", engine: "three" },
];

export const DEFAULT_LANDING_BG_ID: LandingBgId = "landing-galaxy";
export const LANDING_BG_STORAGE_KEY = "oryn:landing-bg:v1";

const PRESET_MAP = new Map(LANDING_BG_PRESETS.map((p) => [p.id, p]));

export function getLandingBgPreset(id: string): LandingBgPreset {
  return PRESET_MAP.get(id as LandingBgId) ?? LANDING_BG_PRESETS[0]!;
}
