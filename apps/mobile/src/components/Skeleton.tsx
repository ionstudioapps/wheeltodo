import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTokens } from './kit';

/* Pulsing placeholder card shown while cloud data loads after sign-in. */

export function SkeletonRows({ count = 3, height = 66 }: { count?: number; height?: number }) {
  const t = useTokens();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ gap: 9 }}>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={{
          height, borderRadius: 18, backgroundColor: t.colors.bg.sunk, opacity: pulse,
        }} />
      ))}
    </View>
  );
}
