"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";

/* ── Icons (Lucide-style, stroked, currentColor) ─────────────────────────────
   Ported from the design kit (wheel/kit.jsx). */

const ICON_NODES: Record<string, ReactNode> = {
  plus:    <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  check:   <path d="m4 12 5 5L20 6" />,
  flame:   <path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-5 1 2 2 2 3-4z" />,
  pause:   <><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" /></>,
  play:    <path d="M8 5l12 7-12 7z" fill="currentColor" stroke="none" />,
  x:       <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  arrowUR: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  arrowR:  <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  arrowL:  <><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>,
  grip:    <><circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" /></>,
  focus:   <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  wheelTab:<><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /><path d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4" /><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" /></>,
  grid:    <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  user:    <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></>,
  sparkle: <><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /><path d="m6.5 6.5 2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" /></>,
  chevronR: <path d="m9 6 6 6-6 6" />,
  chevronL: <path d="m15 18-6-6 6-6" />,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  award:   <><circle cx="12" cy="9" r="6" /><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5" /></>,
  mail:    <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 7L22 7" /></>,
  lock:    <><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  clock:   <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  restart: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
  bell:    <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  logout:  <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  settings:<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  trash:   <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  mic:     <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4" /></>,
  wand:    <><path d="M12 2a4 4 0 0 1 4 4c0 .9-.3 1.7-.8 2.3L4 20h8m4-8 4 8" /><circle cx="12" cy="12" r="1" /></>,
};

export type IconName = keyof typeof ICON_NODES;

export function WIcon({ name, size = 22, stroke = 2, color = "currentColor", style }: {
  name: string; size?: number; stroke?: number; color?: string; style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0, ...style }}>
      {ICON_NODES[name] ?? ICON_NODES.wheelTab}
    </svg>
  );
}

/* ── Task-category icon paths (kept as raw path arrays so they can render
     inside SVG wheel wedges too) ─────────────────────────────────────────── */

export const TASK_ICON_PATHS: Record<string, string[]> = {
  mind:    ["M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.1 1.5 3.5.7.8 1.3 1.5 1.5 2.5", "M9 18h6", "M10 22h4"],
  work:    ["M2 3h20v14H2z", "M8 21h8M12 17v4"],
  home:    ["m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  care:    ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"],
  move:    ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"],
  social:  ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  create:  ["m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z", "M5 3v4M19 17v4M3 5h4M17 19h4"],
  errands: ["M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
};

export const TASK_CATEGORIES: { id: string; label: string }[] = [
  { id: "mind", label: "Mind" },
  { id: "work", label: "Work" },
  { id: "home", label: "Home" },
  { id: "care", label: "Care" },
  { id: "move", label: "Move" },
  { id: "social", label: "Social" },
  { id: "create", label: "Create" },
  { id: "errands", label: "Errands" },
];

/* ── Headline: quiet lead-in + Ephesis script payoff with accent period ───── */

export function Headline({ lead, script, size = 58, align = "left" }: {
  lead: string; script: string; size?: number; align?: "left" | "center";
}) {
  return (
    <div style={{ textAlign: align }}>
      <p style={{ margin: 0, fontSize: 19, fontWeight: 300, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>{lead}</p>
      <p className="script" style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: size, lineHeight: 0.9, color: "var(--text-primary)" }}>
        {script}<span style={{ color: "var(--accent)" }}>.</span>
      </p>
    </div>
  );
}

/* ── Primary pill button ─────────────────────────────────────────────────── */

export function SpinPill({ children, onClick, disabled = false, full = false, style, type }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; full?: boolean;
  style?: CSSProperties; type?: "button" | "submit";
}) {
  return (
    <button type={type ?? "button"} onClick={disabled ? undefined : onClick} disabled={disabled} className="wt-press"
      style={{
        border: 0, height: 56, borderRadius: "var(--r-pill)", padding: "0 40px", width: full ? "100%" : undefined,
        background: "var(--action-primary)", color: "var(--action-on-primary)", fontFamily: "var(--font-sans)",
        fontSize: 17, fontWeight: 600, letterSpacing: "0.01em", cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
        ...style,
      }}>
      {children}
    </button>
  );
}

/* ── Bottom sheet (mobile) / centered modal (desktop) ────────────────────── */

export function Sheet({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40 }}>
      <div className="wt-scrim" onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--bg-overlay)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: "none" }}>
        <div className="wt-sheet" onClick={(e) => e.stopPropagation()} style={{
          pointerEvents: "auto", width: "100%", maxWidth: 520, maxHeight: "88dvh", overflowY: "auto",
          background: "var(--bg-sheet)", borderRadius: "var(--r-sheet) var(--r-sheet) 0 0",
          padding: "12px 22px 34px", boxShadow: "var(--shadow-pop)",
        }}>
          <div style={{ width: 42, height: 5, borderRadius: 999, background: "var(--border-hairline)", margin: "0 auto 16px" }} />
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Toggle switch ───────────────────────────────────────────────────────── */

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} style={{
      width: 50, height: 30, borderRadius: 15, border: "none", flexShrink: 0,
      background: value ? "var(--c-lavender)" : "var(--bg-sunk)",
      boxShadow: value ? "none" : "inset 0 0 0 1px var(--border-hairline)",
      cursor: "pointer", padding: 3, display: "flex", alignItems: "center",
      justifyContent: value ? "flex-end" : "flex-start", transition: "background 220ms",
    }}>
      <span style={{ width: 24, height: 24, borderRadius: 12, background: "var(--bg-card)", boxShadow: "0 1px 3px var(--bg-overlay)", transition: "all 220ms" }} />
    </button>
  );
}

/* ── Section micro-label ─────────────────────────────────────────────────── */

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", ...style }}>
      {children}
    </p>
  );
}

/* ── Confetti field: static scattered pieces (design language) ───────────── */

const CONFETTI_VARS = ["--wheel-1", "--wheel-2", "--wheel-3", "--wheel-4", "--wheel-5", "--wheel-6", "--wheel-7", "--wheel-8"];

export function ConfettiField({ count = 24, top = 60 }: { count?: number; top?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: 4 + (i * 37) % 92,
    top: top + (i * 53) % 290,
    v: CONFETTI_VARS[i % CONFETTI_VARS.length],
    rot: (i * 47) % 360,
    w: 6 + (i % 3) * 2,
    h: 10 + (i % 2) * 4,
  })), [count, top]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: "absolute", left: `${p.left}%`, top: p.top, width: p.w, height: p.h,
          background: `var(${p.v})`, borderRadius: 2, transform: `rotate(${p.rot}deg)`, opacity: 0.88,
        }} />
      ))}
    </div>
  );
}

/* ── Confetti burst (radial, animated) ───────────────────────────────────── */

export function ConfettiBurst({ active }: { active: boolean }) {
  const pieces = useMemo(() => {
    // Deterministic pseudo-random hash so render stays pure
    const rnd = (n: number) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 56 }, (_, i) => {
      const ang = (i / 56) * Math.PI * 2 + (rnd(i * 7 + 1) - 0.5) * 0.5;
      const spd = 65 + rnd(i * 7 + 2) * 95;
      return {
        id: i, v: CONFETTI_VARS[i % 8],
        cx: `${Math.cos(ang) * spd}px`, cy: `${Math.sin(ang) * spd - 28}px`,
        cr: `${(rnd(i * 7 + 3) > 0.5 ? 1 : -1) * (80 + rnd(i * 7 + 4) * 280)}deg`,
        w: 6 + rnd(i * 7 + 5) * 7, h: 3 + rnd(i * 7 + 6) * 4,
        delay: `${rnd(i * 7 + 7) * 220}ms`, dur: `${950 + rnd(i * 7) * 650}ms`,
      };
    });
  }, []);
  if (!active) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 100 }}>
      {pieces.map((p) => (
        <div key={p.id} style={{
          position: "absolute", top: "42%", left: "50%",
          width: p.w, height: p.h, background: `var(${p.v})`, borderRadius: 2,
          "--cx": p.cx, "--cy": p.cy, "--cr": p.cr,
          animation: `wt-confetti-fly ${p.dur} ${p.delay} ease-out forwards`,
        } as CSSProperties} />
      ))}
    </div>
  );
}

/* ── Progress ring ───────────────────────────────────────────────────────── */

export function Ring({ progress, size = 64, stroke = 7, color = "var(--accent)", children }: {
  progress: number; size?: number; stroke?: number; color?: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunk)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: "stroke-dashoffset 400ms var(--ease-out)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

/* ── The wheel ───────────────────────────────────────────────────────────── */

export interface WheelSlice {
  id: string;
  color: string;
  label?: string;
  iconPaths?: string[];
}

export function TaskWheel({ slices, size = 300, rotation = 0, spinning = false, hub, onClick }: {
  slices: WheelSlice[]; size?: number; rotation?: number; spinning?: boolean;
  hub?: ReactNode; onClick?: () => void;   // tapping anywhere on the wheel spins it
}) {
  const r = size / 2, cx = r, cy = r;
  const n = Math.max(1, slices.length);
  const slice = (2 * Math.PI) / n;
  const hubR = Math.max(size * 0.13, 30);
  const iconSz = size * 0.1;

  // Tick feedback: each time a slice boundary passes the pointer, kick the
  // pointer back briefly. Crossings are dense early in the spin (pointer
  // stays deflected) and sparse as it decelerates (distinct ticks). Animated
  // directly on the DOM node — at ~dozens of crossings per spin, re-rendering
  // per tick would be wasteful.
  const sliceDeg = 360 / n;
  const tickIndex = Math.floor((((rotation % 360) + 360) % 360) / sliceDeg);
  const prevTickIndex = useRef(tickIndex);
  const pointerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tickIndex === prevTickIndex.current) return;
    prevTickIndex.current = tickIndex;
    const el = pointerRef.current;
    if (!el) return;
    el.style.transition = "transform 40ms ease-out";
    el.style.transform = "rotate(-13deg)";
    const id = setTimeout(() => {
      el.style.transition = "transform 140ms var(--ease-out)";
      el.style.transform = "rotate(0deg)";
    }, 70);
    return () => clearTimeout(id);
  }, [tickIndex]);

  const wedges = slices.map((t, i) => {
    const a0 = -Math.PI / 2 + i * slice, a1 = a0 + slice;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = slice > Math.PI ? 1 : 0;
    const mid = a0 + slice / 2;
    const lr = r * 0.66;
    return {
      s: t,
      d: n === 1
        ? `M ${cx} ${cy - r + 1} A ${r - 1} ${r - 1} 0 1 1 ${cx - 0.01} ${cy - r + 1} Z`
        : `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`,
      lx: cx + lr * Math.cos(mid), ly: cy + lr * Math.sin(mid),
    };
  });

  return (
    <div
      onClick={onClick && !spinning ? onClick : undefined}
      style={{
        position: "relative", width: size, height: size + 14, display: "flex", alignItems: "flex-start", justifyContent: "center",
        cursor: onClick && !spinning ? "pointer" : undefined,
      }}
    >
      {/* pointer */}
      <div ref={pointerRef} style={{
        position: "absolute", top: 0, zIndex: 4, filter: "drop-shadow(0 2px 2px var(--bg-overlay))",
        transformOrigin: "50% 15%",
      }}>
        <svg width="26" height="20" viewBox="0 0 26 20"><path d="M13 19 L24 2 H2 Z" fill="var(--ink)" /></svg>
      </div>
      <svg width={size} height={size} style={{
        marginTop: 10,
        transform: `rotate(${rotation}deg)`,
        transition: spinning ? "transform 3600ms var(--ease-spin)" : "none",
        filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.12))",
      }}>
        <circle cx={cx} cy={cy} r={r - 1} fill="var(--bg-card)" />
        {wedges.map((w) => (
          <g key={w.s.id}>
            <path d={w.d} fill={w.s.color} stroke="var(--bg-screen)" strokeWidth="2.5" />
            {w.s.iconPaths ? (
              <g transform={`translate(${w.lx - iconSz / 2} ${w.ly - iconSz / 2}) scale(${iconSz / 24})`} style={{ pointerEvents: "none" }}
                fill="none" stroke="var(--bg-card)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity="0.92">
                {w.s.iconPaths.map((d, k) => <path key={k} d={d} />)}
              </g>
            ) : w.s.label ? (
              <text x={w.lx} y={w.ly} textAnchor="middle" dominantBaseline="central" style={{ pointerEvents: "none" }}
                fontFamily="var(--font-sans)" fontSize={size * 0.066} fontWeight="600" fill="var(--bg-card)" opacity="0.96">
                {w.s.label}
              </text>
            ) : null}
          </g>
        ))}
        <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="var(--border-hairline)" strokeWidth="1.5" />
      </svg>
      {/* center hub */}
      <div style={{
        position: "absolute", top: 10 + r - hubR, left: "50%", transform: "translateX(-50%)",
        width: hubR * 2, height: hubR * 2, borderRadius: 999, background: "var(--bg-card)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        {hub}
      </div>
    </div>
  );
}

/* ── Small brand wheel mark (logo) ───────────────────────────────────────── */

export function WheelMark({ size = 28, spin = false }: { size?: number; spin?: boolean }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 0.5;
  const paths = CONFETTI_VARS.map((v, i) => {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return { d: `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r},0,0,1,${x1.toFixed(2)},${y1.toFixed(2)} Z`, v };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", animation: spin ? "wt-idle-spin 28s linear infinite" : undefined }}>
      {paths.map((p, i) => <path key={i} d={p.d} fill={`var(${p.v})`} />)}
      <circle cx={cx} cy={cy} r={size * 0.21} fill="var(--ink)" />
      <circle cx={cx} cy={cy} r={size * 0.075} fill="var(--bg-screen)" />
    </svg>
  );
}

/* ── Time formatting ─────────────────────────────────────────────────────── */

export function formatMmSs(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
