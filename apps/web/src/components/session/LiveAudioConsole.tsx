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

import type { SessionArtifacts, TranscriptChunk, WsState } from "@/lib/contracts";
import { apiBaseUrl } from "@/lib/api";
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
}: {
  session: SessionArtifacts;
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
  const [lastError, setLastError] = useState<string | null>(null);
  const [audioWsState, setAudioWsState] = useState<WsState>("offline");

  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef(false);

  const inputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const outputCtxRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const scheduledSourcesRef = useRef<Array<AudioBufferSourceNode>>([]);
  const playheadRef = useRef<number>(0);
  const agentSpeakingTimerRef = useRef<number | null>(null);

  const turns = useMemo(() => groupTurns(session.transcript), [session.transcript]);

  type LiveWsMessage =
    | { type: "audio.chunk"; mimeType: string; dataBase64: string }
    | { type: "debug"; message: string }
    | { type: "error"; message: string }
    | { type: string; [k: string]: unknown };

  useEffect(() => {
    const gain = outputGainRef.current;
    if (!gain) return;
    gain.gain.value = muted ? 0 : Math.max(0, Math.min(1, volume / 100));
  }, [muted, volume]);

  useEffect(() => {
    return () => {
      if (agentSpeakingTimerRef.current) window.clearTimeout(agentSpeakingTimerRef.current);
      agentSpeakingTimerRef.current = null;

      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;

      scheduledSourcesRef.current.forEach((s) => {
        try {
          s.stop();
        } catch {
          // ignore
        }
      });
      scheduledSourcesRef.current = [];

      processorRef.current?.disconnect();
      processorRef.current = null;
      inputCtxRef.current?.close().catch(() => {});
      inputCtxRef.current = null;
      outputCtxRef.current?.close().catch(() => {});
      outputCtxRef.current = null;
      outputGainRef.current = null;

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

  function wsUrlForSession(sessionId: string) {
    const http = apiBaseUrl();
    const wsBase = http.startsWith("https://")
      ? `wss://${http.slice("https://".length)}`
      : http.startsWith("http://")
        ? `ws://${http.slice("http://".length)}`
        : http;
    return `${wsBase}/v1/sessions/${sessionId}/live`;
  }

  function parsePcmRate(mimeType: string): number {
    const m = mimeType.match(/rate=(\d+)/);
    const n = m?.[1] ? Number(m[1]) : NaN;
    return Number.isFinite(n) ? n : 24000;
  }

  function base64ToBytes(b64: string) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToBase64(bytes: Uint8Array) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode(...slice);
    }
    return btoa(binary);
  }

  function floatTo16BitPCMBytes(input: Float32Array) {
    const out = new Uint8Array(input.length * 2);
    const view = new DataView(out.buffer);
    for (let i = 0; i < input.length; i += 1) {
      const s = Math.max(-1, Math.min(1, input[i] ?? 0));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return out;
  }

  function resampleLinear(input: Float32Array, fromRate: number, toRate: number) {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outLen = Math.max(1, Math.round(input.length / ratio));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i += 1) {
      const x = i * ratio;
      const i0 = Math.floor(x);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const frac = x - i0;
      const a = input[i0] ?? 0;
      const b = input[i1] ?? 0;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  function stopOutputImmediately() {
    scheduledSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        // ignore
      }
    });
    scheduledSourcesRef.current = [];
    const ctx = outputCtxRef.current;
    if (ctx) playheadRef.current = ctx.currentTime;
  }

  function ensureOutput() {
    if (outputCtxRef.current && outputGainRef.current) return;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = muted ? 0 : Math.max(0, Math.min(1, volume / 100));
    gain.connect(ctx.destination);
    outputCtxRef.current = ctx;
    outputGainRef.current = gain;
    playheadRef.current = ctx.currentTime;
    void ctx.resume().catch(() => {});
  }

  function schedulePcmPlayback(opts: { dataBase64: string; mimeType: string }) {
    if (recordingRef.current) return;
    ensureOutput();
    const ctx = outputCtxRef.current;
    const gain = outputGainRef.current;
    if (!ctx || !gain) return;

    const rate = parsePcmRate(opts.mimeType);
    const bytes = base64ToBytes(opts.dataBase64);

    // Assume signed 16-bit little endian PCM.
    const sampleCount = Math.floor(bytes.length / 2);
    const floats = new Float32Array(sampleCount);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < sampleCount; i += 1) {
      const v = view.getInt16(i * 2, true);
      floats[i] = v / 0x8000;
    }

    const buffer = ctx.createBuffer(1, floats.length, rate);
    buffer.copyToChannel(floats, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    const startAt = Math.max(ctx.currentTime, playheadRef.current);
    source.start(startAt);
    playheadRef.current = startAt + buffer.duration;
    scheduledSourcesRef.current.push(source);

    setAgentSpeaking(true);
    if (agentSpeakingTimerRef.current) window.clearTimeout(agentSpeakingTimerRef.current);
    agentSpeakingTimerRef.current = window.setTimeout(() => {
      setAgentSpeaking(false);
      agentSpeakingTimerRef.current = null;
    }, Math.max(250, Math.round(buffer.duration * 1000) + 220));
  }

  async function ensureWsConnected() {
    const existing = wsRef.current;
    if (existing && existing.readyState === WebSocket.OPEN) return existing;
    if (existing && existing.readyState === WebSocket.CONNECTING) return existing;

    const ws = new WebSocket(wsUrlForSession(session.sessionId));
    wsRef.current = ws;
    setAudioWsState("reconnecting");

    ws.onopen = () => {
      setLastMessageType("ws.open");
      setLastError(null);
      setAudioWsState("connected");
      ws.send(JSON.stringify({ type: "control.start", mimeType: "audio/pcm;rate=16000" }));
    };

    ws.onmessage = (ev) => {
      const raw = String(ev.data);
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        parsed = null;
      }
      if (!parsed || typeof parsed !== "object") return;
      const msg = parsed as LiveWsMessage;
      if (typeof msg.type !== "string") return;

      setLastMessageType(msg.type);

      if (msg.type === "audio.chunk") {
        if (typeof msg.dataBase64 !== "string" || typeof msg.mimeType !== "string") return;
        schedulePcmPlayback({ dataBase64: msg.dataBase64, mimeType: msg.mimeType });
        return;
      }
      if (msg.type === "debug" || msg.type === "error") {
        if (msg.type === "error") {
          const m = (msg as { message?: unknown }).message;
          if (typeof m === "string") setLastError(m);
        }
        // Show in debug panel via lastMessageType.
        return;
      }
    };

    ws.onerror = () => {
      setLastMessageType("ws.error");
      setLastError("WebSocket error (check backend logs)");
      setAudioWsState("reconnecting");
    };

    ws.onclose = () => {
      setLastMessageType("ws.close");
      setAudioWsState("offline");
      wsRef.current = null;
    };

    return ws;
  }

  async function handleStartStop() {
    if (!recording) {
      if (agentSpeaking) {
        setInterrupting(true);
        stopOutputImmediately();
        setAgentSpeaking(false);
        window.setTimeout(() => setInterrupting(false), 900);
      }

      const ok = await ensureMicPermission();
      if (!ok) return;

      await ensureWsConnected();

      // Start capturing PCM audio and streaming to backend.
      const ctx = new AudioContext({ sampleRate: 16000 });
      inputCtxRef.current = ctx;
      await ctx.resume().catch(() => {});

      const src = ctx.createMediaStreamSource(streamRef.current!);
      const processor = ctx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const inData = e.inputBuffer.getChannelData(0);
        const resampled = resampleLinear(inData, ctx.sampleRate, 16000);
        const pcmBytes = floatTo16BitPCMBytes(resampled);
        const dataBase64 = bytesToBase64(pcmBytes);
        ws.send(
          JSON.stringify({
            type: "audio.chunk",
            mimeType: "audio/pcm;rate=16000",
            dataBase64,
          })
        );
      };

      src.connect(processor);
      // Keep the processor alive without echoing to speakers.
      const zero = ctx.createGain();
      zero.gain.value = 0;
      processor.connect(zero);
      zero.connect(ctx.destination);

      setRecording(true);
      recordingRef.current = true;
      return;
    }

    setRecording(false);
    recordingRef.current = false;

    // Stop audio input.
    try {
      processorRef.current?.disconnect();
    } catch {
      // ignore
    }
    processorRef.current = null;
    inputCtxRef.current?.close().catch(() => {});
    inputCtxRef.current = null;

    // Tell backend we're done.
    try {
      wsRef.current?.send(JSON.stringify({ type: "control.stop" }));
    } catch {
      // ignore
    }

    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }

  const tokenCountdown = formatTime(15 * 60 * 1000);

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
          <Button
            variant="ghost"
            aria-label={debugOpen ? "Hide debug" : "Show debug"}
            title={debugOpen ? "Hide debug" : "Show debug"}
            onClick={() => setDebugOpen((v) => !v)}
          >
            <Bug className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Divider className="my-4" />

      {lastError ? (
        <div className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color:color-mix(in_oklab,var(--bad)_10%,var(--card))] p-3 text-sm text-[color:var(--fg)]">
          {lastError}
        </div>
      ) : null}

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
                  <div className="text-[11px]">backend live</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                    Audio WebSocket: <span className="text-[color:var(--fg)]">{audioWsState}</span>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                    Last message: <span className="text-[color:var(--fg)]">{lastMessageType}</span>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] p-2">
                    Token expiry (approx): <span className="text-[color:var(--fg)]">{tokenCountdown}</span>
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
