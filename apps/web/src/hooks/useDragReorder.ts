"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Long-press-free drag reorder for a vertical list, driven by Pointer Events
 * so it works with touch and mouse alike. The dragged row is visually lifted
 * (consumer applies opacity/scale via `dragIndex`); other rows aren't
 * live-shuffled — instead the row currently under the pointer is reported as
 * `overIndex` so the consumer can draw an insertion indicator. The actual
 * array reorder is committed once, on release.
 */
export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);

  function startDrag(index: number) {
    dragIndexRef.current = index;
    overIndexRef.current = index;
    setDragIndex(index);
    setOverIndex(index);
  }

  useEffect(() => {
    if (dragIndex === null) return;

    function handleMove(e: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;
      const rows = Array.from(container.children) as HTMLElement[];
      let next = dragIndexRef.current ?? 0;
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        next = i;
        if (e.clientY < rect.top + rect.height / 2) break;
      }
      if (next !== overIndexRef.current) {
        overIndexRef.current = next;
        setOverIndex(next);
      }
    }

    function handleUp() {
      const from = dragIndexRef.current;
      const to = overIndexRef.current;
      if (from !== null && to !== null && to !== from) {
        const next = [...itemsRef.current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
      }
      dragIndexRef.current = null;
      overIndexRef.current = null;
      setDragIndex(null);
      setOverIndex(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIndex]);

  return { containerRef, dragIndex, overIndex, startDrag };
}
