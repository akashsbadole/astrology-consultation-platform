import React, { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo, Easing } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

type Props = {
  size?: number;
};

/**
 * A minimal armillary-sphere line drawing — orbital rings around a fixed
 * point, evoking a measuring instrument rather than a "mystical" zodiac
 * wheel. This is the one deliberate visual flourish per screen; everything
 * else stays quiet around it.
 *
 * Plays a single entrance animation on mount (fade + gentle rotation),
 * respecting the system's reduce-motion setting.
 */
export function CelestialMotif({ size = 108 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [progress]);

  const opacity = progress;
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '0deg'],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <AnimatedSvg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      style={{ opacity, transform: [{ rotate }, { scale }] }}
    >
      <Circle cx="54" cy="54" r="40" stroke={colors.mistFaint} strokeWidth={1} fill="none" />
      <Ellipse
        cx="54"
        cy="54"
        rx="40"
        ry="16"
        stroke={colors.brass}
        strokeWidth={1.4}
        fill="none"
        transform="rotate(-18 54 54)"
      />
      <Ellipse
        cx="54"
        cy="54"
        rx="40"
        ry="16"
        stroke={colors.brassDim}
        strokeWidth={1}
        fill="none"
        transform="rotate(42 54 54)"
      />
      <Circle cx="54" cy="54" r="4.5" fill={colors.brass} />
      <Circle cx="86" cy="30" r="1.6" fill={colors.mist} />
      <Circle cx="20" cy="72" r="1.6" fill={colors.mist} />
      <Circle cx="76" cy="84" r="1.2" fill={colors.mist} />
    </AnimatedSvg>
  );
}
