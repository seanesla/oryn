"use client";

import { AccentProvider } from "@/components/providers/AccentProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AccentProvider>{children}</AccentProvider>;
}
