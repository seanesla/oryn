"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  Bug,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";

import type { SessionArtifacts, TranscriptChunk } from "@/lib/contracts";
import type { MockRuntimeActions } from "@/lib/mockStream";
import { cn } from "@/lib/cn";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { Slider } from "@/components/ui/Slider";
import { enterTransition } from "@/lib/motion";

type PermissionState = "unknown" | "granted" | "denied";

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function groupTurns(chunks: Array<TranscriptChunk>) {
  const byTurn = new Map<string, Array<TranscriptChunk>>();
  for (const c of chunks) {
    const arr = byTurn.get(c.turnId) ?? [];
    arr.push(c);
    byTurn.set(c.turnId, arr);
  }
  const turns = Array.from(byTurn.values())
    .map((arr) => arr.sort((a, b) => a.timestampMs - b.timestampMs))
    .map((arr) => {
      const last = arr[arr.length - 1]!;
      const final = [...arr].reverse().find((x) => !x.isPartial) ?? last;
      return {
        turnId: last.turnId,
        speaker: last.speaker,
        timestampMs: last.timestampMs,
        text: final.text,
        isPartial: final.isPartial ?? false,
      };
    })
    .sort((a, b) => a.timestampMs - b.timestampMs);
  return turns;
}

export function LiveAudioConsole({
  session,
  actions,
}: {
  session: SessionArtifacts;
  actions: MockRuntimeActions;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [recording, setRecording] = useState(false);
  const [interrupting, setInterrupting] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const [volume, setVolume] = useState(78);
  const [muted, setMuted] = useState(false);

  const [lastMessageType, setLastMessageType] = useState("-");

  const streamRef = useRef<MediaStream | null>(null);
  const agentTimersRef = useRef<Array<number>>([]);

  const turns = useMemo(() => groupTurns(session.transcript), [session.transcript]);

  useEffect(() => {
    return () => {
      agentTimersRef.current.forEach((t) => window.clearTimeout(t));
      agentTimersRef.current = [];
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
    };
  }, []);

  async function ensureMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("denied");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission("granted");
      return true;
    } catch {
      setPermission("denied");
      return false;
    }
  }

  function stopAgentSpeechTimers() {
    agentTimersRef.current.forEach((t) => window.clearTimeout(t));
    agentTimersRef.current = [];
  }

  function simulateAgentResponse() {
    stopAgentSpeechTimers();
    setAgentSpeaking(true);

    const turnId = `agent_${Date.now()}`;
    const start = Date.now();
    const lines = [
      "I can’t treat the article as a single dispute — it’s at least three: measurement, causality, and values.",
      "I’m building evidence cards now and will flag what’s missing as explicit gaps.",
    ];

    let text = "";
    let idx = 0;
    const tick = () => {
      text = `${text}${(text ? " " : "")}${lines[idx]}`;
      idx += 1;
      setLastMessageType("transcript.agent.partial");
      actions.appendTranscript({
        speaker: "agent",
        text,
        timestampMs: Date.now(),
        isPartial: idx < lines.length,
        turnId,
      });

      if (idx >= lines.length) {
        setLastMessageType("transcript.agent.final");
        setAgentSpeaking(false);
        return;
      }
      agentTimersRef.current.push(window.setTimeout(tick, 680));
    };

    agentTimersRef.current.push(window.setTimeout(tick, Math.max(250, start ? 420 : 420)));
  }

  async function handleStartStop() {
    if (!recording) {
      if (agentSpeaking) {
        setInterrupting(true);
        stopAgentSpeechTimers();
        setAgentSpeaking(false);
        window.setTimeout(() => setInterrupting(false), 900);
      }

      const ok = await ensureMicPermission();
      if (!ok) return;

      setRecording(true);

      const turnId = `user_${Date.now()}`;
      setLastMessageType("transcript.user.partial");
      actions.appendTranscript({
        speaker: "user",
        text: "What’s missing here…",
        timestampMs: Date.now(),
        isPartial: true,
        turnId,
      });

      window.setTimeout(() => {
        setLastMessageType("transcript.user.final");
        actions.appendTranscript({
          speaker: "user",
          text: "What’s missing here? Give me the strongest counter-frame and show your trace.",
          timestampMs: Date.now(),
          isPartial: false,
          turnId,
        });
        simulateAgentResponse();
      }, 520);

      return;
    }

    setRecording(false);
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }

  const tokenExpirySeconds = 15 * 60;
  const tokenCountdown = formatTime(tokenExpirySeconds * 1000);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">Live Audio</div>
          <div className="mt-1 text-xs text-[color:var(--muted-fg)]">
            Mic in, transcript out. Barge-in stops the agent instantly.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={permission === "denied" ? "bad" : permission === "granted" ? "good" : "neutral"}>
            {permission === "granted" ? "Mic ready" : permission === "denied" ? "Mic blocked" : "Mic"}
          </Badge>
          <Button variant="ghost" onClick={() => setDebugOpen((v) => !v)}>
            <Bug className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Divider className="my-4" />

      <AnimatePresence initial={false}>
        {permission === "denied" ? (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={enterTransition(Boolean(shouldReduceMotion))}
            className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--bad)_10%,var(--card))] p-3"
          >
            <div className="text-sm font-medium">Microphone permission required</div>
            <div className="mt-1 text-xs text-[color:var(--muted-fg)]">
              Your browser blocked mic access. Allow it in site settings, then press Start again.
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 grid gap-4">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <AnimatePresence>
                {recording && !shouldReduceMotion ? (
                  <motion.span
                    key="mic-pulse"
                    aria-hidden
                    className="absolute inset-0 rounded-[0.8rem]"
                    initial={{ opacity: 0.45, scale: 0.95 }}
                    animate={{ opacity: [0.45, 0, 0], scale: [0.95, 1.18, 1.22] }}
                    exit={{ opacity: 0 }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      border: "1px solid color-mix(in oklab, var(--accent) 50%, transparent)",
                    }}
                  />
                ) : null}
              </AnimatePresence>
              <Button
                onClick={handleStartStop}
                variant={recording ? "danger" : "solid"}
                className="relative h-12 px-4"
              >
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {recording ? "Stop" : "Start"}
              </Button>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border",
                recording
                  ? "border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--card))]"
                  : "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_84%,transparent)]"
              )}>
                <Waves className={cn("h-4 w-4", recording ? "text-[color:var(--accent)]" : "text-[color:var(--muted-fg)]")} />
              </div>
              <div className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={interrupting ? "interrupting" : agentSpeaking ? "agent" : recording ? "listening" : "idle"}
                    className="truncate text-sm"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
                  >
                    {interrupting ? "Interrupting…" : agentSpeaking ? "Agent speaking" : recording ? "Listening" : "Idle"}
                  </motion.div>
                </AnimatePresence>
                <div className="text-xs text-[color:var(--muted-fg)]">
                  {agentSpeaking ? "Barge in to redirect." : "Press Start to speak."}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border",
                "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)]",
                "hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))]"
              )}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-[color:var(--muted-fg)]" />
              ) : (
                <Volume2 className="h-4 w-4 text-[color:var(--muted-fg)]" />
              )}
            </button>
            <div className="w-28">
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0] ?? 78)}
                min={0}
                max={100}
                step={1}
                aria-label="Volume"
              />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_82%,transparent)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-3 py-2">
            <div className="text-xs font-medium text-[color:var(--muted-fg)]">Transcript</div>
            <div className="text-[11px] text-[color:var(--muted-fg)]">
              {turns.length} turns
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0">
            <div className="border-r border-[color:var(--border)] px-3 py-2">
              <div className="mb-2 text-[11px] font-medium text-[color:var(--muted-fg)]">User</div>
              <div className="space-y-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {turns
                    .filter((t) => t.speaker === "user")
                    .slice(-6)
                    .map((t) => (
                      <motion.div
                        key={t.turnId}
                        layout
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.22 }}
                        className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] text-[color:var(--muted-fg)]">
                          <span>{formatTime(t.timestampMs)}</span>
                          {t.isPartial ? <span>partial</span> : <span>final</span>}
                        </div>
                        <div className="mt-1 text-sm leading-snug text-[color:var(--fg)]">{t.text}</div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {turns.filter((t) => t.speaker === "user").length === 0 ? (
                  <div className="text-xs text-[color:var(--muted-fg)]">No user audio yet.</div>
                ) : null}
              </div>
            </div>

            <div className="px-3 py-2">
              <div className="mb-2 text-[11px] font-medium text-[color:var(--muted-fg)]">Agent</div>
              <div className="space-y-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {turns
                    .filter((t) => t.speaker === "agent")
                    .slice(-6)
                    .map((t) => (
                      <motion.div
                        key={t.turnId}
                        layout
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.22 }}
                        className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_6%,var(--card))] p-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] text-[color:var(--muted-fg)]">
                          <span>{formatTime(t.timestampMs)}</span>
                          {t.isPartial ? <span>partial</span> : <span>final</span>}
                        </div>
                        <div className="mt-1 text-sm leading-snug text-[color:var(--fg)]">{t.text}</div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {turns.filter((t) => t.speaker === "agent").length === 0 ? (
                  <div className="text-xs text-[color:var(--muted-fg)]">Agent response appears here.</div>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {debugOpen ? (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_84%,transparent)] p-3 text-xs text-[color:var(--muted-fg)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[color:var(--fg)]">Debug</div>
                <div className="text-[11px]">mock stream</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                  WebSocket state: <span className="text-[color:var(--fg)]">{session.wsState}</span>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                  Last message: <span className="text-[color:var(--fg)]">{lastMessageType}</span>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                  Token expiry (mock): <span className="text-[color:var(--fg)]">{tokenCountdown}</span>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                  Output: <span className="text-[color:var(--fg)]">{muted ? "muted" : `vol ${volume}`}</span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Card>
  );
}
