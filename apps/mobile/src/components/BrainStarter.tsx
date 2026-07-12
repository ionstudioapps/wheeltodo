import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { FONTS } from '../theme/tokens';
import { ConfettiBurst, SpinPill, useTokens } from './kit';

/* Brain Starter — a 30-second wake-up game. Tap the numbered bubbles in order.
   Seed: once a week · Bloom: once a day. */

const COUNT = 6;
const BUBBLE = 86;

const hashRnd = (n: number, seed: number) => {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function layout(seed: number) {
  const cells = [0, 1, 2, 3, 4, 5].sort((a, b) => hashRnd(a + 10, seed) - hashRnd(b + 10, seed));
  return cells.map((cell, i) => ({
    n: i + 1,
    leftPct: (cell % 2) * 44 + 6 + hashRnd(i, seed) * 16,
    topPct: Math.floor(cell / 2) * 30 + 4 + hashRnd(i + 20, seed) * 10,
  }));
}

type Phase = 'intro' | 'playing' | 'done';

export function BrainStarter({ visible, onClose, onFinished }: {
  visible: boolean; onClose: () => void; onFinished: () => void;
}) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('intro');
  const [next, setNext] = useState(1);
  const [seed, setSeed] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(0);
  const finishedRef = useRef(false);

  const bubbles = useMemo(() => layout(seed), [seed]);
  const bubbleColors = [t.colors.wheel[0], t.colors.wheel[4], t.colors.wheel[5], t.colors.wheel[2], t.colors.wheel[3], t.colors.wheel[6]];

  useEffect(() => {
    if (visible) { setPhase('intro'); finishedRef.current = false; }
  }, [visible]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setElapsedMs(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [phase]);

  function start() {
    setSeed((v) => v + 1);
    setNext(1);
    setElapsedMs(0);
    startRef.current = Date.now();
    setPhase('playing');
  }

  function tap(n: number) {
    if (n !== next) return;
    if (n === COUNT) {
      setPhase('done');
      if (!finishedRef.current) { finishedRef.current = true; onFinished(); }
      return;
    }
    setNext(n + 1);
  }

  const seconds = (elapsedMs / 1000).toFixed(1);
  const s = styles(t);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={s.header}>
          <Text style={s.headerLabel}>BRAIN STARTER</Text>
          <Pressable onPress={onClose} hitSlop={10} style={s.close}>
            <X size={16} color={t.colors.text.primary} strokeWidth={2} />
          </Pressable>
        </View>

        {phase === 'intro' && (
          <View style={s.centered}>
            <Text style={s.lead}>Ease into the day.</Text>
            <Text style={s.script}>Wake up<Text style={{ color: t.colors.accent.main }}>.</Text></Text>
            <Text style={s.body}>
              Tap the bubbles from 1 to {COUNT}, in order. No rush — it&apos;s a warm-up, not a race.
            </Text>
            <SpinPill onPress={start}>Begin</SpinPill>
          </View>
        )}

        {phase === 'playing' && (
          <>
            <Text style={s.findLine}>
              Find <Text style={{ fontFamily: FONTS.sansSemi, color: t.colors.text.primary }}>{next}</Text> · {seconds}s
            </Text>
            <View style={{ flex: 1, marginTop: 8 }}>
              {bubbles.map((b) => {
                const done = b.n < next;
                return (
                  <Pressable
                    key={`${seed}-${b.n}`}
                    onPress={() => tap(b.n)}
                    style={{
                      position: 'absolute',
                      left: ((width - 48) * b.leftPct) / 100 + 24,
                      top: `${b.topPct}%`,
                      width: BUBBLE, height: BUBBLE, borderRadius: 999,
                      backgroundColor: done ? t.colors.bg.sunk : bubbleColors[b.n - 1],
                      alignItems: 'center', justifyContent: 'center',
                      transform: [{ scale: done ? 0.82 : 1 }],
                    }}
                  >
                    {done ? (
                      <Check size={22} color={t.colors.text.muted} strokeWidth={2.4} />
                    ) : (
                      <Text style={s.bubbleNum}>{b.n}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {phase === 'done' && (
          <View style={s.centered}>
            <Text style={s.lead}>All {COUNT}, in {seconds} seconds.</Text>
            <Text style={[s.script, { color: t.colors.accent.main }]}>Brain awake.</Text>
            <Text style={s.body}>Nicely done. The wheel is ready when you are.</Text>
            <SpinPill onPress={onClose}>Back to the wheel</SpinPill>
            <ConfettiBurst active />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.colors.bg.screen, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLabel: { fontFamily: FONTS.sansSemi, fontSize: 12, letterSpacing: 1.5, color: t.colors.text.secondary },
  close: { width: 36, height: 36, borderRadius: 999, backgroundColor: t.colors.bg.sunk, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
  lead: { fontFamily: FONTS.sansLight, fontSize: 16, color: t.colors.text.secondary, marginBottom: 3 },
  script: { fontFamily: FONTS.display, fontSize: 62, lineHeight: 76, color: t.colors.text.primary, marginBottom: 18, marginLeft: -9, paddingLeft: 9 },
  body: { fontFamily: FONTS.sansLight, fontSize: 15, lineHeight: 23, color: t.colors.text.secondary, textAlign: 'center', maxWidth: 280, marginBottom: 30 },
  findLine: { fontFamily: FONTS.sansLight, fontSize: 15, color: t.colors.text.secondary, textAlign: 'center', marginTop: 12, fontVariant: ['tabular-nums'] },
  bubbleNum: { fontFamily: FONTS.sansSemi, fontSize: 30, color: t.colors.bg.card, fontVariant: ['tabular-nums'] },
});
