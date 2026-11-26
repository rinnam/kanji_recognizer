import React, { memo, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

interface SmoothProgressBarProps {
  progress: Animated.Value;
  color: string;
  trackColor?: string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SmoothProgressBar = memo(function SmoothProgressBar({
  progress,
  color,
  trackColor = '#F4F2EF',
  height = 7,
  borderRadius = 5,
  style,
}: SmoothProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(280);

  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-trackWidth, 0],
        extrapolate: 'clamp',
      }),
    [progress, trackWidth],
  );

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 4 && Math.abs(w - trackWidth) > 1) {
          setTrackWidth(w);
        }
      }}
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          styles.fill,
          {
            backgroundColor: color,
            borderRadius,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' ? ({ willChange: 'transform' } as ViewStyle) : undefined),
  },
});
