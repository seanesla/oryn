"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { History, Mic2, Newspaper, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/cn";
import { listSessions, refreshSessions } from "@/lib/sessions";

const items = [
  { id: "co-reading", href: "/app", label: "Co-Reading", icon: Newspaper },
  { id: "history", href: "/history", label: "History", icon: History },
  { id: "settings", href: "/settings", label: "Settings", icon: SlidersHorizontal },
] as const;

export function LeftNav() {
  const pathname = usePathname();

  const [cached, setCached] = useState(() => (typeof window !== "undefined" ? listSessions() : []));
  useEffect(() => {
    refreshSessions(10)
      .then((list) => setCached(list))
      .catch(() => {
        // keep cached
      });
  }, []);

  const last = cached[0];
  const hasLiveSession = Boolean(last?.sessionId);
  const liveHref = hasLiveSession ? `/session/${last?.sessionId}` : "/app";

  const merged = [
    items[0]!,
    { id: "live-talk", href: liveHref, label: "Live Talk", icon: Mic2 },
    items[1]!,
    items[2]!,
  ];

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 pr-6 xl:block">
      <div className="mt-8 mb-3 text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-fg)]">Workspace</div>
      <div className="space-y-1.5">
        {merged.map((item) => {
          const active =
            item.id === "co-reading"
              ? pathname === "/app"
              : item.id === "live-talk"
                ? pathname.startsWith("/session/")
                : item.id === "history"
                  ? pathname === "/history"
                  : pathname.startsWith("/settings");
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2 rounded-[0.58rem] px-3 py-2 text-sm",
                "border transition-[background-color,color,border-color]",
                active
                  ? "border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--surface-2))]"
                  : "border-transparent hover:border-[color:var(--border-soft)] hover:bg-[color:color-mix(in_oklab,var(--surface-3)_86%,transparent)]"
              )}
            >
              {active ? (
                <motion.span
                  layoutId="left-nav-active"
                  className="absolute bottom-1 left-1 top-1 w-[2px] -z-10 rounded-full bg-[color:var(--accent)]"
                  transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.6 }}
                />
              ) : null}
              <Icon className={cn("h-4 w-4", active ? "text-[color:var(--accent)]" : "text-[color:var(--muted-fg)]")} />
              <span className={cn(active ? "text-[color:var(--fg)]" : "text-[color:var(--muted-fg)] group-hover:text-[color:var(--fg)]")}>
                {item.label}
              </span>
              {item.id === "live-talk" && !hasLiveSession ? (
                <span className="ml-auto text-[10px] text-[color:var(--muted-fg)]">start first</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-[0.6rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] p-3 text-xs text-[color:var(--muted-fg)]">
        Sessions stream from the backend (SSE) and Live voice uses a backend WebSocket proxy.
      </div>
    </aside>
  );
}
