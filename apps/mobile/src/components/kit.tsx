import React, { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Animated, Easing, Modal, Pressable, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { getTokens, FONTS, type Tokens } from '../theme/tokens';

/* ── Theme hook ──────────────────────────────────────────────────────────── */

export function useTokens(): Tokens {
  const { theme } = useApp();
  return useMemo(() => getTokens(theme), [theme]);
}

/* ── Task category icon paths (shared with web kit) ──────────────────────── */

export const TASK_ICON_PATHS: Record<string, string[]> = {
  mind:    ['M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.1 1.5 3.5.7.8 1.3 1.5 1.5 2.5', 'M9 18h6', 'M10 22h4'],
  work:    ['M2 3h20v14H2z', 'M8 21h8M12 17v4'],
  home:    ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  care:    ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'],
  move:    ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  social:  ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  create:  ['m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z', 'M5 3v4M19 17v4M3 5h4M17 19h4'],
  errands: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
};

export const TASK_CATEGORIES: { id: string; label: string }[] = [
  { id: 'mind', label: 'Mind' }, { id: 'work', label: 'Work' },
  { id: 'home', label: 'Home' }, { id: 'care', label: 'Care' },
  { id: 'move', label: 'Move' }, { id: 'social', label: 'Social' },
  { id: 'create', label: 'Create' }, { id: 'errands', label: 'Errands' },
];

export function CategoryIcon({ id, size = 20, color }: { id: string; size?: number; color: string }) {
  const paths = TASK_ICON_PATHS[id];
  if (!paths) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/* ── Headline: quiet lead-in + Ephesis payoff with accent period ─────────── */

export function Headline({ lead, script, size = 52, align = 'left' }: {
  lead: string; script: string; size?: number; align?: 'left' | 'center';
}) {
  const t = useTokens();
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text style={{ fontFamily: FONTS.sansLight, fontSize: 18, color: t.colors.text.secondary, letterSpacing: 0.2 }}>
        {lead}
      </Text>
      <Text style={{ fontFamily: FONTS.display, fontSize: size, lineHeight: size * 1.08, marginTop: 2, color: t.colors.text.primary }}>
        {script}<Text style={{ color: t.colors.accent.main }}>.</Text>
      </Text>
    </View>
  );
}

/* ── Primary pill button (press = scale 0.97) ────────────────────────────── */

export function SpinPill({ children, onPress, disabled, full, style, small }: {
  children: ReactNode; onPress?: () => void; disabled?: boolean; full?: boolean;
  style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const t = useTokens();
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) =>
    Animated.timing(scale, { toValue: to, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && press(0.97)}
      onPressOut={() => press(1)}
      disabled={disabled}
      style={full ? { alignSelf: 'stretch' } : undefined}
    >
      <Animated.View style={[{
        height: small ? 48 : 56, borderRadius: t.radius.pill, paddingHorizontal: 40,
        backgroundColor: t.colors.action.primary, opacity: disabled ? 0.5 : 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
        transform: [{ scale }],
      }, style]}>
        {typeof children === 'string' ? (
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: small ? 15 : 17, letterSpacing: 0.2, color: t.colors.action.onPrimary }}>
            {children}
          </Text>
        ) : children}
      </Animated.View>
    </Pressable>
  );
}

/* ── Bottom sheet ────────────────────────────────────────────────────────── */

export function Sheet({ children, onClose, visible = true }: {
  children: ReactNode; onClose?: () => void; visible?: boolean;
}) {
  const t = useTokens();
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg.overlay }]} />
        <View style={{
          backgroundColor: t.colors.bg.sheet,
          borderTopLeftRadius: t.radius.sheet, borderTopRightRadius: t.radius.sheet,
          paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40, maxHeight: '88%',
        }}>
          <View style={{ width: 42, height: 5, borderRadius: 999, backgroundColor: t.colors.hairline, alignSelf: 'center', marginBottom: 16 }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

/* ── Toggle switch ───────────────────────────────────────────────────────── */

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const t = useTokens();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{
        width: 50, height: 30, borderRadius: 15, padding: 3,
        backgroundColor: value ? t.colors.lavender : t.colors.bg.sunk,
        borderWidth: value ? 0 : 1, borderColor: t.colors.hairline,
        alignItems: value ? 'flex-end' : 'flex-start', justifyContent: 'center',
      }}
    >
      <View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: t.colors.bg.card, elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }} />
    </Pressable>
  );
}

/* ── Section micro-label ─────────────────────────────────────────────────── */

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTokens();
  return (
    <Text style={[{ fontFamily: FONTS.sansBold, fontSize: 11.5, letterSpacing: 1.2, textTransform: 'uppercase', color: t.colors.text.muted }, style]}>
      {children}
    </Text>
  );
}

/* ── Card shadow preset ──────────────────────────────────────────────────── */

export function cardShadow(dark: boolean): ViewStyle {
  return {
    shadowColor: '#000',
    shadowOpacity: dark ? 0.3 : 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  };
}

/* ── Confetti field: static scattered pieces ─────────────────────────────── */

export function ConfettiField({ count = 24, top = 60 }: { count?: number; top?: number }) {
  const t = useTokens();
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: 4 + (i * 37) % 92,
    top: top + (i * 53) % 290,
    c: t.colors.wheel[i % t.colors.wheel.length],
    rot: (i * 47) % 360,
    w: 6 + (i % 3) * 2,
    h: 10 + (i % 2) * 4,
  })), [count, top, t]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <View key={i} style={{
          position: 'absolute', left: `${p.left}%`, top: p.top, width: p.w, height: p.h,
          backgroundColor: p.c, borderRadius: 2, opacity: 0.88,
          transform: [{ rotate: `${p.rot}deg` }],
        }} />
      ))}
    </View>
  );
}

/* ── Confetti burst (radial, animated) ───────────────────────────────────── */

const hashRnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function ConfettiBurst({ active }: { active: boolean }) {
  const t = useTokens();
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(() => Array.from({ length: 42 }, (_, i) => {
    const ang = (i / 42) * Math.PI * 2 + (hashRnd(i * 7 + 1) - 0.5) * 0.5;
    const spd = 90 + hashRnd(i * 7 + 2) * 130;
    return {
      id: i, c: t.colors.wheel[i % t.colors.wheel.length],
      dx: Math.cos(ang) * spd, dy: Math.sin(ang) * spd - 40,
      rot: (hashRnd(i * 7 + 3) > 0.5 ? 1 : -1) * (80 + hashRnd(i * 7 + 4) * 280),
      w: 6 + hashRnd(i * 7 + 5) * 7, h: 3 + hashRnd(i * 7 + 6) * 4,
    };
  }), [t]);

  useEffect(() => {
    if (!active) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
  }, [active, progress]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Animated.View key={p.id} style={{
          position: 'absolute', top: '42%', left: '50%',
          width: p.w, height: p.h, backgroundColor: p.c, borderRadius: 2,
          opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

/* ── The wheel ───────────────────────────────────────────────────────────── */

export interface WheelSlice {
  id: string;
  color: string;
  label?: string;
  iconPaths?: string[];
}

const AnimatedG = Animated.createAnimatedComponent(G);

export function TaskWheel({ slices, size = 300, rotation, hub, onPress }: {
  slices: WheelSlice[]; size?: number;
  rotation: Animated.Value;             // degrees
  hub?: ReactNode;
  onPress?: () => void;                 // tapping anywhere on the wheel spins it
}) {
  const t = useTokens();
  const r = size / 2, cx = r, cy = r;
  const n = Math.max(1, slices.length);
  const slice = (2 * Math.PI) / n;
  const hubR = Math.max(size * 0.13, 30);
  const iconSz = size * 0.1;

  const wedges = slices.map((s, i) => {
    const a0 = -Math.PI / 2 + i * slice, a1 = a0 + slice;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = slice > Math.PI ? 1 : 0;
    const mid = a0 + slice / 2;
    const lr = r * 0.66;
    return {
      s,
      d: n === 1
        ? `M ${cx} ${cy - r + 1} A ${r - 1} ${r - 1} 0 1 1 ${cx - 0.01} ${cy - r + 1} Z`
        : `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`,
      lx: cx + lr * Math.cos(mid), ly: cy + lr * Math.sin(mid),
    };
  });

  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ width: size, height: size + 14, alignItems: 'center' }}>
      {/* pointer */}
      <View style={{ position: 'absolute', top: 0, zIndex: 4 }}>
        <Svg width={26} height={20} viewBox="0 0 26 20">
          <Path d="M13 19 L24 2 H2 Z" fill={t.colors.ink} />
        </Svg>
      </View>
      <Animated.View style={{ marginTop: 10, transform: [{ rotate: spin }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={cx} cy={cy} r={r - 1} fill={t.colors.bg.card} />
          {wedges.map((w) => (
            <G key={w.s.id}>
              <Path d={w.d} fill={w.s.color} stroke={t.colors.bg.screen} strokeWidth={2.5} />
              {w.s.iconPaths ? (
                <G x={w.lx - iconSz / 2} y={w.ly - iconSz / 2} scale={iconSz / 24}>
                  {w.s.iconPaths.map((d, k) => (
                    <Path key={k} d={d} fill="none" stroke={t.colors.bg.card} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
                  ))}
                </G>
              ) : w.s.label ? (
                <SvgText
                  x={w.lx} y={w.ly + size * 0.024} textAnchor="middle"
                  fontSize={size * 0.066} fontFamily={FONTS.sansSemi}
                  fill={t.colors.bg.card} opacity={0.96}
                >
                  {w.s.label}
                </SvgText>
              ) : null}
            </G>
          ))}
          <Circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={t.colors.hairline} strokeWidth={1.5} />
        </Svg>
      </Animated.View>
      {/* hub */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 10 + r - hubR,
        width: hubR * 2, height: hubR * 2, borderRadius: 999,
        backgroundColor: t.colors.bg.card, alignItems: 'center', justifyContent: 'center',
        ...cardShadow(t.dark),
      }}>
        {hub}
      </View>
    </Pressable>
  );
}

export function WheelHub({ done = 0, total = 0 }: { done?: number; total?: number }) {
  const t = useTokens();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 22, color: t.colors.text.primary, fontVariant: ['tabular-nums'] }}>
        {done}/{total}
      </Text>
      <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 9, letterSpacing: 1.2, color: t.colors.text.muted, marginTop: 2 }}>
        TODAY
      </Text>
    </View>
  );
}

/* ── Small brand wheel mark ──────────────────────────────────────────────── */

export function WheelMark({ size = 28 }: { size?: number }) {
  const t = useTokens();
  const cx = size / 2, cy = size / 2, r = size / 2 - 0.5;
  const paths = t.colors.wheel.map((c, i) => {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return { d: `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r},0,0,1,${x1.toFixed(2)},${y1.toFixed(2)} Z`, c };
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => <Path key={i} d={p.d} fill={p.c} />)}
      <Circle cx={cx} cy={cy} r={size * 0.21} fill={t.colors.ink} />
      <Circle cx={cx} cy={cy} r={size * 0.075} fill={t.colors.bg.screen} />
    </Svg>
  );
}

/* ── Progress ring ───────────────────────────────────────────────────────── */

export function Ring({ progress, size = 64, stroke = 7, color, children }: {
  progress: number; size?: number; stroke?: number; color?: string; children?: ReactNode;
}) {
  const t = useTokens();
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.colors.bg.sunk} strokeWidth={stroke} />
        <Circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color ?? t.colors.accent.main} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${C}`} strokeDashoffset={C * (1 - Math.min(progress, 1))}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ── Time formatting ─────────────────────────────────────────────────────── */

export function formatMmSs(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
