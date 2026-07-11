import { useRef, useState } from 'react';
import { PanResponder, type View } from 'react-native';

/**
 * Long-press-free drag reorder for a vertical list of rows, driven by
 * PanResponder on a per-row grip handle. Row screen positions are measured
 * fresh at drag-start (not tracked continuously), so this doesn't support
 * auto-scroll while dragging near the edges of a long list — acceptable for
 * the short task/habit lists this is used with. The dragged row is reported
 * via `dragIndex` (consumer dims/lifts it) and the row currently under the
 * touch via `overIndex` (consumer draws an insertion indicator). The actual
 * reorder is committed once, on release.
 */
export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const rowRefs = useRef<Map<number, View | null>>(new Map());
  const rowMidpoints = useRef<number[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function setRowRef(index: number, ref: View | null) {
    rowRefs.current.set(index, ref);
  }

  function measureAll(): Promise<void> {
    // Refs are keyed by index and linger after rows unmount (deletes shrink
    // the list), so clamp to the live item count before measuring.
    const entries = Array.from(rowRefs.current.entries())
      .filter(([i]) => i < itemsRef.current.length)
      .sort((a, b) => a[0] - b[0]);
    return Promise.all(
      entries.map(
        ([, ref]) =>
          new Promise<number>((resolve) => {
            if (!ref) { resolve(0); return; }
            ref.measure((_x, _y, _w, height, _pageX, pageY) => resolve(pageY + height / 2));
          })
      )
    ).then((mids) => { rowMidpoints.current = mids; });
  }

  function endDrag(commit: boolean) {
    const from = dragIndexRef.current;
    const to = overIndexRef.current;
    if (commit && from !== null && to !== null && to !== from) {
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

  function makePanResponder(index: number) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Without this the enclosing ScrollView steals the gesture as soon as
      // the finger moves vertically, ending the drag after a few pixels.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragIndexRef.current = index;
        overIndexRef.current = index;
        setDragIndex(index);
        setOverIndex(index);
        void measureAll();
      },
      onPanResponderMove: (_evt, gesture) => {
        const mids = rowMidpoints.current;
        if (!mids.length) return;
        let next = dragIndexRef.current ?? 0;
        for (let i = 0; i < mids.length; i++) {
          next = i;
          if (gesture.moveY < mids[i]) break;
        }
        if (next !== overIndexRef.current) {
          overIndexRef.current = next;
          setOverIndex(next);
        }
      },
      onPanResponderRelease: () => endDrag(true),
      onPanResponderTerminate: () => endDrag(false),
    });
  }

  return { setRowRef, makePanResponder, dragIndex, overIndex };
}
