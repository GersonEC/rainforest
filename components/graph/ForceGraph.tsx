"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from "react-force-graph-2d";
import { Minus, Plus, Scan } from "lucide-react";
import type { GraphData, GraphNode } from "@/lib/graph";
import { roleColor } from "@/lib/config/tags";

export type ForceGraphProps = {
  data: GraphData;
  width: number;
  height: number;
  selectedId: string | null;
  highlightNodeIds: Set<string>;
  hasSelection: boolean;
  newNodeIds: Set<string>;
  spotlightId: string | null;
  interactive: boolean;
  big: boolean;
  showZoomControls?: boolean;
  onNodeClick?: (id: string) => void;
  onBackgroundClick?: () => void;
};

type FGNode = NodeObject & GraphNode;

const ENTRANCE_MS = 1800;

// Clamp the auto-fit so 1-2 people don't get blown up to fill the screen.
const FIT_MAX_ZOOM = 2.5;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 8;

export default function ForceGraph(props: ForceGraphProps) {
  const {
    data,
    width,
    height,
    selectedId,
    highlightNodeIds,
    hasSelection,
    newNodeIds,
    spotlightId,
    interactive,
    big,
    showZoomControls = false,
    onNodeClick,
    onBackgroundClick,
  } = props;

  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const images = useRef<Map<string, HTMLImageElement>>(new Map());
  const entranceAt = useRef<Map<string, number>>(new Map());
  // Once the viewer pans/zooms by hand we stop auto-fitting so we don't fight them.
  const userHasNavigated = useRef(false);
  // Becomes true after the first auto-fit settles. Until then we ignore zoom
  // events so the library's mount-time camera setup isn't mistaken for a gesture.
  const hasInitialized = useRef(false);
  // True while we drive the camera ourselves, so onZoom can tell our moves apart
  // from genuine user gestures.
  const programmaticZoom = useRef(false);

  const baseR = big ? 11 : 7;

  // Preload user-provided photos as <img> for canvas drawing.
  useEffect(() => {
    for (const node of data.nodes) {
      if (node.photo_url && !images.current.has(node.id)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = node.photo_url;
        images.current.set(node.id, img);
      }
    }
  }, [data.nodes]);

  // Record entrance timestamps for the pop + glow animation.
  useEffect(() => {
    const now = performance.now();
    for (const id of newNodeIds) {
      if (!entranceAt.current.has(id)) entranceAt.current.set(id, now);
    }
  }, [newNodeIds]);

  // Softer charge keeps a handful of disconnected nodes in a tight, centered
  // cluster instead of flinging them to the corners; gentle link distance.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(big ? -110 : -90);
    const link = fg.d3Force("link");
    link?.distance?.(big ? 70 : 55);
  }, [big, data]);

  // Frame the whole graph, then clamp the zoom so tiny graphs stay readable
  // rather than filling the viewport. Marked programmatic so onZoom ignores it.
  const fitView = useCallback(
    (ms = 400) => {
      const fg = fgRef.current;
      if (!fg || data.nodes.length === 0) return;
      programmaticZoom.current = true;
      fg.zoomToFit(ms, big ? 80 : 40);
      window.setTimeout(() => {
        const current = fgRef.current;
        if (current && current.zoom() > FIT_MAX_ZOOM) {
          current.zoom(FIT_MAX_ZOOM, 300);
        }
        window.setTimeout(() => {
          programmaticZoom.current = false;
          hasInitialized.current = true;
        }, 350);
      }, ms + 50);
    },
    [data.nodes.length, big],
  );

  const nodeCount = data.nodes.length;

  // Re-fit whenever people join/leave, unless the viewer has taken control.
  useEffect(() => {
    if (nodeCount === 0 || userHasNavigated.current) return;
    const t = setTimeout(() => fitView(500), 600);
    return () => clearTimeout(t);
  }, [nodeCount, fitView]);

  // Fit each time the simulation settles (covers the initial layout too).
  const handleEngineStop = useCallback(() => {
    if (nodeCount === 0 || userHasNavigated.current) return;
    fitView(400);
  }, [nodeCount, fitView]);

  // Any zoom we didn't trigger ourselves (after the first fit) means the viewer
  // is driving, so we hand them control and stop auto-fitting.
  const handleZoom = useCallback(() => {
    if (!hasInitialized.current) return;
    if (!programmaticZoom.current) userHasNavigated.current = true;
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fg.zoom() * factor));
    fg.zoom(next, 250);
  }, []);

  const resetView = useCallback(() => {
    userHasNavigated.current = false;
    fitView(500);
  }, [fitView]);

  const drawNode = useCallback(
    (nodeObj: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = nodeObj as FGNode;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const color = roleColor(node.role);

      const dimmed = hasSelection && !highlightNodeIds.has(node.id);
      const isSelected = selectedId === node.id;
      const isSpotlight = spotlightId === node.id;

      // Entrance pop + glow.
      let scale = 1;
      let entranceGlow = 0;
      const startedAt = entranceAt.current.get(node.id);
      if (startedAt != null) {
        const t = (performance.now() - startedAt) / ENTRANCE_MS;
        if (t < 1) {
          const ease = 1 - Math.pow(1 - t, 3);
          scale = 0.2 + 0.8 * ease;
          entranceGlow = 1 - t;
        } else {
          entranceAt.current.delete(node.id);
        }
      }

      const r = baseR * scale;
      ctx.save();
      ctx.globalAlpha = dimmed ? 0.12 : 1;

      // Glow halo (stronger on entrance / spotlight / selection).
      const haloBoost = Math.max(entranceGlow, isSpotlight ? 0.8 : 0, isSelected ? 0.5 : 0);
      if (!dimmed && haloBoost > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = (big ? 28 : 18) * (0.6 + haloBoost);
        ctx.beginPath();
        ctx.arc(x, y, r + (big ? 5 : 3) * haloBoost, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = (dimmed ? 0.12 : 1) * (0.25 + 0.4 * haloBoost);
        ctx.fill();
        ctx.globalAlpha = dimmed ? 0.12 : 1;
      } else if (!dimmed) {
        ctx.shadowColor = color;
        ctx.shadowBlur = big ? 14 : 9;
      }

      // Base disc.
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#0A1A13";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Photo clipped to circle, else initials.
      const img = node.photo_url ? images.current.get(node.id) : undefined;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 1, 0, 2 * Math.PI);
        ctx.clip();
        const d = (r - 1) * 2;
        ctx.drawImage(img, x - (r - 1), y - (r - 1), d, d);
        ctx.restore();
      } else {
        const initials = (node.name || "?")
          .split(/\s+/)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase() ?? "")
          .join("");
        ctx.fillStyle = color;
        ctx.font = `${Math.max(r, 6)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, x, y);
      }

      // Ring.
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.lineWidth = (isSelected || isSpotlight ? 2.2 : 1.2) / globalScale;
      ctx.strokeStyle = color;
      ctx.stroke();

      // Name label below.
      if (!dimmed && (globalScale > 1.1 || big || isSelected || isSpotlight)) {
        const fontSize = (big ? 5 : 3.5) + 1;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "rgba(236,248,239,0.92)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.name, x, y + r + 1.5);
      }

      ctx.restore();
    },
    [baseR, big, hasSelection, highlightNodeIds, selectedId, spotlightId],
  );

  const paintPointerArea = useCallback(
    (nodeObj: NodeObject, paintColor: string, ctx: CanvasRenderingContext2D) => {
      const node = nodeObj as FGNode;
      ctx.fillStyle = paintColor;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, baseR + 2, 0, 2 * Math.PI);
      ctx.fill();
    },
    [baseR],
  );

  const linkColor = useCallback(
    (linkObj: LinkObject) => {
      const link = linkObj as LinkObject & { source: FGNode; target: FGNode };
      const s = typeof link.source === "object" ? link.source.id : link.source;
      const t = typeof link.target === "object" ? link.target.id : link.target;
      if (hasSelection) {
        const lit = highlightNodeIds.has(s as string) && highlightNodeIds.has(t as string);
        return lit ? "rgba(124,255,138,0.58)" : "rgba(124,160,130,0.06)";
      }
      return "rgba(124,255,138,0.18)";
    },
    [hasSelection, highlightNodeIds],
  );

  const linkWidth = useCallback(
    (linkObj: LinkObject) => {
      const link = linkObj as LinkObject & { weight?: number };
      return Math.min(2.4, 0.5 + (link.weight ?? 1) * 0.5);
    },
    [],
  );

  const handleNodeClick = useCallback(
    (node: NodeObject) => onNodeClick?.((node as FGNode).id),
    [onNodeClick],
  );

  // Stable cooldown so big projector layouts keep moving slightly.
  const cooldownTicks = useMemo(() => (big ? 200 : 120), [big]);

  const btnClass = big
    ? "flex size-12 items-center justify-center rounded-xl border border-[#ABD3B6]/15 bg-[#0F241A]/80 text-[#ECF8EF] backdrop-blur-md transition-colors hover:bg-[#143222] active:scale-95"
    : "flex size-10 items-center justify-center rounded-xl border border-[#ABD3B6]/15 bg-[#0F241A]/80 text-[#ECF8EF] backdrop-blur-md transition-colors hover:bg-[#143222] active:scale-95";
  const iconSize = big ? "size-5" : "size-4";

  return (
    <div className="relative" style={{ width, height }}>
      <ForceGraph2D
        ref={fgRef as never}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={baseR}
        nodeId="id"
        nodeCanvasObjectMode={() => "replace"}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={paintPointerArea}
        linkColor={linkColor}
        linkWidth={linkWidth}
        cooldownTicks={cooldownTicks}
        onEngineStop={handleEngineStop}
        onZoom={handleZoom}
        enableZoomInteraction
        enablePanInteraction
        enableNodeDrag={interactive}
        enablePointerInteraction={interactive}
        onNodeClick={interactive ? handleNodeClick : undefined}
        onBackgroundClick={interactive ? onBackgroundClick : undefined}
        minZoom={ZOOM_MIN}
        maxZoom={ZOOM_MAX}
      />

      {showZoomControls && (
        <div
          className={`absolute z-10 flex flex-col gap-2 ${big ? "left-6 bottom-6" : "right-3 bottom-3"}`}
        >
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.4)}
            className={btnClass}
          >
            <Plus className={iconSize} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / 1.4)}
            className={btnClass}
          >
            <Minus className={iconSize} />
          </button>
          <button
            type="button"
            aria-label="Reset view"
            onClick={resetView}
            className={btnClass}
          >
            <Scan className={iconSize} />
          </button>
        </div>
      )}
    </div>
  );
}
