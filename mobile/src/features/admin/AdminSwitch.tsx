import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { adminTheme } from './admin-theme';

interface AdminSwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function AdminSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: AdminSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 42,
    height: 24,
    borderRadius: adminTheme.radius.pill,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: adminTheme.colors.accent,
  },
  trackOff: {
    backgroundColor: adminTheme.colors.borderStrong,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: adminTheme.radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(24, 24, 27, 0.08)',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
});
