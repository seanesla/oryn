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

const FALLOFF = 100;

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
/*  PillItem — single icon with horizontal 3-D proximity transforms    */
/* ------------------------------------------------------------------ */

function PillItem({
  href,
  icon: Icon,
  label,
  active,
  cursorX,
  inZone,
  shouldReduceMotion,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  cursorX: ReturnType<typeof useMotionValue<number>>;
  inZone: ReturnType<typeof useMotionValue<number>>;
  shouldReduceMotion: boolean;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const centerX = useRef(0);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      centerX.current = rect.left + rect.width / 2;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const springCfg = shouldReduceMotion
    ? { duration: 0 }
    : { stiffness: 360, damping: 28, mass: 0.6 };

  const scale = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 1;
      const zone = inZone.get();
      const dist = Math.abs(cursorX.get() - centerX.current);
      return 1 + Math.max(0, 1 - dist / FALLOFF) * 0.2 * zone;
    }),
    springCfg,
  );

  const y = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 0;
      const zone = inZone.get();
      const dist = Math.abs(cursorX.get() - centerX.current);
      return -Math.max(0, 1 - dist / FALLOFF) * 10 * zone;
    }),
    springCfg,
  );

  const rotateY = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 0;
      const zone = inZone.get();
      const diff = cursorX.get() - centerX.current;
      const prox = Math.max(0, 1 - Math.abs(diff) / FALLOFF);
      return (diff > 0 ? 1 : -1) * prox * 5 * zone;
    }),
    springCfg,
  );

  const glowOpacity = useSpring(
    useTransform(() => {
      if (shouldReduceMotion) return 0;
      const zone = inZone.get();
      const dist = Math.abs(cursorX.get() - centerX.current);
      return Math.max(0, 1 - dist / FALLOFF) * 0.5 * zone;
    }),
    springCfg,
  );

  return (
    <motion.div
      ref={elRef}
      className="relative"
      style={{ scale, y, rotateY, transformStyle: "preserve-3d" }}
    >
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full",
          "transition-colors duration-150",
          active
            ? "text-[color:var(--accent)]"
            : "text-[color:var(--muted-fg)]",
        )}
      >
        {active && (
          <motion.span
            layoutId="nav-pill-active"
            className="absolute inset-0.5 -z-10 overflow-hidden rounded-full"
            transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.6 }}
          >
            <span className="nav-active-indicator block h-full w-full rounded-full" />
          </motion.span>
        )}

        <motion.span
          className="pointer-events-none absolute inset-0 -z-20 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_28%,transparent),transparent_70%)]"
          style={{ opacity: glowOpacity }}
        />

        <Icon className="relative z-10 h-4 w-4" />
        <span className="relative z-10 text-[7px] font-medium leading-none">{label}</span>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pill Export button (opens upward)                                   */
/* ------------------------------------------------------------------ */

function PillExport({ session }: { session: SessionArtifacts }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Export session"
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-full",
            "text-[color:var(--muted-fg)] transition-colors duration-150",
          )}
        >
          <ArrowDownToLine className="h-5 w-5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={12}
          side="top"
          align="center"
          className={cn(
            "z-[60] w-44 rounded-[var(--radius-lg)] border border-[color:var(--border)]",
            "bg-[color:color-mix(in_oklab,var(--card)_96%,transparent)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl",
          )}
        >
          <DropdownMenu.Item
            onSelect={() =>
              download(
                `oryn-session-${session.sessionId}.json`,
                "application/json",
                JSON.stringify(session, null, 2),
              )
            }
            className="flex cursor-default select-none items-center gap-2 rounded-[0.65rem] px-2 py-2 text-sm text-[color:var(--fg)] outline-none focus:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--card))]"
          >
            <FileText className="h-4 w-4 text-[color:var(--muted-fg)]" />
            JSON
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() =>
              download(
                `oryn-session-${session.sessionId}.md`,
                "text/markdown",
                snapshotToMarkdown(session),
              )
            }
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
/*  MobileNavPill (exported)                                           */
/* ------------------------------------------------------------------ */

export function MobileNavPill() {
  const pathname = usePathname();
  const shouldReduceMotion = Boolean(useReducedMotion());

  /* ---------- session state for Export ---------- */
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

  /* ---------- horizontal 3-D cursor tracking ---------- */
  const cursorX = useMotionValue(-9999);
  const inZone = useMotionValue(0);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      cursorX.set(e.clientX);
      inZone.set(1);
    },
    [cursorX, inZone],
  );

  const handlePointerLeave = useCallback(() => {
    inZone.set(0);
  }, [inZone]);

  return (
    <nav
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5",
        "border border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))]",
        "bg-[color:color-mix(in_oklab,var(--bg)_72%,transparent)] backdrop-blur-xl",
        "pb-[max(0.375rem,env(safe-area-inset-bottom))]",
        "md:hidden",
      )}
      style={{ perspective: "600px" }}
    >
      {/* ── Oryn logo — links back to landing ── */}
      <Link
        href="/"
        aria-label="Back to landing"
        className="flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--muted-fg)] transition-colors duration-150 hover:text-[color:var(--fg)]"
      >
        <span className="text-[10px] font-bold tracking-[-0.04em] text-[color:var(--fg)] opacity-60">
          oryn
        </span>
      </Link>

      {/* ── Separator ── */}
      <div className="h-5 w-px bg-[color:var(--border-soft)]" />

      {NAV_ITEMS.map((item) => (
        <PillItem
          key={item.id}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={isItemActive(item.id, pathname)}
          cursorX={cursorX}
          inZone={inZone}
          shouldReduceMotion={shouldReduceMotion}
        />
      ))}

      {activeSession && <PillExport session={activeSession} />}
    </nav>
  );
}
