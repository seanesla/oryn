"use client";

import { AccentProvider } from "@/components/providers/AccentProvider";
import { BackgroundProvider } from "@/components/providers/BackgroundProvider";
import { LandingBackgroundProvider } from "@/components/providers/LandingBackgroundProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AccentProvider>
      <BackgroundProvider>
        <LandingBackgroundProvider>{children}</LandingBackgroundProvider>
      </BackgroundProvider>
    </AccentProvider>
  );
}
