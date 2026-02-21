"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { SessionConstraints } from "@/lib/contracts";
import { defaultConstraints } from "@/lib/sessions";
import { readJson, writeJson } from "@/lib/storage";

const STORAGE_KEY = "oryn:constraints:v1";

const listeners = new Set<() => void>();
let current: SessionConstraints = defaultConstraints();

function readFromStorage(): SessionConstraints {
  return readJson<SessionConstraints>(STORAGE_KEY, defaultConstraints());
}

function getClientSnapshot(): SessionConstraints {
  const next = readFromStorage();
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    current = next;
  }
  return current;
}

const serverSnapshot: SessionConstraints = defaultConstraints();

function getServerSnapshot(): SessionConstraints {
  return serverSnapshot;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    const next = readFromStorage();
    if (JSON.stringify(current) !== JSON.stringify(next)) {
      current = next;
      emit();
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useConstraints() {
  const constraints = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const setConstraints = useCallback(
    (updater: SessionConstraints | ((prev: SessionConstraints) => SessionConstraints)) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (JSON.stringify(current) === JSON.stringify(next)) return;
      current = next;
      writeJson(STORAGE_KEY, next);
      emit();
    },
    []
  );

  return { constraints, setConstraints } as const;
}
