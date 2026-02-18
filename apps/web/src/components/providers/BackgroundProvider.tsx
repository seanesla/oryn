"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import {
  BACKGROUND_PRESETS,
  BACKGROUND_QUALITY_OPTIONS,
  DEFAULT_BACKGROUND_ID,
  getBackgroundPreset,
  type BackgroundPreset,
  type BackgroundQuality,
} from "@/lib/backgroundPresets";
import { readJson, writeJson } from "@/lib/storage";

type BackgroundContextValue = {
  backgrounds: Array<BackgroundPreset>;
  background: BackgroundPreset;
  backgroundId: string;
  setBackgroundId: (id: string) => void;
  quality: BackgroundQuality;
  setQuality: (quality: BackgroundQuality) => void;
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

type StoredBackgroundPrefs = {
  id: string;
  quality: BackgroundQuality;
};

const STORAGE_KEY = "oryn:background:v1";
const DEFAULT_QUALITY: BackgroundQuality = "balanced";

const DEFAULT_PREFS: StoredBackgroundPrefs = {
  id: DEFAULT_BACKGROUND_ID,
  quality: DEFAULT_QUALITY,
};

const listeners = new Set<() => void>();
let currentPrefs: StoredBackgroundPrefs = DEFAULT_PREFS;

function toValidQuality(value: string | undefined): BackgroundQuality {
  return BACKGROUND_QUALITY_OPTIONS.includes(value as BackgroundQuality) ? (value as BackgroundQuality) : DEFAULT_QUALITY;
}

function areEqual(a: StoredBackgroundPrefs, b: StoredBackgroundPrefs) {
  return a.id === b.id && a.quality === b.quality;
}

function normalizePrefs(value: StoredBackgroundPrefs): StoredBackgroundPrefs {
  return {
    id: getBackgroundPreset(value.id).id,
    quality: toValidQuality(value.quality),
  };
}

function readPrefsFromStorage(): StoredBackgroundPrefs {
  return normalizePrefs(readJson<StoredBackgroundPrefs>(STORAGE_KEY, DEFAULT_PREFS));
}

function getClientSnapshot(): StoredBackgroundPrefs {
  const next = readPrefsFromStorage();
  if (!areEqual(currentPrefs, next)) {
    currentPrefs = next;
  }
  return currentPrefs;
}

function getServerSnapshot(): StoredBackgroundPrefs {
  return DEFAULT_PREFS;
}

function emit() {
  for (const listener of listeners) listener();
}

function writePrefs(next: StoredBackgroundPrefs) {
  const normalized = normalizePrefs(next);
  if (areEqual(currentPrefs, normalized)) return;
  currentPrefs = normalized;
  writeJson(STORAGE_KEY, normalized);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    const next = readPrefsFromStorage();
    if (areEqual(currentPrefs, next)) return;
    currentPrefs = next;
    emit();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const setBackgroundId = useCallback(
    (id: string) => {
      const next = getBackgroundPreset(id).id;
      if (next === prefs.id) return;
      writePrefs({ id: next, quality: prefs.quality });
    },
    [prefs.id, prefs.quality]
  );

  const setQuality = useCallback(
    (quality: BackgroundQuality) => {
      const nextQuality = toValidQuality(quality);
      if (nextQuality === prefs.quality) return;
      writePrefs({ id: prefs.id, quality: nextQuality });
    },
    [prefs.id, prefs.quality]
  );

  const background = useMemo(() => getBackgroundPreset(prefs.id), [prefs.id]);

  const value = useMemo<BackgroundContextValue>(
    () => ({
      backgrounds: BACKGROUND_PRESETS,
      background,
      backgroundId: prefs.id,
      setBackgroundId,
      quality: prefs.quality,
      setQuality,
    }),
    [background, prefs.id, prefs.quality, setBackgroundId, setQuality]
  );

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error("useBackground must be used within BackgroundProvider");
  return ctx;
}
