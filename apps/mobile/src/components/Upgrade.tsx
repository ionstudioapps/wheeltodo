import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { FONTS } from '../theme/tokens';
import { SpinPill, cardShadow, useTokens } from './kit';

/* "More with Bloom." — upgrade screen with billing toggle, launch offer + CTA. */

const BLOOM_FEATURES = [
  'Unlimited spins every day',
  'Unlimited tasks on the wheel',
  'Unlimited habits tracked',
  'Unlimited AI task breakdowns',
  'Unlimited AI voice-to-task',
  'Brain Starter every day',
  'AI Pattern Learning',
  'Cloud Sync & Backup',
  'Multi-device: phone, tablet, desktop',
  'All future AI features',
];

export function UpgradeScreen({ visible, onClose, onActivate }: {
  visible: boolean; onClose: () => void; onActivate: () => void;
}) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const isAnnual = billing === 'annual';
  const s = styles(t);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={onClose} hitSlop={10} style={s.back}>
          <ChevronLeft size={20} color={t.colors.lavender} strokeWidth={2.5} />
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom, 24) + 8 }}>
          <Text style={s.headline}>
            More with{'\n'}<Text style={{ color: t.colors.lavender }}>Bloom.</Text>
          </Text>

          {/* Features */}
          <View style={{ gap: 11, marginBottom: 24 }}>
            {BLOOM_FEATURES.map((f) => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.checkBadge}>
                  <Check size={12} color={t.colors.lavender} strokeWidth={2.5} />
                </View>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Billing toggle */}
          <View style={s.billingWrap}>
            {(['monthly', 'annual'] as const).map((opt) => {
              const on = billing === opt;
              return (
                <Pressable key={opt} onPress={() => setBilling(opt)} style={[s.billingOpt, on && { backgroundColor: t.colors.bg.card, ...cardShadow(t.dark) }]}>
                  <Text style={[s.billingText, on && { fontFamily: FONTS.sansSemi, color: t.colors.text.primary }]}>
                    {opt === 'monthly' ? 'Monthly' : 'Annual'}
                  </Text>
                  {opt === 'annual' && (
                    <View style={s.saveBadge}><Text style={s.saveText}>SAVE 33%</Text></View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Price card */}
          <View style={s.priceCard}>
            {isAnnual && (
              <View style={s.launchBadge}><Text style={s.launchText}>LAUNCH OFFER</Text></View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <Text style={s.price}>{isAnnual ? '$33.99' : '$4.99'}</Text>
              <Text style={s.priceUnit}>{isAnnual ? 'first year' : '/month'}</Text>
            </View>
            {isAnnual ? (
              <Text style={s.priceSub}>
                <Text style={{ textDecorationLine: 'line-through', opacity: 0.6 }}>$39.99/year</Text>
                {'  '}$2.83/month · limited time launch offer
              </Text>
            ) : (
              <Text style={s.priceSub}>billed monthly · cancel any time</Text>
            )}
          </View>

          <SpinPill full onPress={onActivate}>Try Bloom · 7 days free</SpinPill>
          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={s.continueSeed}>Continue with Seed</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* Inline nudge row used from Seed limit states */
export function BloomNudge({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTokens();
  return (
    <Pressable onPress={onPress} style={{
      backgroundColor: t.colors.bg.sunk, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 13,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.primary, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: t.colors.text.secondary }}>$4.99/month · cancel any time</Text>
      </View>
      <ChevronRight size={16} color={t.colors.accent.main} strokeWidth={2.5} />
    </Pressable>
  );
}

export function BloomChip() {
  const t = useTokens();
  return (
    <View style={{ backgroundColor: t.colors.lavender, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontFamily: FONTS.sansBold, fontSize: 9.5, letterSpacing: 0.8, color: t.colors.text.onInk }}>BLOOM</Text>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.colors.bg.screen },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  backText: { fontFamily: FONTS.sansSemi, fontSize: 14, color: t.colors.lavender },
  headline: { fontFamily: FONTS.display, fontSize: 52, lineHeight: 56, color: t.colors.text.primary, marginTop: 10, marginBottom: 22 },
  checkBadge: { width: 26, height: 26, borderRadius: 999, backgroundColor: t.colors.softs.lavender, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontFamily: FONTS.sans, fontSize: 15.5, lineHeight: 21, color: t.colors.text.primary, flex: 1 },
  billingWrap: { backgroundColor: t.colors.bg.sunk, borderRadius: 100, padding: 4, flexDirection: 'row', marginBottom: 14 },
  billingOpt: { flex: 1, paddingVertical: 9, borderRadius: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  billingText: { fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.muted },
  saveBadge: { backgroundColor: t.colors.rest.physical, borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  saveText: { fontFamily: FONTS.sansBold, fontSize: 9.5, letterSpacing: 0.5, color: t.colors.text.onInk },
  priceCard: { backgroundColor: t.colors.bg.card, borderRadius: 24, padding: 20, marginBottom: 14, ...cardShadow(t.dark) },
  launchBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: t.colors.rest.physical, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  launchText: { fontFamily: FONTS.sansBold, fontSize: 10, letterSpacing: 0.8, color: t.colors.text.onInk },
  price: { fontFamily: FONTS.sansBold, fontSize: 38, color: t.colors.text.primary, letterSpacing: -0.5 },
  priceUnit: { fontFamily: FONTS.sansLight, fontSize: 16, color: t.colors.text.secondary },
  priceSub: { fontFamily: FONTS.sans, fontSize: 12, color: t.colors.text.secondary },
  continueSeed: { fontFamily: FONTS.sans, fontSize: 12.5, color: t.colors.text.muted },
});
