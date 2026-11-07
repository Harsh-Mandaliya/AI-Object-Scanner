// Small motion toolkit built on React Native's Animated API (no extra dependencies).

import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

// The native driver is not available on web.
export const NATIVE = Platform.OS !== 'web';

function useAnimatedValue(initial: number) {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}

/** Fades and slides its children in when mounted. */
export function FadeIn({
  children,
  delay = 0,
  from = 14,
  duration = 380,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [progress, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Pops in with a slight scale, used for chat bubbles. */
export function PopIn({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    Animated.spring(progress, { toValue: 1, friction: 7, tension: 80, useNativeDriver: NATIVE }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Gently scales its children up and down forever. */
export function Pulse({
  children,
  min = 1,
  max = 1.06,
  duration = 1100,
  style,
}: {
  children: React.ReactNode;
  min?: number;
  max?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(progress, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, duration]);

  return (
    <Animated.View
      style={[style, { transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [min, max] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** Expanding ring that fades out, repeated (radar / "live" effect). */
export function Ripple({ size, color, duration = 1800 }: { size: number; color: string; duration?: number }) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE })
    );
    loop.start();
    return () => loop.stop();
  }, [progress, duration]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
      }}
    />
  );
}

/** Three bouncing dots, like a "typing…" indicator. */
export function TypingDots({ color = '#6B7280' }: { color?: string }) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: NATIVE })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((index) => {
        const start = index * 0.2;
        const translateY = progress.interpolate({
          inputRange: [0, start, start + 0.2, start + 0.4, 1],
          outputRange: [0, 0, -5, 0, 0],
        });
        const opacity = progress.interpolate({
          inputRange: [0, start, start + 0.2, start + 0.4, 1],
          outputRange: [0.4, 0.4, 1, 0.4, 0.4],
        });
        return (
          <Animated.View
            key={index}
            style={[styles.dot, { backgroundColor: color, opacity, transform: [{ translateY }] }]}
          />
        );
      })}
    </View>
  );
}

/** A glowing line that sweeps up and down inside a box (scanner effect). */
export function ScanLine({ height, color = '#38BDF8' }: { height: number; color?: string }) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(progress, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.scanLine,
        {
          backgroundColor: color,
          shadowColor: color,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height - 3] }) }],
        },
      ]}
    />
  );
}

/** Horizontal bar that fills to `value` (0–1) with an animation. */
export function ProgressBar({
  value,
  color,
  track = '#E5E7EB',
  height = 8,
  delay = 200,
}: {
  value: number;
  color: string;
  track?: string;
  height?: number;
  delay?: number;
}) {
  const progress = useAnimatedValue(0);
  const target = Math.max(0, Math.min(1, value));

  useEffect(() => {
    // Width cannot use the native driver.
    Animated.timing(progress, {
      toValue: target,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, target, delay]);

  return (
    <View style={[styles.track, { backgroundColor: track, height, borderRadius: height / 2 }]}>
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

/** Soft shimmering placeholder block shown while content loads. */
export function Skeleton({ width, height = 14, style }: { width: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 700, useNativeDriver: NATIVE }),
        Animated.timing(progress, { toValue: 0, duration: 700, useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 8, backgroundColor: '#E5E7EB' },
        style,
        { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 18, paddingHorizontal: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    height: 3,
    borderRadius: 2,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  track: { width: '100%', overflow: 'hidden' },
});
