"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { WIcon, Toggle, ConfettiBurst, Ring, formatMmSs } from "@/components/ui/kit";

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
          The session won&apos;t count toward today.
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
    resumedSession, consumeResumedSession,
  } = useApp();

  // Captured once at mount: were we reopened onto an already-running/paused
  // session (reload, or app relaunch) rather than a fresh "Start focus" tap?
  // If so, skip the pre-start screen entirely.
  const wasResumedRef = useRef(resumedSession);
  const [phase, setPhase] = useState<Phase>(() => (wasResumedRef.current ? "session" : "prestart"));

  useEffect(() => {
    if (wasResumedRef.current) consumeResumedSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  // Hold the timer while on the pre-start screen (not applicable to a
  // resumed session, which should keep running/stay paused as it was).
  useEffect(() => {
    if (phase === "prestart" && !wasResumedRef.current) pausePomodoro();
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
              <p style={{ margin: "0 0 14px", fontSize: 22, fontWeight: 600, lineHeight: 1.25, color: "var(--text-primary)", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{pomodoroSession?.taskName}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-card)", border: "1px solid var(--border-hairline)", borderRadius: "var(--r-pill)", padding: "5px 12px" }}>
                <WIcon name="clock" size={13} color="var(--text-secondary)" />
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>{durMin} min</span>
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 32px 0", minHeight: 0 }}>
              <Ring progress={0} size={230} stroke={12}>
                <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 44, fontWeight: 300, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                  {formatMmSs(total)}
                </span>
              </Ring>
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

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 32px 0", minHeight: 0 }}>
              <Ring progress={progress} size={260} stroke={12}>
                {showTimer ? (
                  <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 48, fontWeight: 300, color: "var(--text-primary)", letterSpacing: "0.04em", animation: "wt-fade-in 280ms ease-out" }}>
                    {formatMmSs(remaining)}
                  </span>
                ) : paused ? (
                  <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.06em" }}>Paused</span>
                ) : null}
              </Ring>
            </div>

            <div style={{ padding: "20px 24px 44px", flexShrink: 0 }}>
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
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 32px 0", minHeight: 0 }}>
              <Ring progress={1} size={230} stroke={12} color="var(--action-success)">
                <WIcon name="check" size={64} stroke={2.4} color="var(--action-success)" />
              </Ring>
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
