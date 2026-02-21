"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { readJson, writeJson } from "@/lib/storage";

export type AccentPreset = {
  id: string;
  name: string;
  accentHex: string;
  accent2Hex: string;
  ringHex: string;
  goodHex: string;
  badHex: string;
};

const ACCENTS: Array<AccentPreset> = [
  {
    id: "indigo",
    name: "Indigo",
    accentHex: "#7e9cff",
    accent2Hex: "#8edac8",
    ringHex: "#7e9cff",
    goodHex: "#8edac8",
    badHex: "#f596b4",
  },
  {
    id: "steel",
    name: "Steel",
    accentHex: "#95a9cc",
    accent2Hex: "#99c8bd",
    ringHex: "#95a9cc",
    goodHex: "#99c8bd",
    badHex: "#f596b4",
  },
  {
    id: "teal",
    name: "Teal",
    accentHex: "#62c2bf",
    accent2Hex: "#8edac8",
    ringHex: "#62c2bf",
    goodHex: "#8edac8",
    badHex: "#f198ab",
  },
  {
    id: "lavender",
    name: "Lavender",
    accentHex: "#b7a6ff",
    accent2Hex: "#9ad9cf",
    ringHex: "#b7a6ff",
    goodHex: "#9ad9cf",
    badHex: "#f198ab",
  },
  {
    id: "rose",
    name: "Rose",
    accentHex: "#d98ab2",
    accent2Hex: "#8edac8",
    ringHex: "#d98ab2",
    goodHex: "#8edac8",
    badHex: "#d98ab2",
  },
  {
    id: "amber",
    name: "Amber",
    accentHex: "#d9a76b",
    accent2Hex: "#8edac8",
    ringHex: "#d9a76b",
    goodHex: "#8edac8",
    badHex: "#f198ab",
  },
];

type AccentContextValue = {
  accents: Array<AccentPreset>;
  accent: AccentPreset;
  setAccentId: (id: string) => void;
};

const AccentContext = createContext<AccentContextValue | null>(null);

const STORAGE_KEY = "oryn:accent:v2";

function applyAccentToRoot(accent: AccentPreset) {
  const root = document.documentElement;
  root.style.setProperty("--accent", accent.accentHex);
  root.style.setProperty("--accent-2", accent.accent2Hex);
  root.style.setProperty("--ring", accent.ringHex);
  root.style.setProperty("--good", accent.goodHex);
  root.style.setProperty("--bad", accent.badHex);
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  // Always initialize with the hardcoded default so the server-rendered HTML
  // matches the initial client render (avoiding a hydration mismatch).
  // After mount, we hydrate from localStorage in a separate effect.
  const [accent, setAccent] = useState<AccentPreset>(ACCENTS[0]!);

  useEffect(() => {
    const saved = readJson<{ id: string }>(STORAGE_KEY, { id: "indigo" });
    const stored = ACCENTS.find((a) => a.id === saved.id);
    if (stored) setAccent(stored);
  }, []);

  useEffect(() => {
    applyAccentToRoot(accent);
    writeJson(STORAGE_KEY, { id: accent.id });
  }, [accent]);

  const setAccentId = useCallback((id: string) => {
    const next = ACCENTS.find((a) => a.id === id);
    if (next) setAccent(next);
  }, []);

  const value = useMemo<AccentContextValue>(
    () => ({ accents: ACCENTS, accent, setAccentId }),
    [accent, setAccentId]
  );

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within AccentProvider");
  return ctx;
}
