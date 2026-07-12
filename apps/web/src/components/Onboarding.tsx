"use client";

import { useState } from "react";
import { SpinPill, WheelMark, TaskWheel, Ring } from "@/components/ui/kit";

/* First-run walkthrough — a short sequence of full-screen pages that explain
   the idea (the wheel decides, out of order is fine, baby steps count), then
   hand off to an empty app ready for the user's own tasks. */

interface Page {
  lead: string;
  script: string;
  body: string;
  visual: "mark" | "wheel" | "ring" | "dots";
  starters?: string[];
}

const PAGES: Page[] = [
  {
    lead: "Hello.",
    script: "Welcome",
    body: "WheelToDo is a to-do list with one twist: when you can't choose what to do next, you don't have to.",
    visual: "mark",
  },
  {
    lead: "Your tasks live on a wheel.",
    script: "Spin",
    body: "Spin it and do whatever it lands on. Out of order is fine — that's the point. When every task feels equally heavy, letting the wheel pick beats not starting at all.",
    visual: "wheel",
  },
  {
    lead: "One task. One timer.",
    script: "Focus",
    body: "Every spin flows into a focus block, with everything else tucked away. Baby steps count — a short session still moves you forward.",
    visual: "ring",
  },
  {
    lead: "Small and daily.",
    script: "Show up",
    body: "Track a few tiny habits alongside your tasks. Rest counts too — a quick walk or a coffee keeps your streak alive on the heavy days.",
    visual: "dots",
  },
  {
    lead: "The wheel starts empty.",
    script: "Your turn",
    body: "Add whatever's on your mind — one task is enough to spin. The wheel takes it from there.",
    visual: "mark",
    starters: ["Buy groceries", "Text a friend", "10-min walk"],
  },
];

const DEMO_SLICES = [1, 2, 3, 4, 5].map((n) => ({ id: `demo_${n}`, color: `var(--wheel-${n})` }));

function PageVisual({ kind }: { kind: Page["visual"] }) {
  switch (kind) {
    case "wheel":
      return <TaskWheel size={170} slices={DEMO_SLICES} idleSpin />;
    case "ring":
      return (
        <Ring progress={0.35} size={150} stroke={11} animated>
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 30, fontWeight: 300, color: "var(--text-primary)" }}>16:12</span>
        </Ring>
      );
    case "dots":
      return (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[1, 1, 1, 0, 1, 0, 0].map((f, i) => (
            <span key={i} style={{
              width: 22, height: 22, borderRadius: 999,
              background: f ? `var(--wheel-${(i % 6) + 1})` : "transparent",
              boxShadow: f ? "none" : "inset 0 0 0 2px var(--border-hairline)",
              animation: "wt-pop-in 380ms var(--ease-out) both",
              animationDelay: `${i * 80}ms`,
            }} />
          ))}
        </div>
      );
    default:
      return <WheelMark size={86} spin hubColor="var(--bg-card)" />;
  }
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const p = PAGES[page];
  const last = page === PAGES.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--bg-screen)", overflowY: "auto" }}>
      <div className="wt-screen" style={{ minHeight: "100%", maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", padding: "24px 28px 44px" }}>

        {/* Skip */}
        <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 36 }}>
          {!last && (
            <button onClick={onDone} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 300, color: "var(--text-muted)", padding: 8 }}>
              Skip
            </button>
          )}
        </div>

        {/* Page content — keyed so each page animates in */}
        <div key={page} className="wt-screen" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 0 }}>
          <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 26 }}>
            <PageVisual kind={p.visual} />
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 300, color: "var(--text-secondary)" }}>{p.lead}</p>
          <p className="script" style={{ marginBottom: 18, fontFamily: "var(--font-display)", fontSize: 62, lineHeight: 0.95, color: "var(--text-primary)" }}>
            {p.script}<span style={{ color: "var(--accent)" }}>.</span>
          </p>
          <p style={{ margin: 0, maxWidth: 330, fontSize: 15, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {p.body}
          </p>
          {p.starters && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 18, maxWidth: 330 }}>
              {p.starters.map((s, i) => (
                <span key={s} style={{
                  fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                  background: "var(--bg-card)", border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--r-pill)", padding: "7px 14px",
                  animation: "wt-pop-in 380ms var(--ease-out) both", animationDelay: `${i * 90}ms`,
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dots + CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "center", paddingTop: 26 }}>
          <div style={{ display: "flex", gap: 7 }}>
            {PAGES.map((_, i) => (
              <button key={i} onClick={() => setPage(i)} aria-label={`Page ${i + 1}`} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, border: "none", background: "none", padding: 0, cursor: "pointer",
              }}>
                <span style={{
                  width: i === page ? 22 : 8, height: 8, borderRadius: 999,
                  background: i === page ? "var(--accent)" : "var(--bg-sunk)",
                  transition: "all 220ms var(--ease-out)",
                }} />
              </button>
            ))}
          </div>
          <SpinPill full onClick={() => (last ? onDone() : setPage(page + 1))}>
            {last ? "Add my first task" : "Next"}
          </SpinPill>
        </div>
      </div>
    </div>
  );
}
