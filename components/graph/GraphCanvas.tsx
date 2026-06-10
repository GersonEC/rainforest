"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Attendee } from "@/lib/types";
import { buildGraphData } from "@/lib/graph";
import type { ForceGraphProps } from "./ForceGraph";

// react-force-graph relies on browser-only APIs: load client-side only.
const ForceGraph = dynamic(() => import("./ForceGraph"), {
  ssr: false,
  loading: () => null,
});

export type GraphCanvasProps = {
  attendees: Attendee[];
  selectedId: string | null;
  newNodeIds: Set<string>;
  spotlightId?: string | null;
  interactive?: boolean;
  big?: boolean;
  onNodeClick?: (id: string) => void;
  onBackgroundClick?: () => void;
};

export default function GraphCanvas({
  attendees,
  selectedId,
  newNodeIds,
  spotlightId = null,
  interactive = true,
  big = false,
  onNodeClick,
  onBackgroundClick,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => buildGraphData(attendees), [attendees]);

  // Nodes that share a tag with the selected node (incl. itself) stay lit.
  const { highlightNodeIds, hasSelection } = useMemo(() => {
    if (!selectedId) return { highlightNodeIds: new Set<string>(), hasSelection: false };
    const selected = attendees.find((a) => a.id === selectedId);
    const set = new Set<string>();
    if (selected) {
      set.add(selected.id);
      const tags = new Set(selected.tags ?? []);
      for (const a of attendees) {
        if (a.id === selected.id) continue;
        if ((a.tags ?? []).some((t) => tags.has(t))) set.add(a.id);
      }
    }
    return { highlightNodeIds: set, hasSelection: true };
  }, [attendees, selectedId]);

  const graphProps: ForceGraphProps = {
    data,
    width: size.width,
    height: size.height,
    selectedId,
    highlightNodeIds,
    hasSelection,
    newNodeIds,
    spotlightId,
    interactive,
    big,
    onNodeClick,
    onBackgroundClick,
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      {size.width > 0 && size.height > 0 ? <ForceGraph {...graphProps} /> : null}
    </div>
  );
}
