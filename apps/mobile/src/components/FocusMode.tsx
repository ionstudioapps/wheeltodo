import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Clock, RotateCcw } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { FONTS } from '../theme/tokens';
import { ConfettiBurst, Ring, SpinPill, Toggle, formatMmSs, useTokens } from './kit';
import { dismissPomodoroNotification, showFocusCompleteNotification, showPomodoroNotification } from '../utils/notifications';

/* Focus Mode — a simple countdown session.
   Pre-start (Show timer) → session (ring countdown) → complete. */

type Phase = 'prestart' | 'session' | 'complete';

export function FocusMode({ visible, onDone }: { visible: boolean; onDone: (completed: boolean) => void }) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const {
    pomodoroSession, pausePomodoro, resumePomodoro, restartPomodoro, completePomodoro, cancelPomodoro, tickPomodoro,
    resumedSession, consumeResumedSession, notifPrefs,
  } = useApp();

  const [phase, setPhase] = useState<Phase>('prestart');
  const [showTimer, setShowTimer] = useState(true);
  const [showAbandon, setShowAbandon] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const doneRef = useRef(false);
  const taskNameRef = useRef(pomodoroSession?.taskName ?? '');
  if (pomodoroSession) taskNameRef.current = pomodoroSession.taskName;
  // Since this Modal stays mounted and only toggles `visible`, the reset
  // effect below re-fires each time it opens — capture "was this open
  // triggered by a restored session" fresh at that moment, not at mount.
  const resumedSessionRef = useRef(resumedSession);
  resumedSessionRef.current = resumedSession;

  // Reset per session — unless we're opening onto an already-running/paused
  // session restored from storage (app relaunch mid-focus), in which case
  // skip the pre-start screen and drop straight into it.
  useEffect(() => {
    if (visible) {
      if (resumedSessionRef.current) {
        setPhase('session');
        consumeResumedSession();
      } else {
        setPhase('prestart');
      }
      setConfetti(false);
      setShowAbandon(false);
      doneRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Hold the timer on the pre-start screen (not applicable to a resumed
  // session, which should keep running/stay paused as it was).
  useEffect(() => {
    if (visible && phase === 'prestart' && !resumedSessionRef.current) pausePomodoro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase]);

  useEffect(() => {
    if (!visible || phase !== 'session' || !pomodoroSession?.isRunning) return;
    const id = setInterval(tickPomodoro, 1000);
    return () => clearInterval(id);
  }, [visible, phase, pomodoroSession?.isRunning, tickPomodoro]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setConfetti(true);
    void dismissPomodoroNotification();
    if (notifPrefs.focus) {
      const spentMin = Math.max(1, Math.round(((pomodoroSession?.totalSeconds ?? 0) - (pomodoroSession?.remainingSeconds ?? 0)) / 60));
      void showFocusCompleteNotification(taskNameRef.current, spentMin);
    }
    completePomodoro();
    setPhase('complete');
  }

  useEffect(() => {
    if (visible && phase === 'session' && pomodoroSession?.remainingSeconds === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase, pomodoroSession?.remainingSeconds]);

  // Live sticky notification with the remaining time, refreshed once a minute
  // (no-op in Expo Go). Dismissed on pause/leave/finish.
  const remainingMin = Math.floor((pomodoroSession?.remainingSeconds ?? 0) / 60);
  useEffect(() => {
    if (!visible || phase !== 'session' || !pomodoroSession?.isRunning || !notifPrefs.focus) return;
    void showPomodoroNotification(taskNameRef.current, pomodoroSession.remainingSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase, pomodoroSession?.isRunning, remainingMin, notifPrefs.focus]);
  useEffect(() => {
    if (phase === 'session' && pomodoroSession?.isRunning) return;
    void dismissPomodoroNotification();
  }, [phase, pomodoroSession?.isRunning]);

  function begin() {
    resumePomodoro();
    setPhase('session');
  }

  function beginWithoutTimer() {
    finish();
  }

  const total = pomodoroSession?.totalSeconds ?? 1;
  const remaining = pomodoroSession?.remainingSeconds ?? 0;
  const progress = phase === 'complete' ? 1 : Math.min((total - remaining) / total, 1);
  const paused = phase === 'session' && !pomodoroSession?.isRunning;
  const durMin = Math.round(total / 60);

  const s = styles(t);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => setShowAbandon(true)}>
      <View style={[s.screen, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24) }]}>

        {/* ── Pre-start ── */}
        {phase === 'prestart' && (
          <>
            <View style={s.pad}>
              <Pressable hitSlop={10} onPress={() => { cancelPomodoro(); onDone(false); }} accessibilityRole="button" accessibilityLabel="Back" style={{ paddingVertical: 8 }}>
                <ArrowLeft size={22} color={t.colors.text.secondary} strokeWidth={2} />
              </Pressable>
              <Text style={s.eyebrow}>Focus on</Text>
              <Text numberOfLines={2} style={s.taskTitle}>{pomodoroSession?.taskName}</Text>
              <View style={s.durBadge}>
                <Clock size={13} color={t.colors.text.secondary} strokeWidth={2} />
                <Text style={s.durText}>{durMin} min</Text>
              </View>
            </View>
            <View style={s.ringWrap}>
              <Ring progress={0} size={220} stroke={12} color={t.colors.accent.main}>
                <Text style={s.ringTime}>{formatMmSs(total)}</Text>
              </Ring>
            </View>
            <View style={s.pad}>
              <View style={[s.settingRow, { borderTopWidth: 0, paddingTop: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingTitle}>Show timer</Text>
                  <Text style={s.settingDesc}>Display countdown during focus</Text>
                </View>
                <Toggle value={showTimer} onChange={setShowTimer} />
              </View>
              <SpinPill full onPress={begin}>Start</SpinPill>
              <Pressable onPress={beginWithoutTimer} style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={s.linkText}>Start without focus mode</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── Session ── */}
        {phase === 'session' && (
          <>
            <View style={[s.pad, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.eyebrow}>Focus on</Text>
                <Text numberOfLines={1} style={s.sessionTask}>{pomodoroSession?.taskName}</Text>
              </View>
              <Pressable
                hitSlop={10} onPress={() => setShowTimer((v) => !v)}
                accessibilityRole="button" accessibilityLabel={showTimer ? 'Hide timer' : 'Show timer'}
                style={[s.timerToggle, showTimer && { backgroundColor: t.colors.softs.coral }]}
              >
                <Clock size={16} color={showTimer ? t.colors.accent.main : t.colors.text.secondary} strokeWidth={2} />
                <Text style={[s.timerToggleText, showTimer && { color: t.colors.accent.main }]}>
                  {showTimer ? 'Timer on' : 'Timer off'}
                </Text>
              </Pressable>
            </View>

            <View style={s.ringWrap}>
              <Ring progress={progress} size={250} stroke={12} color={t.colors.accent.main}>
                {showTimer ? (
                  <Text style={[s.ringTime, { fontSize: 46 }]}>{formatMmSs(remaining)}</Text>
                ) : paused ? (
                  <Text style={s.pausedLabel}>Paused</Text>
                ) : null}
              </Ring>
            </View>

            <View style={s.pad}>
              <SpinPill full onPress={paused ? resumePomodoro : pausePomodoro}>
                {paused ? 'Resume' : 'Pause'}
              </SpinPill>
              <View style={s.sessionActions}>
                <Pressable hitSlop={8} onPress={restartPomodoro} style={s.secondaryBtn}>
                  <RotateCcw size={16} color={t.colors.text.secondary} strokeWidth={2} />
                  <Text style={s.secondaryBtnText}>Restart</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={finish} style={s.secondaryBtn}>
                  <Text style={s.secondaryBtnText}>Done early</Text>
                </Pressable>
              </View>
              <Pressable hitSlop={8} onPress={() => setShowAbandon(true)} style={{ alignItems: 'center', paddingTop: 14 }}>
                <Text style={s.linkText}>Leave</Text>
              </Pressable>
            </View>

            {/* Abandon overlay */}
            {showAbandon && (
              <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                <Pressable onPress={() => setShowAbandon(false)} style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg.overlay }]} />
                <View style={s.abandonSheet}>
                  <View style={s.handle} />
                  <Text style={s.abandonTitle}>Leave session?</Text>
                  <Text style={s.abandonBody}>The session won&apos;t count toward today.</Text>
                  <SpinPill full onPress={() => setShowAbandon(false)}>Keep going</SpinPill>
                  <Pressable onPress={() => { setShowAbandon(false); void dismissPomodoroNotification(); cancelPomodoro(); onDone(false); }} style={{ paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.secondary }}>Leave</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Complete ── */}
        {phase === 'complete' && (
          <>
            <View style={s.pad}>
              <Text style={s.eyebrow}>Finished</Text>
              <Text style={[s.sessionTask, { color: t.colors.text.secondary, textDecorationLine: 'line-through' }]}>
                {taskNameRef.current}
              </Text>
            </View>
            <View style={s.ringWrap}>
              <Ring progress={1} size={220} stroke={12} color={t.colors.action.success}>
                <Check size={64} color={t.colors.action.success} strokeWidth={2.4} />
              </Ring>
            </View>
            <View style={s.pad}>
              <Text style={s.completeTitle}>Done.</Text>
              <Text style={s.completeSub}>On to the next.</Text>
              <SpinPill full onPress={() => onDone(true)}>Back to wheel</SpinPill>
            </View>
          </>
        )}

        <ConfettiBurst active={confetti} />
      </View>
    </Modal>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.colors.bg.screen },
  pad: { paddingHorizontal: 24 },
  eyebrow: { fontFamily: FONTS.display, fontSize: 26, color: t.colors.accent.main, marginTop: 6, marginBottom: 2, marginLeft: -3, paddingLeft: 3 },
  taskTitle: { fontFamily: FONTS.sansSemi, fontSize: 22, lineHeight: 28, color: t.colors.text.primary, marginBottom: 14 },
  sessionTask: { fontFamily: FONTS.sansMedium, fontSize: 16, color: t.colors.text.primary },
  durBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: t.colors.bg.card, borderWidth: 1, borderColor: t.colors.hairline,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5,
  },
  durText: { fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.secondary },
  ringWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  ringTime: { fontFamily: FONTS.sansLight, fontSize: 42, letterSpacing: 1.5, color: t.colors.text.primary, fontVariant: ['tabular-nums'] },
  pausedLabel: { fontFamily: FONTS.sansMedium, fontSize: 15, letterSpacing: 1, color: t.colors.text.muted },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: t.colors.hairline, marginBottom: 16 },
  settingTitle: { fontFamily: FONTS.sans, fontSize: 16, color: t.colors.text.primary, marginBottom: 2 },
  settingDesc: { fontFamily: FONTS.sansLight, fontSize: 12, color: t.colors.text.muted },
  timerToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 100, backgroundColor: t.colors.bg.card,
  },
  timerToggleText: { fontFamily: FONTS.sansSemi, fontSize: 13, color: t.colors.text.secondary },
  sessionActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 48, borderRadius: 100, backgroundColor: t.colors.bg.card,
    borderWidth: 1.5, borderColor: t.colors.hairline,
  },
  secondaryBtnText: { fontFamily: FONTS.sansSemi, fontSize: 15, color: t.colors.text.secondary },
  linkText: { fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.muted },
  abandonSheet: {
    backgroundColor: t.colors.bg.sheet, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, gap: 8,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.hairline, alignSelf: 'center', marginBottom: 8 },
  abandonTitle: { fontFamily: FONTS.sansSemi, fontSize: 18, color: t.colors.text.primary },
  abandonBody: { fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21, color: t.colors.text.secondary, marginBottom: 8 },
  completeTitle: { fontFamily: FONTS.sansBold, fontSize: 34, color: t.colors.text.primary, textAlign: 'center', marginBottom: 4 },
  completeSub: { fontFamily: FONTS.sansLight, fontSize: 14, color: t.colors.text.muted, textAlign: 'center', marginBottom: 20 },
});
