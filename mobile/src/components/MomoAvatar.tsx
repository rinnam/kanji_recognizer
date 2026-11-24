import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';
import { nihongoTheme } from '../theme/nihongo-theme';

interface MomoAvatarProps {
  size?: number;
  badgeColor?: string;
}

export function MomoAvatar({ size = 40, badgeColor = nihongoTheme.colors.accentSoft }: MomoAvatarProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: badgeColor }]}>
      <Svg width={size * 0.82} height={size * 0.82} viewBox="0 0 64 64">
        <Circle cx="16" cy="18" r="9" fill="#D97236" />
        <Circle cx="48" cy="18" r="9" fill="#D97236" />
        <Circle cx="16" cy="18" r="4.5" fill="#FFF3E6" />
        <Circle cx="48" cy="18" r="4.5" fill="#FFF3E6" />
        <Ellipse cx="32" cy="34" rx="22" ry="19" fill="#E8843C" />
        <Ellipse cx="32" cy="39" rx="14" ry="11" fill="#FFF8F0" />
        <Circle cx="24" cy="31" r="3" fill="#1E1E1E" />
        <Circle cx="40" cy="31" r="3" fill="#1E1E1E" />
        <Circle cx="25" cy="30" r="1" fill="#FFFFFF" />
        <Circle cx="41" cy="30" r="1" fill="#FFFFFF" />
        <Ellipse cx="32" cy="36" rx="3" ry="2.2" fill="#2A1E17" />
        <Path d="M28 40 Q32 44 36 40" stroke="#2A1E17" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Path d="M16 49 Q32 56 48 49" stroke="#F6E5D0" strokeWidth="7" strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
