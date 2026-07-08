"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WIcon, SpinPill, ConfettiBurst } from "@/components/ui/kit";

/* Brain Starter — a 30-second wake-up game.
   Tap the numbered bubbles in order, as calmly-fast as you can.
   Seed: once a week · Bloom: once a day. */

const BUBBLE_VARS = ["--wheel-1", "--wheel-5", "--wheel-6", "--wheel-3", "--wheel-4", "--wheel-7"];
const COUNT = 6;

// Deterministic-per-round scattered positions that never overlap too badly
function layout(seed: number) {
  const rnd = (n: number) => {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const cells = [0, 1, 2, 3, 4, 5].sort((a, b) => rnd(a + 10) - rnd(b + 10));
  return cells.map((cell, i) => ({
    n: i + 1,
    left: (cell % 2) * 44 + 8 + rnd(i) * 18,        // two columns with jitter (%)
    top: Math.floor(cell / 2) * 30 + 4 + rnd(i + 20) * 10, // three rows with jitter (%)
  }));
}

export function BrainStarter({ onClose, onFinished }: { onClose: () => void; onFinished: () => void }) {
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [next, setNext] = useState(1);
  const [seed, setSeed] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(0);
  const finishedRef = useRef(false);

  const bubbles = useMemo(() => layout(seed), [seed]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsedMs(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [phase]);

  function start() {
    setSeed((s) => s + 1);
    setNext(1);
    setElapsedMs(0);
    startRef.current = Date.now();
    setPhase("playing");
  }

  function tap(n: number) {
    if (n !== next) return;
    if (n === COUNT) {
      // elapsedMs is already ticking every 100ms — good enough for a warm-up
      setPhase("done");
      if (!finishedRef.current) { finishedRef.current = true; onFinished(); }
      return;
    }
    setNext(n + 1);
  }

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="wt-screen" style={{ position: "fixed", inset: 0, zIndex: 70, background: "var(--bg-screen)", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px 44px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Brain starter</span>
          <button onClick={onClose} aria-label="Close" className="wt-press" style={{ width: 36, height: 36, borderRadius: 999, border: 0, background: "var(--bg-sunk)", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WIcon name="x" size={16} />
          </button>
        </div>

        {phase === "intro" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 0 }}>
            <p style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 300, color: "var(--text-secondary)" }}>Ease into the day.</p>
            <p className="script" style={{ margin: "0 0 22px", fontFamily: "var(--font-display)", fontSize: 58, lineHeight: 0.9, color: "var(--text-primary)" }}>
              Wake up<span style={{ color: "var(--accent)" }}>.</span>
            </p>
            <p style={{ margin: "0 auto 30px", maxWidth: 280, fontSize: 15, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              Tap the bubbles from 1 to {COUNT}, in order. No rush — it&apos;s a warm-up, not a race.
            </p>
            <div><SpinPill onClick={start}>Begin</SpinPill></div>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 300, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                Find <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{next}</strong> · {seconds}s
              </span>
            </div>
            <div style={{ flex: 1, position: "relative", marginTop: 8 }}>
              {bubbles.map((b) => {
                const done = b.n < next;
                return (
                  <button key={`${seed}-${b.n}`} onClick={() => tap(b.n)} style={{
                    position: "absolute", left: `${b.left}%`, top: `${b.top}%`,
                    width: 86, height: 86, borderRadius: 999, border: "none",
                    cursor: done ? "default" : "pointer",
                    background: done ? "var(--bg-sunk)" : `var(${BUBBLE_VARS[b.n - 1]})`,
                    color: done ? "var(--text-muted)" : "var(--bg-card)",
                    fontSize: 30, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                    boxShadow: done ? "none" : "var(--shadow-card)",
                    transform: done ? "scale(0.82)" : "scale(1)",
                    transition: "transform 180ms var(--ease-out), background 180ms",
                  }}>
                    {done ? <WIcon name="check" size={22} stroke={2.4} style={{ margin: "0 auto" }} /> : b.n}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {phase === "done" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
            <p style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 300, color: "var(--text-secondary)" }}>All {COUNT}, in {seconds} seconds.</p>
            <p className="script" style={{ margin: "0 0 22px", fontFamily: "var(--font-display)", fontSize: 58, lineHeight: 0.9, color: "var(--accent)" }}>
              Brain awake.
            </p>
            <p style={{ margin: "0 auto 30px", maxWidth: 280, fontSize: 15, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              Nicely done. The wheel is ready when you are.
            </p>
            <div><SpinPill onClick={onClose}>Back to the wheel</SpinPill></div>
            <ConfettiBurst active />
          </div>
        )}
      </div>
    </div>
  );
}
