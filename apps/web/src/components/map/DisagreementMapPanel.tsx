"use client";

import { useMemo } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Layers3, ListChecks } from "lucide-react";

import type { Confidence, SessionArtifacts } from "@/lib/contracts";
import { cn } from "@/lib/cn";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Divider } from "@/components/ui/Divider";

type ClusterNodeData = {
  title: string;
  claimCount: number;
  missingCount: number;
};

type ClaimNodeData = {
  text: string;
  disagreementType: string;
  confidence: Confidence;
};

function confidenceDotClass(confidence: Confidence) {
  if (confidence === "High") return "bg-[color:var(--good)]";
  if (confidence === "Medium") return "bg-[color:var(--warn)]";
  return "bg-[color:var(--bad)]";
}

function ClusterNode({ data }: NodeProps<Node<ClusterNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-none !bg-[color:var(--border-strong)]" />
      <div className="min-w-[220px] rounded-[0.65rem] border border-[color:color-mix(in_oklab,var(--accent)_48%,var(--border))] bg-[color:color-mix(in_oklab,var(--surface-1)_96%,transparent)] px-3 py-2 shadow-[var(--shadow-ambient)]">
        <div className="text-[10px] uppercase tracking-[0.11em] text-[color:var(--muted-fg)]">Cluster</div>
        <div className="mt-1 text-sm font-semibold leading-snug text-[color:var(--fg)]">{data.title}</div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[color:var(--muted-fg)]">
          <span>{data.claimCount} claims</span>
          <span>-</span>
          <span>{data.missingCount} missing points</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-none !bg-[color:var(--accent)]" />
    </>
  );
}

function ClaimNode({ data }: NodeProps<Node<ClaimNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-none !bg-[color:var(--border-strong)]" />
      <div className="w-[210px] rounded-[0.58rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_94%,transparent)] px-3 py-2">
        <div className="line-clamp-2 text-xs leading-snug text-[color:var(--fg)]">{data.text}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", confidenceDotClass(data.confidence))} />
          <div className="text-[10px] text-[color:var(--muted-fg)]">{data.disagreementType}</div>
        </div>
      </div>
    </>
  );
}

const nodeTypes = {
  clusterNode: ClusterNode,
  claimNode: ClaimNode,
};

export function DisagreementMapPanel({ session }: { session: SessionArtifacts }) {
  const clusters = session.clusters;

  const cardsById = useMemo(() => {
    const map = new Map(session.evidenceCards.map((c) => [c.id, c] as const));
    return map;
  }, [session.evidenceCards]);

  const graph = useMemo(() => {
    const nodes: Array<Node> = [];
    const edges: Array<Edge> = [];

    clusters.forEach((cluster, idx) => {
      const cx = (idx % 3) * 420;
      const cy = Math.floor(idx / 3) * 360;
      const clusterNodeId = `cluster-${cluster.id}`;

      nodes.push({
        id: clusterNodeId,
        type: "clusterNode",
        position: { x: cx, y: cy },
        data: {
          title: cluster.title,
          claimCount: cluster.claimIds.length,
          missingCount: cluster.whatsMissing.length,
        } satisfies ClusterNodeData,
      });

      if (idx > 0) {
        const prev = clusters[idx - 1]!;
        edges.push({
          id: `cluster-${prev.id}->cluster-${cluster.id}`,
          source: `cluster-${prev.id}`,
          target: clusterNodeId,
          type: "smoothstep",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--border-strong)" },
          style: {
            stroke: "var(--border-strong)",
            strokeDasharray: "4 4",
            opacity: 0.6,
          },
        });
      }

      cluster.claimIds.slice(0, 4).forEach((claimId, claimIdx) => {
        const card = cardsById.get(claimId);
        if (!card) return;

        const claimNodeId = `claim-${cluster.id}-${claimId}`;
        const localRow = Math.floor(claimIdx / 2);
        const localCol = claimIdx % 2;

        nodes.push({
          id: claimNodeId,
          type: "claimNode",
          position: {
            x: cx + (localCol === 0 ? -120 : 170),
            y: cy + 130 + localRow * 110,
          },
          data: {
            text: card.claimText,
            disagreementType: card.disagreementType,
            confidence: card.confidence,
          } satisfies ClaimNodeData,
        });

        edges.push({
          id: `${clusterNodeId}->${claimNodeId}`,
          source: clusterNodeId,
          target: claimNodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
          style: {
            stroke: "var(--accent)",
            opacity: 0.65,
          },
        });
      });
    });

    return { nodes, edges };
  }, [cardsById, clusters]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">Disagreement Map</div>
          <div className="mt-1 text-xs text-[color:var(--muted-fg)]">
            Interactive cluster graph for frames and claims.
          </div>
        </div>
        <Badge tone="accent">
          <Layers3 className="h-3.5 w-3.5" />
          {clusters.length}
        </Badge>
      </div>

      {clusters.length === 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_86%,transparent)] p-3 text-sm text-[color:var(--muted-fg)]">
          Waiting for clusters...
        </div>
      ) : null}

      {clusters.length > 0 ? (
        <div className="overflow-hidden rounded-[0.8rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_92%,transparent)]">
          <div className="h-[420px] w-full">
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              nodesConnectable={false}
              elementsSelectable={false}
              minZoom={0.4}
              maxZoom={1.6}
            >
              <MiniMap
                pannable
                zoomable
                style={{
                  background: "color-mix(in oklab, var(--surface-2) 90%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--border-soft) 82%, transparent)",
                }}
              />
              <Controls showInteractive={false} position="bottom-right" />
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(130, 146, 180, 0.28)" />
            </ReactFlow>
          </div>
        </div>
      ) : null}

      {clusters.length > 0 ? (
        <div className="text-[11px] text-[color:var(--muted-fg)]">
          Tip: scroll/drag to inspect graph structure, then open a cluster below for full detail.
        </div>
      ) : null}

      {clusters.map((c) => (
        <Dialog key={c.id}>
          <div className="rounded-[0.65rem] border border-[color:var(--border-soft)] bg-[color:color-mix(in_oklab,var(--surface-3)_90%,transparent)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[color:var(--fg)]">{c.title}</div>
                <div className="mt-1 text-xs text-[color:var(--muted-fg)]">{c.claimIds.length} claims</div>
              </div>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  View cluster
                </Button>
              </DialogTrigger>
            </div>
          </div>

          <DialogContent>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold tracking-[-0.02em]">{c.title}</div>
                <div className="mt-1 text-xs text-[color:var(--muted-fg)]">Cluster detail</div>
              </div>
              <Badge tone="accent">
                <ListChecks className="h-3.5 w-3.5" />
                {c.claimIds.length}
              </Badge>
            </div>
            <Divider className="my-3" />
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-medium text-[color:var(--muted-fg)]">Claims in cluster</div>
                <div className="mt-2 space-y-2">
                  {c.claimIds.map((id) => {
                    const card = cardsById.get(id);
                    return (
                      <div
                        key={id}
                        className={cn(
                          "rounded-[var(--radius-sm)] border p-3",
                          "border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)]"
                        )}
                      >
                        <div className="text-sm font-semibold text-[color:var(--fg)]">{card?.claimText ?? id}</div>
                        {card ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge tone="accent">{card.disagreementType}</Badge>
                            <Badge tone={card.confidence === "High" ? "good" : card.confidence === "Medium" ? "warn" : "bad"}>
                              {card.confidence}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[color:var(--muted-fg)]">Sources used</div>
                  <div className="mt-2 space-y-2">
                    {c.sources.map((s) => (
                      <div
                        key={s.domain}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2"
                      >
                        <div className="text-sm text-[color:var(--fg)]">{s.domain}</div>
                        <div className="text-xs text-[color:var(--muted-fg)]">{s.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[color:var(--muted-fg)]">What&apos;s missing</div>
                  <div className="mt-2 space-y-2">
                    {c.whatsMissing.map((m, idx) => (
                      <div
                        key={idx}
                        className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] px-3 py-2 text-xs text-[color:var(--fg)]"
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
