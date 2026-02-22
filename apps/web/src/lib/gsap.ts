"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

let pluginsRegistered = false;

export function registerGsapPlugins(): void {
  if (pluginsRegistered) return;
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  pluginsRegistered = true;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
