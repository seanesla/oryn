"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ArrowDownToLine, FileText, Plus, Wifi, WifiOff } from "lucide-react";

import { AccentPicker } from "@/components/shell/AccentPicker";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { SessionArtifacts, WsState } from "@/lib/contracts";
import { getSession } from "@/lib/sessions";

function wsTone(ws: WsState) {
  if (ws === "connected") return "good";
  if (ws === "reconnecting") return "warn";
  return "bad";
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const sessionId = useMemo(() => {
    const match = pathname.match(/^\/session\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [, forceRerender] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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

  const active: SessionArtifacts | null = isHydrated && sessionId ? getSession(sessionId) : null;

  const ws = active?.wsState ?? "connected";
  const current = active?.latencyMs.current ?? 0;
  const p50 = active?.latencyMs.p50 ?? 0;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[color:color-mix(in_oklab,var(--border)_88%,transparent)] bg-[color:color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <Image src="/orynlogo.svg" alt="Oryn logo" width={20} height={20} className="h-5 w-5" priority />
          <div className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--fg)]">oryn</div>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={ws}
              initial={shouldReduceMotion ? false : { opacity: 0.7, y: -4, scale: 0.98 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge tone={wsTone(ws)}>
                {ws === "connected" ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : ws === "offline" ? (
                  <WifiOff className="h-3.5 w-3.5" />
                ) : (
                  <Wifi className="h-3.5 w-3.5" />
                )}
                {ws === "connected" ? "Connected" : ws === "reconnecting" ? "Reconnecting" : "Offline"}
              </Badge>
            </motion.div>
          </AnimatePresence>

          <div className="hidden md:flex items-center gap-2 rounded-[0.58rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)] px-3 py-1.5 text-[11px] text-[color:var(--muted-fg)]">
            <span>Latency</span>
            <span className="rounded-[0.42rem] border border-[color:color-mix(in_oklab,var(--accent)_35%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface-2))] px-1.5 py-0.5 text-[10px] text-[color:var(--fg)]">
              p50 {p50}ms
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={current}
                className="text-[color:var(--fg)]"
                initial={shouldReduceMotion ? false : { opacity: 0.7, y: 4 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {current}ms
              </motion.span>
            </AnimatePresence>
          </div>

          <AccentPicker />

          <Button
            variant="outline"
            aria-label="New session"
            title="New session"
            onClick={() => {
              router.push("/app");
            }}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Session</span>
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button
                  variant="solid"
                  size="sm"
                  aria-label="Export session"
                  title="Export session"
                  disabled={!active}
                  className={cn(!active && "hidden sm:inline-flex")}
                >
                <ArrowDownToLine className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={10}
                align="end"
                className="z-50 w-52 rounded-[0.9rem] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_96%,transparent)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl"
              >
                <DropdownMenu.Item
                  onSelect={() => {
                    if (!active) return;
                    download(
                      `oryn-session-${active.sessionId}.json`,
                      "application/json",
                      JSON.stringify(active, null, 2)
                    );
                  }}
                  className="flex cursor-default select-none items-center gap-2 rounded-[0.65rem] px-2 py-2 text-sm text-[color:var(--fg)] outline-none focus:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--card))]"
                >
                  <FileText className="h-4 w-4 text-[color:var(--muted-fg)]" />
                  JSON
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    if (!active) return;
                    const md = [
                      `# oryn session ${active.sessionId}`,
                      "",
                      `- Mode: ${active.mode}`,
                      active.url ? `- URL: ${active.url}` : "- URL: (none)",
                      active.title ? `- Title: ${active.title}` : "",
                      "",
                      "## Choice Set (Next 3 Reads)",
                      ...active.choiceSet.map((i) => `- [${i.title}](${i.url}) — ${i.reason}`),
                      "",
                      "## Evidence Cards",
                      ...active.evidenceCards.flatMap((c) => [
                        `### ${c.claimText}`,
                        `- Dispute: ${c.disagreementType}`,
                        `- Confidence: ${c.confidence}`,
                        "Evidence:",
                        ...c.evidence.map((e) => `- \\"${e.quote}\\" (${e.url})`),
                        "Counter-evidence:",
                        ...c.counterEvidence.map((e) => `- \\"${e.quote}\\" (${e.url})`),
                        "",
                      ]),
                    ].join("\n");
                    download(`oryn-session-${active.sessionId}.md`, "text/markdown", md);
                  }}
                  className="flex cursor-default select-none items-center gap-2 rounded-[0.65rem] px-2 py-2 text-sm text-[color:var(--fg)] outline-none focus:bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--card))]"
                >
                  <FileText className="h-4 w-4 text-[color:var(--muted-fg)]" />
                  Markdown
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}
