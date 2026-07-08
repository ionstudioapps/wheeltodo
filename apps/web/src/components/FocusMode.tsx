"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WIcon, Toggle, ConfettiBurst, formatMmSs } from "@/components/ui/kit";

/* ── easing helpers (ported from the Focus Mode design) ─────────────────── */
const c01 = (v: number) => Math.max(0, Math.min(1, v));
const mr = (v: number, lo: number, hi: number) => c01((v - lo) / (hi - lo));
const eO = (t: number) => 1 - Math.pow(1 - t, 3);
const spr = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 + Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3));
};
const sc = (v: number) => Math.max(0.001, v);

const STAGES = ["Seed", "Sprout", "Growing", "In bloom"];
const stageOf = (p: number) => (p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3);

/* ── FlowerHead ──────────────────────────────────────────────────────────── */
function FlowerHead({ sz = 1, c1 = "var(--wheel-2)", c2 = "var(--wheel-3)" }: { sz?: number; c1?: string; c2?: string }) {
  const dist = 7 * sz, pr = 6 * sz, cr = 4.8 * sz;
  return (
    <g>
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return <circle key={a} cx={Math.cos(r) * dist} cy={Math.sin(r) * dist} r={pr} fill={c1} opacity={0.93} />;
      })}
      {[30, 90, 150, 210, 270, 330].map((a) => {
        const r = (a * Math.PI) / 180;
        return <circle key={`i${a}`} cx={Math.cos(r) * dist * 0.55} cy={Math.sin(r) * dist * 0.55} r={pr * 0.48} fill={c1} opacity={0.3} />;
      })}
      <circle cx={0} cy={0} r={cr} fill={c2} />
      <circle cx={0} cy={0} r={cr * 0.44} fill="var(--plant-seed)" opacity={0.85} />
    </g>
  );
}

/* ── PlantSVG: seed → sprout → growing → in bloom ────────────────────────── */
function PlantSVG({ progress: rawP }: { progress: number }) {
  const p = c01(rawP);
  const stemP = eO(mr(p, 0.04, 0.52));
  const leaf1 = spr(mr(p, 0.22, 0.4));
  const leaf2 = spr(mr(p, 0.4, 0.57));
  const leaf3 = spr(mr(p, 0.57, 0.73));
  const branchP = eO(mr(p, 0.62, 0.78));
  const budP = spr(mr(p, 0.68, 0.84));
  const flrP = spr(mr(p, 0.84, 1.0));
  const seedOp = 1 - eO(mr(p, 0.1, 0.26));
  const budOp = c01(1 - mr(p, 0.82, 0.96));

  const STEM = "M 100 64 C 104 76 89 90 101 112 C 112 135 90 159 101 182 C 111 205 91 225 100 244";
  const SL = 225;

  return (
    <svg viewBox="0 0 200 310" preserveAspectRatio="xMidYMax meet" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <ellipse cx="100" cy="305" rx="44" ry="4.5" fill="var(--bg-overlay)" opacity="0.2" />

      {/* Pot */}
      <path d="M 43 250 L 157 250 L 143 300 L 57 300 Z" fill="var(--plant-pot)" />
      <path d="M 43 250 L 82 250 L 69 300 L 57 300 Z" fill="var(--plant-leaf-b)" opacity="0.18" />
      <rect x="36" y="233" width="128" height="19" rx="9.5" fill="var(--plant-pot-rim)" />

      {/* Soil */}
      <ellipse cx="100" cy="246" rx="56" ry="7.5" fill="var(--plant-soil)" />

      {/* Seed */}
      <g opacity={seedOp}>
        <ellipse cx="100" cy="236" rx="12" ry="8.5" fill="var(--plant-seed)" transform="rotate(-9,100,236)" />
        <path d="M 97 229 Q 100.5 223 104 229" stroke="var(--plant-soil)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Stem */}
      <path d={STEM} fill="none" stroke="var(--plant-stem)" strokeWidth="5.5" strokeLinecap="round" strokeDasharray={SL} strokeDashoffset={SL * (1 - stemP)} />

      {/* Leaf pairs */}
      <g transform={`translate(97,216) scale(${sc(leaf1)})`}>
        <path d="M 0 0 C -8 -2 -24 -9 -25 -20 C -26 -29 -13 -31 -7 -25 C -3 -21 -1 -10 0 0" fill="var(--plant-leaf-a)" />
        <path d="M 0 0 C  8 -2  24 -9  25 -20 C  26 -29  13 -31  7 -25 C  3 -21  1 -10 0 0" fill="var(--plant-leaf-b)" />
      </g>
      <g transform={`translate(101,180) scale(${sc(leaf2)})`}>
        <path d="M 0 0 C -8 -3 -28 -11 -31 -24 C -33 -34 -18 -37 -10 -30 C -4 -25 -1 -12 0 0" fill="var(--plant-leaf-a)" />
        <path d="M 0 0 C  8 -3  28 -11  31 -24 C  33 -34  18 -37  10 -30 C  4 -25  1 -12 0 0" fill="var(--plant-leaf-b)" />
      </g>
      <g transform={`translate(103,135) scale(${sc(leaf3)})`}>
        <path d="M 0 0 C -9 -3 -30 -13 -33 -27 C -36 -38 -20 -42 -12 -34 C -5 -28 -1 -14 0 0" fill="var(--plant-leaf-a)" />
        <path d="M 0 0 C  9 -3  30 -13  33 -27 C  36 -38  20 -42  12 -34 C  5 -28  1 -14 0 0" fill="var(--plant-leaf-b)" />
      </g>

      {/* Branches */}
      {["M 100 121 C 87 113 82 103 80 92", "M 100 119 C 113 111 118 101 120 90"].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--plant-stem)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={44} strokeDashoffset={44 * (1 - branchP)} />
      ))}

      {/* Buds */}
      <g opacity={budOp}>
        {([[80, 92, 5, 8.5, "var(--wheel-2)"], [120, 90, 4.5, 8, "var(--wheel-1)"], [100, 64, 6, 10, "var(--wheel-2)"]] as const).map(([x, y, rx, ry, c], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${sc(budP)})`}>
            <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={c} />
            <ellipse cx={0} cy={-ry * 0.36} rx={rx * 0.62} ry={ry * 0.44} fill="var(--wheel-3)" />
          </g>
        ))}
      </g>

      {/* Flowers */}
      <g transform={`translate(80, 92) scale(${sc(flrP)})`}><FlowerHead sz={0.9} c1="var(--wheel-1)" c2="var(--wheel-3)" /></g>
      <g transform={`translate(120, 90) scale(${sc(flrP)})`}><FlowerHead sz={0.9} c1="var(--wheel-2)" c2="var(--wheel-3)" /></g>
      <g transform={`translate(100, 64) scale(${sc(flrP)})`}><FlowerHead sz={1.12} c1="var(--wheel-2)" c2="var(--wheel-3)" /></g>
    </svg>
  );
}

/* ── Abandon modal ───────────────────────────────────────────────────────── */
function AbandonModal({ onKeep, onLeave }: { onKeep: () => void; onLeave: () => void }) {
  return (
    <div className="wt-scrim" onClick={onKeep} style={{ position: "absolute", inset: 0, background: "var(--bg-overlay)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div className="wt-sheet" onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-sheet)", borderRadius: "var(--r-sheet) var(--r-sheet) 0 0", padding: "20px 24px 52px",
        width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--shadow-pop)",
      }}>
        <div style={{ width: 40, height: 4, background: "var(--border-soft)", borderRadius: 2, margin: "0 auto 14px" }} />
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Leave session?</p>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Your plant will stay where it is. The session won&apos;t count toward today.
        </p>
        <button onClick={onKeep} className="wt-press" style={{ background: "var(--action-primary)", color: "var(--action-on-primary)", border: "none", borderRadius: "var(--r-pill)", fontSize: 17, fontWeight: 500, padding: "17px 32px", cursor: "pointer", width: "100%" }}>
          Keep going.
        </button>
        <button onClick={onLeave} style={{ background: "none", border: "none", cursor: "pointer", padding: 12, fontSize: 14, color: "var(--text-secondary)" }}>
          Leave
        </button>
      </div>
    </div>
  );
}

/* ── Focus Mode ──────────────────────────────────────────────────────────── */

type Phase = "prestart" | "session" | "complete";

export function FocusMode({ onDone }: { onDone: (completed: boolean) => void }) {
  const {
    pomodoroSession, pausePomodoro, resumePomodoro, completePomodoro, cancelPomodoro, tickPomodoro, notifPrefs,
  } = useApp();

  const [phase, setPhase] = useState<Phase>("prestart");
  const [showTimer, setShowTimer] = useState(true);
  const [showAbandon, setShowAbandon] = useState(false);
  // Study Double — a study-with-me video that opens alongside the session
  const [studyUrl, setStudyUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("wt.studyDouble") ?? "";
  });
  const [studyOn, setStudyOn] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const doneRef = useRef(false);
  const taskNameRef = useRef(pomodoroSession?.taskName ?? "");
  const spentRef = useRef(0);
  if (pomodoroSession) {
    taskNameRef.current = pomodoroSession.taskName;
    spentRef.current = Math.max(1, Math.round((pomodoroSession.totalSeconds - pomodoroSession.remainingSeconds) / 60));
  }

  // Hold the timer while on the pre-start screen
  useEffect(() => {
    if (phase === "prestart") pausePomodoro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "session" || !pomodoroSession?.isRunning) return;
    const id = setInterval(tickPomodoro, 1000);
    return () => clearInterval(id);
  }, [phase, pomodoroSession?.isRunning, tickPomodoro]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setConfetti(true);
    if (notifPrefs.focus && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Nice one.", { body: `${taskNameRef.current} · ${spentRef.current} min.` });
      } catch { /* notification best-effort */ }
    }
    completePomodoro();
    setPhase("complete");
  }

  useEffect(() => {
    if (phase === "session" && pomodoroSession?.remainingSeconds === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pomodoroSession?.remainingSeconds]);

  if (!pomodoroSession && phase !== "complete") return null;

  const total = pomodoroSession?.totalSeconds ?? 1;
  const remaining = pomodoroSession?.remainingSeconds ?? 0;
  const progress = phase === "complete" ? 1 : Math.min((total - remaining) / total, 1);
  const stage = stageOf(progress);
  const paused = phase === "session" && !pomodoroSession?.isRunning;
  const durMin = Math.round(total / 60);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--bg-screen)", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="wt-screen" style={{ width: "100%", maxWidth: 480, flex: 1, display: "flex", flexDirection: "column", position: "relative", minHeight: 0 }}>

        {/* ── Pre-start ── */}
        {phase === "prestart" && (
          <>
            <div style={{ padding: "28px 24px 0", flexShrink: 0 }}>
              <button onClick={() => { cancelPomodoro(); onDone(false); }} aria-label="Back" style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 8px 8px 0", color: "var(--text-secondary)" }}>
                <WIcon name="arrowL" size={20} />
              </button>
              <p style={{ margin: "8px 0", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Focus on.</p>
              <p style={{ margin: "0 0 14px", fontSize: 22, fontWeight: 600, lineHeight: 1.25, color: "var(--text-primary)" }}>{pomodoroSession?.taskName}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--r-pill)", padding: "5px 12px" }}>
                <WIcon name="clock" size={13} color="var(--text-secondary)" />
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>{durMin} min</span>
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "12px 32px 0", minHeight: 0 }}>
              <div style={{ width: "100%", maxWidth: 260, aspectRatio: "200/310", flexShrink: 0 }}>
                <PlantSVG progress={0} />
              </div>
            </div>
            <div style={{ padding: "0 24px 44px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid var(--border-hairline)", gap: 16 }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 16, color: "var(--text-primary)" }}>Show timer</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Display countdown during focus</p>
                </div>
                <Toggle value={showTimer} onChange={setShowTimer} label="Show timer" />
              </div>
              <div style={{ padding: "16px 0", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 16, color: "var(--text-primary)" }}>Study double</p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Open a study-with-me video alongside</p>
                  </div>
                  <Toggle value={studyOn} onChange={setStudyOn} label="Study double" />
                </div>
                {studyOn && (
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="Paste a YouTube link"
                    value={studyUrl}
                    onChange={(e) => {
                      setStudyUrl(e.target.value);
                      try { localStorage.setItem("wt.studyDouble", e.target.value); } catch { /* quota */ }
                    }}
                    style={{ marginTop: 12, width: "100%", height: 44, borderRadius: "var(--r-row)", padding: "0 14px", fontSize: 14, background: "var(--bg-input)", color: "var(--text-primary)", border: "none", outline: "none", fontFamily: "inherit" }}
                  />
                )}
              </div>
              <button
                onClick={() => {
                  if (studyOn && /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(studyUrl.trim())) {
                    window.open(studyUrl.trim(), "_blank", "noopener");
                  }
                  resumePomodoro();
                  setPhase("session");
                }}
                className="wt-press"
                style={{ background: "var(--action-primary)", color: "var(--action-on-primary)", border: "none", borderRadius: "var(--r-pill)", fontSize: 17, fontWeight: 500, padding: "17px 32px", cursor: "pointer", width: "100%" }}
              >
                Start.
              </button>
            </div>
          </>
        )}

        {/* ── Session ── */}
        {phase === "session" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "36px 24px 0", flexShrink: 0, gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 3px", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Focus on</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pomodoroSession?.taskName}
                </p>
              </div>
              <button onClick={() => setShowTimer((s) => !s)} title="Toggle timer" style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "var(--text-primary)", opacity: showTimer ? 0.9 : 0.35, flexShrink: 0 }}>
                <WIcon name="clock" size={20} />
              </button>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "8px 32px 0", minHeight: 0 }}>
              <div style={{ width: "100%", maxWidth: 260, aspectRatio: "200/310", flexShrink: 0 }}>
                <PlantSVG progress={progress} />
              </div>
            </div>

            <div style={{ padding: "8px 24px 44px", flexShrink: 0 }}>
              <div style={{ textAlign: "center", marginBottom: showTimer ? 4 : 20 }}>
                <p key={stage} className="script" style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 54, color: "var(--accent)", lineHeight: 1, animation: "wt-stage-pop 420ms var(--ease-out) both" }}>
                  {STAGES[stage]}<span>.</span>
                </p>
              </div>
              {showTimer && (
                <div style={{ textAlign: "center", marginBottom: 20, animation: "wt-fade-in 280ms ease-out" }}>
                  <p style={{ margin: 0, fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 300, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                    {formatMmSs(remaining)}
                  </p>
                </div>
              )}
              <button onClick={paused ? resumePomodoro : pausePomodoro} className="wt-press" style={{ background: "var(--action-primary)", color: "var(--action-on-primary)", border: "none", borderRadius: "var(--r-pill)", fontSize: 17, fontWeight: 500, padding: "17px 32px", cursor: "pointer", width: "100%", marginBottom: 4 }}>
                {paused ? "Resume." : "Pause."}
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
                <button onClick={() => setShowAbandon(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 14px", fontSize: 14, color: "var(--text-muted)" }}>
                  × Leave
                </button>
                <button onClick={finish} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 14px", fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>
                  ✓ Done early
                </button>
              </div>
            </div>

            {showAbandon && (
              <AbandonModal
                onKeep={() => setShowAbandon(false)}
                onLeave={() => { setShowAbandon(false); cancelPomodoro(); onDone(false); }}
              />
            )}
          </>
        )}

        {/* ── Complete ── */}
        {phase === "complete" && (
          <>
            <div style={{ padding: "36px 24px 0", flexShrink: 0 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Finished.</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--text-secondary)", textDecoration: "line-through", textDecorationColor: "var(--accent)", textDecorationThickness: 1.5 }}>
                {taskNameRef.current}
              </p>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "8px 32px 0", minHeight: 0 }}>
              <div style={{ width: "100%", maxWidth: 260, aspectRatio: "200/310", flexShrink: 0 }}>
                <PlantSVG progress={1} />
              </div>
            </div>
            <div style={{ padding: "8px 24px 44px", flexShrink: 0 }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p className="script" style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontSize: 56, color: "var(--accent)", lineHeight: 1 }}>In bloom.</p>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", fontWeight: 300 }}>Done. On to the next.</p>
              </div>
              <button onClick={() => onDone(true)} className="wt-press" style={{ background: "var(--action-primary)", color: "var(--action-on-primary)", border: "none", borderRadius: "var(--r-pill)", fontSize: 17, fontWeight: 500, padding: "17px 32px", cursor: "pointer", width: "100%" }}>
                Back to wheel.
              </button>
            </div>
          </>
        )}

        <ConfettiBurst active={confetti} />
      </div>
    </div>
  );
}
