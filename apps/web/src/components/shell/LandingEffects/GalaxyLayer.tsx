"use client";

/**
 * Galaxy — Three.js WebGL particle system.
 *
 * Technique: same family as evolve/Galaxy.jsx (Three.Points + AdditiveBlending +
 * distance-based vertex colours + sizeAttenuation). Different vibe:
 *   • Procedurally generated — no GLB loaded
 *   • 3-arm spiral (bar removed) vs evolve's 2-arm loaded model
 *   • Accent-driven colours (theme-reactive)
 *   • Dramatic angled side-view camera instead of overhead
 *   • Fake bloom via a second wider, dim particle pass (no post-processing dep)
 *   • Deep-field star shell fills the void around the galaxy
 */

import { useEffect, useRef } from "react";
import {
  BlendFunction,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ScanlineEffect,
  VignetteEffect,
} from "postprocessing";
import * as THREE from "three";

type ThreeNS = typeof THREE & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

type Props = {
  accent: string;
  accent2: string;
  variant?: 1 | 2;
  reducedMotion?: boolean;
};

// ── Vertex / fragment shaders for a soft-circle point ──────────────────────
const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;

  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    // soft radial falloff — linear blend avoids the hot white core blowout
    float a = (1.0 - d * 2.0);
    a = a * a * 0.85;
    gl_FragColor = vec4(vColor, a);
  }
`;

// ── Bloom pass shaders — wider, much dimmer, hard size cap ─────────────────
const BLOOM_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // 220 — subtle halo only. Hard cap at 18 px so dense core can't stack white.
    float sz = aSize * (220.0 / -mv.z);
    gl_PointSize = min(sz, 18.0);
    gl_Position  = projectionMatrix * mv;
  }
`;
const BLOOM_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = (1.0 - d * 2.0);
    a = a * a * a * 0.05;   // very faint halo — prevents core accumulation
    gl_FragColor = vec4(vColor, a);
  }
`;

// ── Mid-field haze stars — low alpha, larger spread, slow parallax ─────────
const MID_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (240.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const MID_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = (1.0 - d * 2.0);
    a = a * a * 0.35;
    gl_FragColor = vec4(vColor, a);
  }
`;

// ── Deep-field (tiny background stars, very simple shader) ─────────────────
const FIELD_VERT = /* glsl */ `
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vAlpha = aSize;   // we reuse the size slot to carry alpha
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.5;      // always 1-2 px regardless of distance
    gl_Position  = projectionMatrix * mv;
  }
`;
const FIELD_FRAG = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * (1.0 - d * 2.0));
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────
function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0.49, 0.61, 1.0];
  const v = parseInt(m[1]!, 16);
  return [((v >> 16) & 0xff) / 255, ((v >> 8) & 0xff) / 255, (v & 0xff) / 255];
}

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c, a[2] + (b[2] - a[2]) * c];
}

// ── Galaxy geometry builder ─────────────────────────────────────────────────
function buildGeometry(
  totalStars: number,
  warm:    [number, number, number],
  accent:  [number, number, number],
  accent2: [number, number, number],
) {
  const pos   = new Float32Array(totalStars * 3);
  const col   = new Float32Array(totalStars * 3);
  const sizes = new Float32Array(totalStars);

  const NUM_ARMS  = 3;
  const ARM_SWEEP = Math.PI * 2.8;
  const DISK_H    = 0.14;
  const MAX_R     = 10.0;

  let n = 0;

  const set = (
    x: number, y: number, z: number,
    r: number, g: number, b: number,
    size: number,
  ) => {
    if (n >= totalStars) return;
    pos[n * 3]     = x;  pos[n * 3 + 1] = y;  pos[n * 3 + 2] = z;
    col[n * 3]     = r;  col[n * 3 + 1] = g;  col[n * 3 + 2] = b;
    sizes[n]       = size;
    n++;
  };

  // ── Core / bulge (20 %) — bright round centre; sigma 1.25 spreads it enough
  //   that it looks like a glowing bulge, not a single white pixel stack.
  //   Bar removed — that was the cheese stick, not this.
  const coreN = Math.floor(totalStars * 0.20);
  for (let i = 0; i < coreN; i++) {
    const u = Math.random(), v = Math.random();
    const g = Math.sqrt(-2 * Math.log(Math.max(u, 1e-9)));
    const r = g * 1.25;
    const a = v * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = (Math.random() - 0.5) * DISK_H * 2;
    const z = Math.sin(a) * r;
    const dist = Math.min(1, Math.sqrt(x * x + z * z) / 3);
    const [cr, cg, cb] = lerp3(warm, accent, dist);
    const rand = 0.55 + Math.random() * 0.45;
    set(x, y, z, cr * rand, cg * rand, cb * rand, 0.5 + Math.random() * 1.6);
  }

  // ── Spiral arms (72 %) — bar removed, those stars redistributed here ──────
  const armStarsTotal = Math.floor(totalStars * 0.72);
  const perArm        = Math.floor(armStarsTotal / NUM_ARMS);

  for (let a = 0; a < NUM_ARMS; a++) {
    const base = (a / NUM_ARMS) * Math.PI * 2;
    for (let i = 0; i < perArm; i++) {
      const t     = Math.pow(i / perArm, 0.72);
      const r     = 0.5 + t * MAX_R;
      const theta = base + t * ARM_SWEEP;
      const sc  = (0.18 + t * 0.62) * 1.6;
      const x   = Math.cos(theta) * r + (Math.random() - 0.5) * sc;
      const y   = (Math.random() - 0.5) * (DISK_H + t * DISK_H * 1.2);
      const z   = Math.sin(theta) * r + (Math.random() - 0.5) * sc;
      const d   = Math.min(1, Math.sqrt(x * x + z * z) / MAX_R);
      const [cr, cg, cb] = d < 0.5
        ? lerp3(warm,   accent,  d * 2)
        : lerp3(accent, accent2, (d - 0.5) * 2);
      const rand = 0.55 + Math.random() * 0.45;
      set(x, y, z, cr * rand, cg * rand, cb * rand,
        0.3 + Math.random() * (t < 0.3 ? 1.6 : 0.95) * (1 - t * 0.35));
    }
  }

  // ── Near background field (remaining) — disk around galaxy ───────────────
  while (n < totalStars) {
    const x = (Math.random() - 0.5) * 40;
    const y = (Math.random() - 0.5) * 14;
    const z = (Math.random() - 0.5) * 40;
    const br = 0.32 + Math.random() * 0.20;
    set(x, y, z, br * 0.60, br * 0.70, br, 0.15 + Math.random() * 0.38);
  }

  return { pos, col, sizes, count: n };
}

// ── Mid-field builder ───────────────────────────────────────────────────────
//   A sparse, soft layer around the main galaxy so the scene feels busier
//   without dramatically increasing overdraw.
function buildMidField(
  count: number,
  accent: [number, number, number],
  accent2: [number, number, number],
) {
  const pos   = new Float32Array(count * 3);
  const col   = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 12 + Math.random() * 23;
    const jit = (Math.random() - 0.5) * 3.2;

    const x = Math.cos(ang) * rad + jit;
    const z = Math.sin(ang) * rad + jit;
    const y = (Math.random() - 0.5) * 8.5;

    pos[i * 3]     = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    const mix = Math.random();
    const [r, g, b] = lerp3(accent, accent2, mix);
    const lum = 0.22 + Math.random() * 0.24;
    col[i * 3]     = r * lum;
    col[i * 3 + 1] = g * lum;
    col[i * 3 + 2] = b * lum;

    sizes[i] = 0.24 + Math.random() * 0.72;
  }

  return { pos, col, sizes };
}

// ── Deep-field star sphere builder ──────────────────────────────────────────
//   ~4 500 tiny stars uniformly distributed on a large sphere shell around
//   the scene — fills the void/black sky without hurting performance.
function buildDeepField(count: number) {
  const pos   = new Float32Array(count * 3);
  const alpha = new Float32Array(count);  // we reuse "aSize" slot for alpha

  for (let i = 0; i < count; i++) {
    // Uniform sphere distribution (Marsaglia rejection sampling)
    let x = 0, y = 0, z = 0;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
    } while (x * x + y * y + z * z > 1);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;

    // Place on shell between radius 45 and 90 — far enough to look like sky
    const r = 45 + Math.random() * 45;
    pos[i * 3]     = (x / len) * r;
    pos[i * 3 + 1] = (y / len) * r;
    pos[i * 3 + 2] = (z / len) * r;

    // Vary brightness: most stars dim, a few brighter ones
    alpha[i] = Math.pow(Math.random(), 1.8) * 0.55 + 0.08;
  }

  return { pos, alpha };
}

// ── Component ──────────────────────────────────────────────────────────────
export function GalaxyLayer({ accent, accent2, variant = 1, reducedMotion = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return;

    const T = THREE as ThreeNS;

    // ── Renderer ───────────────────────────────────────────────────────────
    // alpha:true so the canvas is transparent — the CSS gradient behind it
    // becomes the sky colour without any extra GPU draw calls.
    const renderer = new T.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);   // fully transparent clear
    const domEl = renderer.domElement as HTMLCanvasElement;
    domEl.style.cssText =
      "position:absolute;inset:0;width:100%!important;height:100%!important;display:block;";
    ctn.appendChild(domEl);

    // ── Scene / camera ─────────────────────────────────────────────────────
    const scene  = new T.Scene();
    const camera = new T.PerspectiveCamera(58, 1, 0.1, 250);
    camera.position.set(2, 9, 17);
    camera.lookAt(0, 0, 0);

    // ── Build galaxy geometry ───────────────────────────────────────────────
    const starCount = variant === 2 ? 24000 : 18000;
    // Warm white for the core — bright but not full 1.0 so it stays golden, not white
    const warm: [number, number, number] = [0.98, 0.90, 0.76];
    const acc  = parseHex(accent);
    const acc2 = parseHex(accent2);

    const { pos, col, sizes, count } = buildGeometry(starCount, warm, acc, acc2);

    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos,   3));
    geo.setAttribute("aColor",   new T.BufferAttribute(col,   3));
    geo.setAttribute("aSize",    new T.BufferAttribute(sizes, 1));
    geo.setDrawRange(0, count);

    // ── Main particle pass ─────────────────────────────────────────────────
    const mat = new T.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      blending:       T.AdditiveBlending,
      depthWrite:     false,
    });
    const points = new T.Points(geo, mat);

    // ── Fake bloom pass ────────────────────────────────────────────────────
    const bloomMat = new T.ShaderMaterial({
      vertexShader:   BLOOM_VERT,
      fragmentShader: BLOOM_FRAG,
      transparent:    true,
      blending:       T.AdditiveBlending,
      depthWrite:     false,
    });
    const bloomPoints = new T.Points(geo, bloomMat);

    // Both layers rotate together
    const group = new T.Group();
    group.add(bloomPoints);
    group.add(points);
    scene.add(group);

    // ── Mid-field haze layer ────────────────────────────────────────────────
    const midCount = variant === 2 ? 3600 : 2800;
    const midData = buildMidField(midCount, acc, acc2);
    const midGeo = new T.BufferGeometry();
    midGeo.setAttribute("position", new T.BufferAttribute(midData.pos,   3));
    midGeo.setAttribute("aColor",   new T.BufferAttribute(midData.col,   3));
    midGeo.setAttribute("aSize",    new T.BufferAttribute(midData.sizes, 1));
    const midMat = new T.ShaderMaterial({
      vertexShader:   MID_VERT,
      fragmentShader: MID_FRAG,
      transparent:    true,
      blending:       T.AdditiveBlending,
      depthWrite:     false,
    });
    const midPoints = new T.Points(midGeo, midMat);
    scene.add(midPoints);

    // ── Deep-field star shell ───────────────────────────────────────────────
    //   Static — doesn't rotate (stars are "infinitely" far away).
    //   ~5 600 tiny 1.5 px dots, still very cheap.
    const DEEP_COUNT = 5600;
    const { pos: dfPos, alpha: dfAlpha } = buildDeepField(DEEP_COUNT);
    const dfGeo = new T.BufferGeometry();
    dfGeo.setAttribute("position", new T.BufferAttribute(dfPos,   3));
    dfGeo.setAttribute("aSize",    new T.BufferAttribute(dfAlpha, 1));
    const dfMat = new T.ShaderMaterial({
      vertexShader:   FIELD_VERT,
      fragmentShader: FIELD_FRAG,
      transparent:    true,
      blending:       T.AdditiveBlending,
      depthWrite:     false,
    });
    const dfPoints = new T.Points(dfGeo, dfMat);
    // Static — added directly to scene, not the rotating group
    scene.add(dfPoints);

    // ── GitHub effect stack: pmndrs/postprocessing ─────────────────────────
    // https://github.com/pmndrs/postprocessing
    // Scanline + Noise + Chromatic Aberration + Vignette gives a stronger
    // "old CRT" look than CSS-only overlays while staying inexpensive.
    const composer = new EffectComposer(renderer, { multisampling: 0 });
    const renderPass = new RenderPass(scene, camera);

    const scanlineEffect = new ScanlineEffect({
      blendFunction: BlendFunction.OVERLAY,
      density: 1.45,
    });
    scanlineEffect.blendMode.opacity.value = 0.72;

    const noiseEffect = new NoiseEffect({
      blendFunction: BlendFunction.SOFT_LIGHT,
      premultiply: true,
    });
    noiseEffect.blendMode.opacity.value = 0.32;

    const chromaEffect = new ChromaticAberrationEffect({
      offset: new T.Vector2(0.0014, 0.0012),
      radialModulation: true,
      modulationOffset: 0.22,
    });
    chromaEffect.blendMode.opacity.value = 0.78;

    const vignetteEffect = new VignetteEffect({
      eskil: false,
      offset: 0.26,
      darkness: 0.74,
    });
    vignetteEffect.blendMode.opacity.value = 0.86;

    const crtPass = new EffectPass(
      camera,
      scanlineEffect,
      noiseEffect,
      chromaEffect,
      vignetteEffect,
    );
    crtPass.renderToScreen = true;

    composer.addPass(renderPass);
    composer.addPass(crtPass);

    // ── Resize ─────────────────────────────────────────────────────────────
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = ctn;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(ctn);
    resize();

    // ── Animation loop ─────────────────────────────────────────────────────
    const rotSpeed = variant === 2 ? 0.022 : 0.015;
    let raf = 0;

    if (reducedMotion) {
      // Render a single static frame — no continuous animation.
      composer.render();
    } else {
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = performance.now() * 0.001;
        group.rotation.y = t * rotSpeed;
        // subtle opposite drift for depth/parallax feeling
        midPoints.rotation.y = -t * (rotSpeed * 0.26);
        midPoints.rotation.x = Math.sin(t * 0.11) * 0.03;
        composer.render();
      };
      raf = requestAnimationFrame(tick);
    }

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      mat.dispose();
      bloomMat.dispose();
      midGeo.dispose();
      midMat.dispose();
      dfGeo.dispose();
      dfMat.dispose();
      composer.dispose();
      renderer.dispose();
      if (domEl.parentNode === ctn) ctn.removeChild(domEl);
    };
  }, [accent, accent2, variant, reducedMotion]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 120% 90% at 52% 48%, #0e0728 0%, #07041a 38%, #030210 68%, #010108 100%)",
      }}
    >
      {/* ── CRT overlay — pure CSS, zero GPU cost ────────────────────────────
           Three layers stacked:
           1. Horizontal scanlines  (the most iconic CRT trait)
           2. Vertical RGB phosphor columns  (each pixel has R/G/B sub-dots)
           3. Radial vignette  (CRT screens dim toward the edges)        */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          backgroundImage: [
            // 1 — scanlines: 3 px transparent + 1 px dark stripe, repeating
            "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
            // 2 — RGB phosphor columns: 2 px R · 2 px G · 2 px B, very faint
            "repeating-linear-gradient(90deg, rgba(255,60,60,0.022) 0px, rgba(255,60,60,0.022) 2px, rgba(60,255,60,0.022) 2px, rgba(60,255,60,0.022) 4px, rgba(60,60,255,0.022) 4px, rgba(60,60,255,0.022) 6px)",
            // 3 — vignette: edges darken like a tube screen
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          ].join(", "),
        }}
      />
    </div>
  );
}
