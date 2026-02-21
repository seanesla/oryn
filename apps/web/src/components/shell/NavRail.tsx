"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { ArrowDownToLine, FileText, Home, SlidersHorizontal } from "lucide-react";

import { AccentPicker } from "@/components/shell/AccentPicker";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import type { SessionArtifacts } from "@/lib/contracts";
import { download, snapshotToMarkdown } from "@/lib/download";
import { getSession } from "@/lib/sessions";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: "home", href: "/app/co-reading", label: "Home", icon: Home },
  { id: "settings", href: "/app/settings", label: "Settings", icon: SlidersHorizontal },
] as const;

/** Proximity falloff distance in px — items further than this are unaffected. */
const FALLOFF = 120;

/** Active-state matching. Session pages map to Home. */
function isItemActive(itemId: string, pathname: string): boolean {
  switch (itemId) {
    case "home":
      return (
        pathname === "/app/co-reading" ||
        pathname === "/app/history" ||
        pathname.startsWith("/app/session/")
      );
    case "settings":
      return pathname.startsWith("/app/settings");
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/*  NavRailItem — single icon with 3-D proximity transforms            */
/* ------------------------------------------------------------------ */

function NavRailItem({
  id,
  href,
  icon: Icon,
  label,
  active,
  cursorY,
  inZone,
  shouldReduceMotion,
  onMeasure,
}: {
  id: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  cursorY: ReturnType<typeof useMotionValue<number>>;
  inZone: ReturnType<typeof useMotionValue<number>>;
  shouldReduceMotion: boolean;
  onMeasure: (id: string, el: HTMLElement | null) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const centerY = useRef(0);

  /* Measure center once on mount + resize (rail is position:fixed so
     getBoundingClientRect is stable across page scroll). */
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      centerY.current = rect.top + rect.height / 2;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Register element with parent for potential re-measure. */
  useEffect(() => {
    onMeasure(id, elRef.current);
    return () => onMeasure(id, null);
  }, [id, onMeasure]);

  /* ---------- proximity-derived motion values ---------- */

  const springCfg = shouldReduceMotion
    ? { duration: 0 }
    : { stiffness: 360, damping: 28, mass: 0.6 };

  const scale = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 1;
      const zone = inZone.get();
      const dist = Math.abs(cursorY.get() - centerY.current);
      const prox = Math.max(0, 1 - dist / FALLOFF);
      return 1 + prox * 0.25 * zone;
    }),
    springCfg,
  );

  const z = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 0;
      const zone = inZone.get();
      const dist = Math.abs(cursorY.get() - centerY.current);
      return Math.max(0, 1 - dist / FALLOFF) * 22 * zone;
    }),
    springCfg,
  );

  const rotateX = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 0;
      const y = cursorY.get();
      const zone = inZone.get();
      const diff = y - centerY.current;
      const prox = Math.max(0, 1 - Math.abs(diff) / FALLOFF);
      return (diff > 0 ? -1 : 1) * prox * 6 * zone;
    }),
    springCfg,
  );

  const glowOpacity = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 0;
      const zone = inZone.get();
      const dist = Math.abs(cursorY.get() - centerY.current);
      return Math.max(0, 1 - dist / FALLOFF) * 0.45 * zone;
    }),
    springCfg,
  );

  return (
    <Tooltip content={label} side="right">
      <motion.div
        ref={elRef}
        className="relative"
        style={{
          scale,
          z,
          rotateX,
          transformStyle: "preserve-3d",
        }}
      >
        <Link
          href={href}
          className={cn(
            "relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)]",
            "transition-colors duration-150",
            active
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]",
          )}
        >
          {/* Active indicator — slides between items via layoutId */}
          {active && (
            <motion.span
              layoutId="nav-rail-active"
              className="absolute inset-0 -z-10 overflow-hidden rounded-[var(--radius-sm)]"
              transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.6 }}
            >
              <span className="nav-active-indicator block h-full w-full rounded-[var(--radius-sm)]" />
            </motion.span>
          )}

          {/* Proximity glow (visible even for inactive items on hover) */}
          <motion.span
            className="pointer-events-none absolute inset-0 -z-20 rounded-[var(--radius-sm)] bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_28%,transparent),transparent_70%)]"
            style={{ opacity: glowOpacity }}
          />

          <Icon className="relative z-10 h-[18px] w-[18px]" />
          <span className="relative z-10 text-[8px] font-medium leading-none tracking-[0.02em]">{label}</span>
        </Link>
      </motion.div>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/*  Export dropdown (session pages only)                                */
/* ------------------------------------------------------------------ */

function ExportDropdown({ session }: { session: SessionArtifacts }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Tooltip content="Export" side="right">
          <button
            type="button"
            aria-label="Export session"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]",
              "text-[color:var(--muted-fg)] transition-colors duration-150",
              "hover:text-[color:var(--fg)] hover:bg-[color:color-mix(in_oklab,var(--surface-3)_86%,transparent)]",
            )}
          >
            <ArrowDownToLine className="h-[18px] w-[18px]" />
          </button>
        </Tooltip>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={10}
          side="right"
          align="start"
          className={cn(
            "z-[60] w-48 rounded-[var(--radius-lg)] border border-[color:var(--border)]",
            "bg-[color:color-mix(in_oklab,var(--card)_96%,transparent)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl",
          )}
        >
          <DropdownMenu.Item
            onSelect={() => {
              download(
                `oryn-session-${session.sessionId}.json`,
                "application/json",
                JSON.stringify(session, null, 2),
              );
            }}
            className="flex cursor-default select-none items-center gap-2 rounded-[0.65rem] px-2 py-2 text-sm text-[color:var(--fg)] outline-none focus:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--card))]"
          >
            <FileText className="h-4 w-4 text-[color:var(--muted-fg)]" />
            JSON
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => {
              download(
                `oryn-session-${session.sessionId}.md`,
                "text/markdown",
                snapshotToMarkdown(session),
              );
            }}
            className="flex cursor-default select-none items-center gap-2 rounded-[0.65rem] px-2 py-2 text-sm text-[color:var(--fg)] outline-none focus:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--card))]"
          >
            <FileText className="h-4 w-4 text-[color:var(--muted-fg)]" />
            Markdown
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  NavRail (exported)                                                 */
/* ------------------------------------------------------------------ */

export function NavRail() {
  const pathname = usePathname();
  const shouldReduceMotion = Boolean(useReducedMotion());

  /* ---------- session state for Export (ported from TopBar) ---------- */
  const sessionId = useMemo(() => {
    const match = pathname.match(/^\/app\/session\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [, forceRerender] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !isHydrated) return;
    const interval = window.setInterval(() => forceRerender((x) => x + 1), 800);
    return () => window.clearInterval(interval);
  }, [isHydrated, sessionId]);

  const activeSession: SessionArtifacts | null =
    isHydrated && sessionId ? getSession(sessionId) : null;

  /* ---------- 3-D cursor proximity tracking ---------- */
  const railRef = useRef<HTMLElement>(null);
  const cursorY = useMotionValue(-9999);
  const inZone = useMotionValue(0);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      cursorY.set(e.clientY);
      inZone.set(1);
    },
    [cursorY, inZone],
  );

  const handlePointerLeave = useCallback(() => {
    inZone.set(0);
  }, [inZone]);

  /* Item registration (for potential future use / re-measure) */
  const itemEls = useRef<Map<string, HTMLElement>>(new Map());
  const registerItem = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemEls.current.set(id, el);
    else itemEls.current.delete(id);
  }, []);

  return (
    <nav
      ref={railRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "fixed left-3 top-1/2 z-50 hidden -translate-y-1/2 w-[4.2rem] flex-col items-center py-4",
        "rounded-2xl border border-[color:color-mix(in_oklab,var(--accent)_14%,var(--border))]",
        "bg-[color:color-mix(in_oklab,var(--bg)_80%,transparent)] backdrop-blur-xl",
        "shadow-[0_8px_40px_-8px_rgba(0,0,0,0.65)]",
        "md:flex",
      )}
      style={{ perspective: "800px" }}
    >
      {/* ── Oryn logo — links back to landing ── */}
      <Tooltip content="Landing page" side="right">
        <Link
          href="/"
          className="mb-1 flex h-10 w-10 flex-col items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--muted-fg)] transition-colors duration-150 hover:text-[color:var(--fg)]"
          aria-label="Back to landing"
        >
          <span className="text-[11px] font-bold tracking-[-0.04em] text-[color:var(--fg)] opacity-70 hover:opacity-100 transition-opacity">
            oryn
          </span>
        </Link>
      </Tooltip>

      {/* ── Separator ── */}
      <div className="mx-auto my-1.5 h-px w-6 bg-[color:var(--border-soft)]" />

      {/* ── Nav items ── */}
      <div className="flex flex-col items-center gap-1" style={{ transformStyle: "preserve-3d" }}>
        {NAV_ITEMS.map((item) => (
          <NavRailItem
            key={item.id}
            id={item.id}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isItemActive(item.id, pathname)}
            cursorY={cursorY}
            inZone={inZone}
            shouldReduceMotion={shouldReduceMotion}
            onMeasure={registerItem}
          />
        ))}
      </div>

      {/* ── Export (session pages only) ── */}
      {activeSession && (
        <>
          <div className="mx-auto my-1.5 h-px w-6 bg-[color:var(--border-soft)]" />
          <ExportDropdown session={activeSession} />
        </>
      )}

      {/* ── Separator + Accent picker ── */}
      <div className="mx-auto my-1.5 h-px w-6 bg-[color:var(--border-soft)]" />
      <AccentPicker compact side="right" align="start" />
    </nav>
  );
}
