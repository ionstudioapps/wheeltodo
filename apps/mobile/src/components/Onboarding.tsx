import React, { useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
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
  },
];

function PageVisual({ kind }: { kind: Page['visual'] }) {
  const t = useTokens();
  const still = useRef(new Animated.Value(0)).current;
  switch (kind) {
    case 'wheel':
      return (
        <TaskWheel
          size={170}
          rotation={still}
          slices={[1, 2, 3, 4, 5].map((n) => ({ id: `demo_${n}`, color: t.colors.wheel[n] }))}
        />
      );
    case 'ring':
      return (
        <Ring progress={0.35} size={150} stroke={11} color={t.colors.accent.main}>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 28, color: t.colors.text.primary, fontVariant: ['tabular-nums'] }}>
            {formatMmSs(16 * 60 + 12)}
          </Text>
        </Ring>
      );
    case 'dots':
      return (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {[1, 1, 1, 0, 1, 0, 0].map((f, i) => (
            <View key={i} style={{
              width: 22, height: 22, borderRadius: 999,
              backgroundColor: f ? t.colors.wheel[(i % 6) + 1] : 'transparent',
              borderWidth: f ? 0 : 2, borderColor: t.colors.hairline,
            }} />
          ))}
        </View>
      );
    default:
      return <WheelMark size={86} />;
  }
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
            <PageVisual kind={p.visual} />
          </View>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 16, color: t.colors.text.secondary, marginBottom: 4 }}>{p.lead}</Text>
          <Text style={{ fontFamily: FONTS.display, fontSize: 56, lineHeight: 64, color: t.colors.text.primary, marginBottom: 14 }}>
            {p.script}<Text style={{ color: t.colors.accent.main }}>.</Text>
          </Text>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 15, lineHeight: 24, color: t.colors.text.secondary, textAlign: 'center', maxWidth: 330 }}>
            {p.body}
          </Text>
        </ScrollView>

        {/* Dots + CTA */}
        <View style={{ alignItems: 'center', gap: 22, paddingTop: 22, paddingHorizontal: 26 }}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {PAGES.map((_, i) => (
              <Pressable key={i} hitSlop={6} onPress={() => setPage(i)} accessibilityLabel={`Page ${i + 1}`} style={{
                width: i === page ? 22 : 8, height: 8, borderRadius: 999,
                backgroundColor: i === page ? t.colors.accent.main : t.colors.bg.sunk,
              }} />
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
