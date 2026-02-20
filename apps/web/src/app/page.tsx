"use client";

import { useEffect } from "react";

import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGridSection } from "@/components/landing/FeaturesGridSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";

export default function HomePage() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("landing-smooth");
    return () => {
      html.classList.remove("landing-smooth");
    };
  }, []);

  return (
    <div className="relative z-10 w-full">
      <HeroSection />
      <FeaturesGridSection />
      <HowItWorksSection />
      <UseCasesSection />
    </div>
  );
}
