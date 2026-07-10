import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { FONTS } from '../theme/tokens';
import { useTokens } from './kit';

interface ToastState {
  message: string;
  onUndo?: () => void;
}

const DISMISS_MS = 5000;

/** Local (per-screen) toast queue with an optional "Undo" action. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string, onUndo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, onUndo });
    timerRef.current = setTimeout(() => setToast(null), DISMISS_MS);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toast, show, dismiss };
}

export function Toast({ toast, onUndo, onDismiss }: {
  toast: ToastState | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View style={[styles(t).wrap, { bottom: 96 + insets.bottom }]} pointerEvents="box-none">
      <View style={styles(t).toast}>
        <Text style={styles(t).message}>{toast.message}</Text>
        {toast.onUndo && (
          <Pressable onPress={onUndo} hitSlop={8} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={styles(t).undo}>Undo</Text>
          </Pressable>
        )}
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss" style={{ padding: 6, opacity: 0.6 }}>
          <X size={15} color={t.colors.text.onInk} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTokens>) => StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 22, zIndex: 90 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 420,
    backgroundColor: t.colors.ink, borderRadius: 18, paddingVertical: 13, paddingLeft: 18, paddingRight: 10,
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  message: { flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.onInk },
  undo: { fontFamily: FONTS.sansBold, fontSize: 14, color: t.colors.accent.main },
});
