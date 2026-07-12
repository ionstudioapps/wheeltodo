import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../theme/tokens';
import { Ring, SpinPill, TaskWheel, WheelMark, formatMmSs, useTokens } from './kit';

/* First-run walkthrough — a short sequence of full-screen pages that explain
   the idea (the wheel decides, out of order is fine, baby steps count), then
   hand off to an empty app ready for the user's own tasks. */

interface Page {
  lead: string;
  script: string;
  body: string;
  visual: 'mark' | 'wheel' | 'ring' | 'dots';
  starters?: string[];
}

const PAGES: Page[] = [
  {
    lead: 'Hello.',
    script: 'Welcome',
    body: "WheelToDo is a to-do list with one twist: when you can't choose what to do next, you don't have to.",
    visual: 'mark',
  },
  {
    lead: 'Your tasks live on a wheel.',
    script: 'Spin',
    body: "Spin it and do whatever it lands on. Out of order is fine — that's the point. When every task feels equally heavy, letting the wheel pick beats not starting at all.",
    visual: 'wheel',
  },
  {
    lead: 'One task. One timer.',
    script: 'Focus',
    body: 'Every spin flows into a focus block, with everything else tucked away. Baby steps count — a short session still moves you forward.',
    visual: 'ring',
  },
  {
    lead: 'Small and daily.',
    script: 'Show up',
    body: 'Track a few tiny habits alongside your tasks. Rest counts too — a quick walk or a coffee keeps your streak alive on the heavy days.',
    visual: 'dots',
  },
  {
    lead: 'The wheel starts empty.',
    script: 'Your turn',
    body: "Add whatever's on your mind — one task is enough to spin. The wheel takes it from there.",
    visual: 'mark',
    starters: ['Buy groceries', 'Text a friend', '10-min walk'],
  },
];

function PageVisual({ kind }: { kind: Page['visual'] }) {
  const t = useTokens();
  const idleRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (kind !== 'wheel') return;
    const loop = Animated.loop(
      Animated.timing(idleRotation, { toValue: 360, duration: 22000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [kind, idleRotation]);

  switch (kind) {
    case 'wheel':
      return (
        <TaskWheel
          size={170}
          rotation={idleRotation}
          slices={[1, 2, 3, 4, 5].map((n) => ({ id: `demo_${n}`, color: t.colors.wheel[n] }))}
        />
      );
    case 'ring':
      return (
        <Ring progress={0.35} size={150} stroke={11} color={t.colors.accent.main} animated>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 28, color: t.colors.text.primary, fontVariant: ['tabular-nums'] }}>
            {formatMmSs(16 * 60 + 12)}
          </Text>
        </Ring>
      );
    case 'dots':
      return (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {[1, 1, 1, 0, 1, 0, 0].map((f, i) => <PopInDot key={i} filled={!!f} color={t.colors.wheel[(i % 6) + 1]} hairline={t.colors.hairline} delay={i * 80} />)}
        </View>
      );
    default:
      return <WheelMark size={86} spin hubColor={t.colors.bg.card} />;
  }
}

function PopInDot({ filled, color, hairline, delay }: { filled: boolean; color: string; hairline: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={{
      width: 22, height: 22, borderRadius: 999,
      backgroundColor: filled ? color : 'transparent',
      borderWidth: filled ? 0 : 2, borderColor: hairline,
      opacity: v, transform: [{ scale: v }],
    }} />
  );
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const p = PAGES[page];
  const last = page === PAGES.length - 1;

  return (
    <Modal animationType="fade">
      <View style={{ flex: 1, backgroundColor: t.colors.bg.screen, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24) + 12 }}>
        {/* Skip */}
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, minHeight: 36 }}>
          {!last && (
            <Pressable hitSlop={8} onPress={onDone} style={{ padding: 8 }}>
              <Text style={{ fontFamily: FONTS.sansLight, fontSize: 14, color: t.colors.text.muted }}>Skip</Text>
            </Pressable>
          )}
        </View>

        {/* Page content */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <View style={{ height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
            <PageVisual key={page} kind={p.visual} />
          </View>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 16, color: t.colors.text.secondary, marginBottom: 4 }}>{p.lead}</Text>
          <Text style={{ fontFamily: FONTS.display, fontSize: 56, lineHeight: 64, color: t.colors.text.primary, marginBottom: 14, marginLeft: -3, paddingLeft: 3 }}>
            {p.script}<Text style={{ color: t.colors.accent.main }}>.</Text>
          </Text>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 15, lineHeight: 24, color: t.colors.text.secondary, textAlign: 'center', maxWidth: 330 }}>
            {p.body}
          </Text>
          {p.starters && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18, maxWidth: 330 }}>
              {p.starters.map((s) => (
                <View key={s} style={{
                  borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14,
                  backgroundColor: t.colors.bg.card, borderWidth: 1, borderColor: t.colors.hairline,
                }}>
                  <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 13, color: t.colors.text.secondary }}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Dots + CTA */}
        <View style={{ alignItems: 'center', gap: 22, paddingTop: 22, paddingHorizontal: 26 }}>
          <View style={{ flexDirection: 'row' }}>
            {PAGES.map((_, i) => (
              <Pressable
                key={i} onPress={() => setPage(i)} accessibilityLabel={`Page ${i + 1}`}
                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{
                  width: i === page ? 22 : 8, height: 8, borderRadius: 999,
                  backgroundColor: i === page ? t.colors.accent.main : t.colors.bg.sunk,
                }} />
              </Pressable>
            ))}
          </View>
          <SpinPill full onPress={() => (last ? onDone() : setPage(page + 1))}>
            {last ? 'Add my first task' : 'Next'}
          </SpinPill>
        </View>
      </View>
    </Modal>
  );
}
