"use client";

import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGridSection } from "@/components/landing/FeaturesGridSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { ClosingSection } from "@/components/landing/ClosingSection";

export default function HomePage() {
  return (
    <div className="relative z-10 w-full">
      <HeroSection />
      <FeaturesGridSection />
      <HowItWorksSection />
      <UseCasesSection />
      <ClosingSection />
    </div>
  );
}
