import { useRef, useState } from 'react';
import { Animated, PanResponder, type View } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Drag reorder for a vertical list of rows, driven by PanResponder on a
 * per-row grip handle. The dragged row follows the finger (`dragY`) while
 * sibling rows animate out of the way (`shiftFor`), and the reorder is
 * committed once, on release.
 *
 * Row screen positions are measured fresh at drag-start (not tracked
 * continuously), so this doesn't support auto-scroll while dragging near the
 * edges of a long list — acceptable for the short task/habit lists this is
 * used with.
 */
export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const rowRefs = useRef<Map<number, View | null>>(new Map());
  const rowMidpoints = useRef<number[]>([]);
  const rowSlots = useRef<number[]>([]); // distance each row travels when it swaps past its neighbour
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Finger-following offset for the dragged row (JS-set, native-rendered).
  const dragY = useRef(new Animated.Value(0)).current;
  // Per-row slide offsets for the rows making room.
  const shifts = useRef<Map<number, Animated.Value>>(new Map());

  function shiftFor(index: number): Animated.Value {
    let v = shifts.current.get(index);
    if (!v) {
      v = new Animated.Value(0);
      shifts.current.set(index, v);
    }
    return v;
  }

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
          new Promise<{ mid: number; top: number; height: number }>((resolve) => {
            if (!ref) { resolve({ mid: 0, top: 0, height: 0 }); return; }
            ref.measure((_x, _y, _w, height, _pageX, pageY) =>
              resolve({ mid: pageY + height / 2, top: pageY, height }));
          })
      )
    ).then((rows) => {
      rowMidpoints.current = rows.map((r) => r.mid);
      // Slot size for row i = gap between consecutive row tops (covers the
      // row height plus the list gap). Last row reuses its predecessor's.
      rowSlots.current = rows.map((r, i) =>
        i < rows.length - 1 ? rows[i + 1].top - r.top : (i > 0 ? r.top - rows[i - 1].top : r.height));
    });
  }

  /** How far row `i` must slide while `from` is hovering over `to`. */
  function targetShift(i: number, from: number, to: number): number {
    const slot = rowSlots.current[from] ?? 0;
    if (from < to && i > from && i <= to) return -slot;
    if (to < from && i >= to && i < from) return slot;
    return 0;
  }

  function animateShifts(from: number, to: number) {
    const n = itemsRef.current.length;
    for (let i = 0; i < n; i++) {
      if (i === from) continue;
      Animated.timing(shiftFor(i), {
        toValue: targetShift(i, from, to),
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }

  function resetOffsets() {
    dragY.setValue(0);
    shifts.current.forEach((v) => v.setValue(0));
  }

  function endDrag(commit: boolean) {
    const from = dragIndexRef.current;
    const to = overIndexRef.current;
    if (commit && from !== null && to !== null && to !== from) {
      const next = [...itemsRef.current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    dragIndexRef.current = null;
    overIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
    // The list re-renders in its new order, so all offsets go back to zero.
    resetOffsets();
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
        resetOffsets();
        void measureAll();
        Haptics.selectionAsync().catch(() => {});
      },
      onPanResponderMove: (_evt, gesture) => {
        dragY.setValue(gesture.dy);
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
          const from = dragIndexRef.current;
          if (from !== null) animateShifts(from, next);
        }
      },
      onPanResponderRelease: () => endDrag(true),
      onPanResponderTerminate: () => endDrag(false),
    });
  }

  return { setRowRef, makePanResponder, dragIndex, overIndex, dragY, shiftFor };
}
