"use client";

import { AccentProvider } from "@/components/providers/AccentProvider";
import { BackgroundProvider } from "@/components/providers/BackgroundProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AccentProvider>
      <BackgroundProvider>{children}</BackgroundProvider>
    </AccentProvider>
  );
}
